import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import useStore from "./hooks/useStore";
import { today } from "./lib/utils";
import Login from "./components/Login";
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
  button:not(:disabled){transition:opacity .12s,filter .12s;}
  button:not(:disabled):hover{opacity:.82;}
  button:not(:disabled):active{opacity:.65;}
  table tbody tr{transition:background .1s;}
  table tbody tr:hover{background:rgba(255,191,0,0.045)!important;}
  .fade-in{animation:fadeIn .18s ease both;}
  @keyframes shimmer{from{background-position:-500px 0}to{background-position:500px 0}}
  .skeleton{background:linear-gradient(90deg,#161616 25%,#1e1e1e 50%,#161616 75%);background-size:500px 100%;animation:shimmer 1.6s infinite linear;}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
`;

export default function App() {
  const [session, setSession] = useState(undefined);
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

  const handleLogout = async () => { await supabase.auth.signOut(); setSession(null); };

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
      <div style={{ minHeight: "100vh", background: "#080806", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, color: "#444" }}>
        <Spinner size={28} /><span style={{ fontSize: ".85rem" }}>Carregando...</span>
      </div>
    </>
  );

  if (!session) return (
    <><style>{styles.replace("background:#0e0e0e", "background:#080806")}</style>
      <Login onLogin={(s) => setSession(s)} />
    </>
  );

  return (
    <>
      <style>{styles}</style>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <div style={{ display: "flex", minHeight: "100vh", background: "#0e0e0e" }}>
        <aside style={{ width: sidebar ? 220 : 64, flexShrink: 0, background: "#111", borderRight: "1px solid #1a1a1a", display: isMobile ? "none" : "flex", flexDirection: "column", transition: "width .2s" }}>
          <div style={{ padding: "1.5rem 1.25rem", borderBottom: "1px solid #1f1f1f", display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
            <img src={LOGO} alt="logo" style={{ width: 34, height: 34, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
            <div style={{ overflow: "hidden", maxWidth: sidebar ? 200 : 0, opacity: sidebar ? 1 : 0, transition: "max-width .2s, opacity .15s", whiteSpace: "nowrap" }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: ".95rem", color: "#c9a84c", lineHeight: 1.2 }}>Quasar Barber</div>
              <div style={{ fontSize: ".65rem", color: "#444", textTransform: "uppercase", letterSpacing: ".08em" }}>Gestão</div>
            </div>
          </div>
          <nav style={{ flex: 1, padding: ".75rem .5rem" }}>
            {nav.map(n => (
              <button key={n.id} onClick={() => setAba(n.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 12px", paddingLeft: 10, borderRadius: 8, border: "none", borderLeft: `2px solid ${aba === n.id ? "#ffbf00" : "transparent"}`, cursor: "pointer", background: aba === n.id ? "#1f1f12" : "transparent", color: aba === n.id ? "#c9a84c" : "#666", marginBottom: 2, textAlign: "left", transition: "all .15s" }}>
                <span style={{ position: "relative", flexShrink: 0 }}>
                  <Icon name={n.icon} size={18} />
                  {n.badge > 0 && (
                    <span style={{ position: "absolute", top: -3, right: -3, width: 7, height: 7, background: "#e05a5a", borderRadius: "50%", border: "1px solid #111", opacity: sidebar ? 0 : 1, transition: "opacity .15s" }} />
                  )}
                </span>
                <span style={{ flex: 1, overflow: "hidden", maxWidth: sidebar ? 130 : 0, opacity: sidebar ? 1 : 0, transition: "max-width .2s, opacity .15s", whiteSpace: "nowrap" }}>
                  {n.label}
                </span>
                {n.badge > 0 && (
                  <span style={{ background: "#e05a5a", color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: ".65rem", fontWeight: 700, minWidth: 18, textAlign: "center", overflow: "hidden", maxWidth: sidebar ? 30 : 0, opacity: sidebar ? 1 : 0, transition: "max-width .2s, opacity .15s" }}>
                    {n.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <div style={{ borderTop: "1px solid #1f1f1f", padding: ".75rem .5rem" }}>
            <div style={{ overflow: "hidden", maxHeight: sidebar ? 48 : 0, opacity: sidebar ? 1 : 0, transition: "max-height .2s, opacity .15s", padding: "0 12px", marginBottom: sidebar ? 4 : 0 }}>
              <div style={{ fontSize: ".65rem", color: "#444", textTransform: "uppercase", letterSpacing: ".05em" }}>Usuário</div>
              <div style={{ fontSize: ".78rem", color: "#666", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{session.user?.email}</div>
            </div>
            <button onClick={handleLogout}
              style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: "transparent", color: "#555", textAlign: "left" }}>
              <span style={{ flexShrink: 0 }}><Icon name="logout" size={17} /></span>
              <span style={{ overflow: "hidden", maxWidth: sidebar ? 60 : 0, opacity: sidebar ? 1 : 0, transition: "max-width .2s, opacity .15s", whiteSpace: "nowrap" }}>Sair</span>
            </button>
          </div>
          <button onClick={() => setSidebar(p => !p)} title={sidebar ? "Recolher menu" : "Expandir menu"}
            style={{ margin: "0 .5rem .75rem", padding: "8px 10px", borderRadius: 8, border: "1px solid #1f1f1f", background: "transparent", color: "#444", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: ".75rem" }}>
            <span style={{ display: "inline-flex", transform: sidebar ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
              <Icon name="chevron" size={14} />
            </span>
            <span style={{ overflow: "hidden", maxWidth: sidebar ? 80 : 0, opacity: sidebar ? 1 : 0, transition: "max-width .2s, opacity .15s", whiteSpace: "nowrap" }}>Recolher</span>
          </button>
        </aside>
        <main style={{ flex: 1, padding: isMobile ? "1rem" : "2rem", paddingBottom: isMobile ? "74px" : "2rem", overflowY: "auto", maxHeight: "100vh" }}>
          {loading
            ? <SkeletonDashboard />
            : <div key={aba} className="fade-in">
              {aba === "dashboard" && <Dashboard produtos={produtos} clientes={clientes} vendas={vendas} movimentos={movimentos} contasReceber={contasReceber} contasPagar={contasPagar} despesas={despesas} reload={load} />}
              {aba === "estoque" && <Estoque produtos={produtos} setProdutos={setProdutos} setMovimentos={setMovimentos} fornecedores={fornecedores} setContasPagar={setContasPagar} pedidosCompra={pedidosCompra} setPedidosCompra={setPedidosCompra} notify={notify} />}
              {aba === "clientes" && <Clientes clientes={clientes} setClientes={setClientes} vendas={vendas} produtos={produtos} contasReceber={contasReceber} notify={notify} />}
              {aba === "vendas" && <Vendas vendas={vendas} setVendas={setVendas} clientes={clientes} produtos={produtos} setProdutos={setProdutos} setMovimentos={setMovimentos} setContasReceber={setContasReceber} notify={notify} />}
              {aba === "financeiro" && <Financeiro contasReceber={contasReceber} setContasReceber={setContasReceber} contasPagar={contasPagar} setContasPagar={setContasPagar} fornecedores={fornecedores} setFornecedores={setFornecedores} clientes={clientes} vendas={vendas} despesas={despesas} setDespesas={setDespesas} notify={notify} />}
              {aba === "relatorios" && <Relatorios vendas={vendas} clientes={clientes} produtos={produtos} contasReceber={contasReceber} contasPagar={contasPagar} />}
            </div>
          }
        </main>
      </div>
      {isMobile && (
        <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#111", borderTop: "1px solid #1a1a1a", display: "flex", zIndex: 100, height: 58 }}>
          {nav.map(n => (
            <button key={n.id} onClick={() => setAba(n.id)}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", cursor: "pointer", color: aba === n.id ? "#c9a84c" : "#444", gap: 3, padding: "6px 0" }}>
              <span style={{ position: "relative" }}>
                <Icon name={n.icon} size={19} />
                {n.badge > 0 && (
                  <span style={{ position: "absolute", top: -3, right: -3, width: 7, height: 7, background: "#e05a5a", borderRadius: "50%", border: "1px solid #111" }} />
                )}
              </span>
              <span style={{ fontSize: ".63rem", textTransform: "uppercase", letterSpacing: ".03em", lineHeight: 1 }}>{n.label}</span>
            </button>
          ))}
        </nav>
      )}
    </>
  );
}
