import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import useStore from "./hooks/useStore";
import { today } from "./lib/utils";
import Login from "./components/Login";
import SetupTenant from "./components/SetupTenant";
import Dashboard from "./components/Dashboard";
import Estoque from "./components/Estoque";
import Clientes from "./components/Clientes";
import Vendas from "./components/Vendas";
import Financeiro from "./components/Financeiro";
import Relatorios from "./components/Relatorios";
import Toast from "./components/ui/Toast";
import Spinner from "./components/ui/Spinner";
import { SkeletonDashboard } from "./components/ui/Skeleton";
import Icon from "./components/ui/Icon";
import GlobalSearch from "./components/ui/GlobalSearch";
import { useMobile } from "./hooks/useMobile";

const LOGO = "/logo.png";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}
  body{background:#0e0e0e;color:#e0e0e0;font-family:'DM Sans',sans-serif;}
  ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#333;border-radius:3px}
  input,select,button{font-family:'DM Sans',sans-serif;}
  input,select{transition:border-color .15s;}
  input:focus,select:focus{border-color:#ffbf00!important;outline:none;}
  button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid #ffbf00;outline-offset:2px;}
  button:not(:disabled){transition:opacity .12s,filter .12s;}
  button:not(:disabled):hover{opacity:.82;}
  button:not(:disabled):active{opacity:.65;}
  table tbody tr{transition:background .1s;}
  table tbody tr:hover{background:rgba(255,191,0,0.045)!important;}
  .fade-in{animation:fadeIn .18s ease both;}
  @keyframes shimmer{from{background-position:-500px 0}to{background-position:500px 0}}
  .skeleton{background:linear-gradient(90deg,#161616 25%,#1e1e1e 50%,#161616 75%);background-size:500px 100%;animation:shimmer 1.6s infinite linear;}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
`;

export default function App() {
  const [session, setSession] = useState(undefined);
  const [tenantId, setTenantId] = useState(undefined); // undefined=checando, null=sem loja, uuid=ok
  const [aba, setAba] = useState("dashboard");
  const [sidebar, setSidebar] = useState(true);
  const { produtos, setProdutos, clientes, setClientes, vendas, setVendas, movimentos, setMovimentos, contasReceber, setContasReceber, contasPagar, setContasPagar, fornecedores, setFornecedores, pedidosCompra, setPedidosCompra, despesas, setDespesas, loading, toast, notify, load } = useStore();

  const isMobile = useMobile();

  const qtdVencidas = contasReceber.filter(cr => cr.status !== "pago" && cr.data_vencimento < today()).length
    + contasPagar.filter(cp => cp.status !== "pago" && cp.data_vencimento < today()).length;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session ?? null); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => { setSession(session ?? null); });
    return () => subscription.unsubscribe();
  }, []);

  // Verifica se o usuário logado já tem uma barbearia (tenant) vinculada.
  useEffect(() => {
    if (!session) { setTenantId(undefined); return; }
    let ativo = true;
    supabase.rpc("current_tenant_id").then(({ data }) => { if (ativo) setTenantId(data ?? null); });
    return () => { ativo = false; };
  }, [session]);

  const handleLogout = async () => { await supabase.auth.signOut(); setSession(null); setTenantId(undefined); };

  const handleTenantReady = (id) => { setTenantId(id); load(); };

  const nav = [
    { id: "dashboard", label: "Dashboard", icon: "dashboard" },
    { id: "estoque", label: "Estoque", icon: "box" },
    { id: "clientes", label: "Clientes", icon: "users" },
    { id: "vendas", label: "Vendas", icon: "cart" },
    { id: "financeiro", label: "Financeiro", icon: "money", badge: qtdVencidas },
    { id: "relatorios", label: "Relatórios", icon: "chart" },
  ];

  if (session === undefined) return (
    <><style>{styles}</style>
      <div style={{ minHeight: "100dvh", background: "#080806", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, color: "#444" }}>
        <Spinner size={28} /><span style={{ fontSize: ".85rem" }}>Carregando...</span>
      </div>
    </>
  );

  if (!session) return (
    <><style>{styles.replace("background:#0e0e0e", "background:#080806")}</style>
      <Login onLogin={(s) => setSession(s)} />
    </>
  );

  if (tenantId === undefined) return (
    <><style>{styles}</style>
      <div style={{ minHeight: "100dvh", background: "#080806", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, color: "#444" }}>
        <Spinner size={28} /><span style={{ fontSize: ".85rem" }}>Carregando...</span>
      </div>
    </>
  );

  if (tenantId === null) return (
    <><style>{styles.replace("background:#0e0e0e", "background:#080806")}</style>
      <SetupTenant email={session.user?.email} onReady={handleTenantReady} onLogout={handleLogout} />
    </>
  );

  return (
    <>
      <style>{styles}</style>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: "#0e0e0e" }}>
        <header style={{ height: 52, flexShrink: 0, background: "#0b0b0b", borderBottom: "1px solid #1c1c1c", display: "flex", alignItems: "center", gap: 16, padding: "0 1rem", position: "sticky", top: 0, zIndex: 200 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, flexShrink: 0, minWidth: isMobile ? "auto" : 204 }}>
            <img src={LOGO} alt="logo" style={{ width: 26, height: 26, borderRadius: 6, objectFit: "cover" }} />
            <span style={{ fontFamily: "'Playfair Display',serif", fontSize: ".95rem", color: "#c9a84c", whiteSpace: "nowrap" }}>Quasar Gestão</span>
          </div>
          {!isMobile && <GlobalSearch produtos={produtos} clientes={clientes} vendas={vendas} onGo={setAba} />}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            {!isMobile && <span style={{ fontSize: ".75rem", color: "#555", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.user?.email}</span>}
            <button onClick={handleLogout} title="Sair"
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 6, border: "1px solid #222", background: "transparent", color: "#666", cursor: "pointer", fontSize: ".75rem" }}>
              <Icon name="logout" size={14} />{!isMobile && "Sair"}
            </button>
          </div>
        </header>
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <aside style={{ width: sidebar ? 220 : 64, flexShrink: 0, background: "#111", borderRight: "1px solid #1a1a1a", display: isMobile ? "none" : "flex", flexDirection: "column", transition: "width .2s" }}>
          <nav style={{ flex: 1, padding: ".75rem .5rem" }}>
            {nav.map(n => (
              <button key={n.id} onClick={() => setAba(n.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "8px 10px", borderRadius: 6, border: "none", cursor: "pointer", background: "transparent", color: aba === n.id ? "#e0d6b8" : "#383530", fontWeight: aba === n.id ? 500 : 400, marginBottom: 1, textAlign: "left", transition: "color .12s" }}>
                <span style={{ position: "relative", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 6, background: aba === n.id ? "rgba(255,191,0,.1)" : "transparent", color: aba === n.id ? "#ffbf00" : "inherit", transition: "background .12s, color .12s" }}>
                  <Icon name={n.icon} size={17} />
                  {n.badge > 0 && (
                    <span style={{ position: "absolute", top: -1, right: -1, width: 7, height: 7, background: "#e05a5a", borderRadius: "50%", border: "1px solid #111", opacity: sidebar ? 0 : 1, transition: "opacity .15s" }} />
                  )}
                </span>
                <span style={{ flex: 1, overflow: "hidden", maxWidth: sidebar ? 130 : 0, opacity: sidebar ? 1 : 0, transition: "max-width .2s, opacity .15s", whiteSpace: "nowrap" }}>
                  {n.label}
                </span>
                {n.badge > 0 && (
                  <span style={{ background: "#e05a5a", color: "#fff", borderRadius: 6, padding: "1px 6px", fontSize: ".65rem", fontWeight: 700, minWidth: 18, textAlign: "center", overflow: "hidden", maxWidth: sidebar ? 30 : 0, opacity: sidebar ? 1 : 0, transition: "max-width .2s, opacity .15s" }}>
                    {n.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <button onClick={() => setSidebar(p => !p)} title={sidebar ? "Recolher menu" : "Expandir menu"}
            style={{ margin: ".75rem .5rem", padding: "8px 10px", borderRadius: 8, border: "1px solid #1f1f1f", background: "transparent", color: "#444", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: ".75rem" }}>
            <span style={{ display: "inline-flex", transform: sidebar ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
              <Icon name="chevron" size={14} />
            </span>
            <span style={{ overflow: "hidden", maxWidth: sidebar ? 80 : 0, opacity: sidebar ? 1 : 0, transition: "max-width .2s, opacity .15s", whiteSpace: "nowrap" }}>Recolher</span>
          </button>
        </aside>
        <main style={{ flex: 1, padding: isMobile ? "1rem" : "2rem", paddingBottom: isMobile ? "80px" : "2rem", overflowY: "auto", maxHeight: "calc(100dvh - 52px)" }}>
          {loading
            ? <SkeletonDashboard />
            : <div key={aba} className="fade-in">
              {aba === "dashboard" && <Dashboard produtos={produtos} clientes={clientes} vendas={vendas} movimentos={movimentos} contasReceber={contasReceber} contasPagar={contasPagar} despesas={despesas} reload={load} onNavigate={setAba} />}
              {aba === "estoque" && <Estoque produtos={produtos} setProdutos={setProdutos} setMovimentos={setMovimentos} fornecedores={fornecedores} setContasPagar={setContasPagar} pedidosCompra={pedidosCompra} setPedidosCompra={setPedidosCompra} setDespesas={setDespesas} notify={notify} />}
              {aba === "clientes" && <Clientes clientes={clientes} setClientes={setClientes} vendas={vendas} produtos={produtos} contasReceber={contasReceber} notify={notify} />}
              {aba === "vendas" && <Vendas vendas={vendas} setVendas={setVendas} clientes={clientes} produtos={produtos} setProdutos={setProdutos} setMovimentos={setMovimentos} setContasReceber={setContasReceber} notify={notify} />}
              {aba === "financeiro" && <Financeiro contasReceber={contasReceber} setContasReceber={setContasReceber} contasPagar={contasPagar} setContasPagar={setContasPagar} fornecedores={fornecedores} setFornecedores={setFornecedores} clientes={clientes} vendas={vendas} despesas={despesas} setDespesas={setDespesas} notify={notify} />}
              {aba === "relatorios" && <Relatorios vendas={vendas} clientes={clientes} produtos={produtos} contasReceber={contasReceber} contasPagar={contasPagar} />}
            </div>
          }
        </main>
      </div>
      </div>
      {isMobile && (
        <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#111", borderTop: "1px solid #1a1a1a", display: "flex", zIndex: 100, height: 64 }}>
          {nav.map(n => (
            <button key={n.id} onClick={() => setAba(n.id)}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", cursor: "pointer", color: aba === n.id ? "#ffbf00" : "#383530", gap: 4, padding: "10px 0" }}>
              <span style={{ position: "relative" }}>
                <Icon name={n.icon} size={20} />
                {n.badge > 0 && (
                  <span style={{ position: "absolute", top: -3, right: -3, width: 7, height: 7, background: "#e05a5a", borderRadius: "50%", border: "1px solid #111" }} />
                )}
              </span>
              <span style={{ fontSize: ".56rem", textTransform: "uppercase", letterSpacing: 0, lineHeight: 1, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "0 2px" }}>{n.label}</span>
            </button>
          ))}
        </nav>
      )}
    </>
  );
}

