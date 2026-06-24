import { useState } from "react";
import { supabase } from "../lib/supabase";
import { inp, btn } from "../styles/shared";
import Icon from "./ui/Icon";
import Spinner from "./ui/Spinner";

const LOGO = "/logo.png";

// Gate pós-login: usuário autenticado mas sem barbearia (tenant) vinculada.
// Cria o tenant via RPC e segue para o app.
const SetupTenant = ({ email, onReady, onLogout }) => {
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const criar = async (e) => {
    e?.preventDefault();
    if (!nome.trim()) { setErro("Informe o nome da barbearia."); return; }
    setLoading(true); setErro("");
    const { data, error } = await supabase.rpc("create_tenant", { nome_barbearia: nome.trim() });
    setLoading(false);
    if (error) { setErro(error.message || "Não foi possível criar a barbearia."); return; }
    onReady(data); // tenant_id
  };

  return (
    <div style={{ minHeight: "100dvh", background: "#080806", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <img src={LOGO} alt="logo" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", display: "block", margin: "0 auto 1.25rem" }} />
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.6rem", color: "#c9a84c", lineHeight: 1.1 }}>Bem-vindo à Quasar</div>
          <div style={{ fontSize: ".85rem", color: "#777", marginTop: 8 }}>Vamos criar a sua barbearia para começar.</div>
        </div>
        <form onSubmit={criar} style={{ borderTop: "1px solid #1a1915", paddingTop: "1.75rem" }}>
          <label style={{ display: "block", fontSize: ".72rem", color: "#666", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>Nome da barbearia</label>
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Barbearia do Zé" autoFocus
            style={{ ...inp, background: "#0a0a08", border: "1px solid #252520", marginBottom: "1.25rem" }} />
          {erro && (
            <div style={{ background: "#2a0d0d", border: "1px solid #5a1e1e", borderRadius: 8, padding: "10px 14px", marginBottom: "1rem", color: "#e05a5a", fontSize: ".83rem", display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="warn" size={15} /> {erro}
            </div>
          )}
          <button type="submit" disabled={loading}
            style={{ ...btn("primary"), width: "100%", justifyContent: "center", padding: "11px", fontSize: ".95rem" }}>
            {loading ? <><Spinner size={15} color="#0a0a08" /> Criando...</> : "Criar e entrar"}
          </button>
        </form>
        <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: ".75rem", color: "#555" }}>
          {email} · <button type="button" onClick={onLogout} style={{ background: "none", border: "none", color: "#777", cursor: "pointer", fontSize: ".75rem", padding: 0, textDecoration: "underline" }}>sair</button>
        </div>
      </div>
    </div>
  );
};

export default SetupTenant;
