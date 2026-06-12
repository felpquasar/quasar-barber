import { useState } from "react";
import { supabase } from "../lib/supabase";
import { inp } from "../styles/shared";
import Icon from "./ui/Icon";
import Spinner from "./ui/Spinner";

const LOGO = "/logo.png";

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!email || !senha) { setErro("Preencha email e senha."); return; }
    setLoading(true); setErro("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setLoading(false);
    if (error) { setErro("Email ou senha incorretos."); return; }
    onLogin(data.session);
  };

  return (
    <div style={{ minHeight: "100dvh", background: "#080806", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <img src={LOGO} alt="logo" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", display: "block", margin: "0 auto 1.5rem" }} />
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "2.2rem", letterSpacing: "-.01em", color: "#c9a84c", lineHeight: 1 }}>Quasar Barber</div>
          <div style={{ fontSize: ".75rem", color: "#444", textTransform: "uppercase", letterSpacing: ".12em", marginTop: 4 }}>Sistema de Gestão</div>
        </div>
        <form onSubmit={handleLogin} style={{ borderTop: "1px solid #1a1915", paddingTop: "2rem", marginTop: ".75rem" }}>
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontSize: ".72rem", color: "#666", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>Email</label>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#444" }}><Icon name="mail" size={15} /></div>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com"
                style={{ ...inp, paddingLeft: 34, background: "#0a0a08", border: "1px solid #252520" }} />
            </div>
          </div>
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: ".72rem", color: "#666", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>Senha</label>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#444" }}><Icon name="lock" size={15} /></div>
              <input type={mostrar ? "text" : "password"} value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••"
                style={{ ...inp, paddingLeft: 34, paddingRight: 38, background: "#0a0a08", border: "1px solid #252520" }} />
              <button type="button" onClick={() => setMostrar(p => !p)}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#444", cursor: "pointer" }}>
                <Icon name={mostrar ? "eyeoff" : "eye"} size={15} />
              </button>
            </div>
          </div>
          {erro && (
            <div style={{ background: "#2a0d0d", border: "1px solid #5a1e1e", borderRadius: 8, padding: "10px 14px", marginBottom: "1rem", color: "#e05a5a", fontSize: ".83rem", display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="warn" size={15} /> {erro}
            </div>
          )}
          <button type="submit" disabled={loading}
            style={{ width: "100%", padding: "11px", borderRadius: 8, border: "none", cursor: loading ? "not-allowed" : "pointer", background: "#ffbf00", color: "#0a0a08", fontWeight: 700, fontSize: ".95rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {loading ? <><Spinner size={15} color="#0a0a08" /> Entrando...</> : "Entrar"}
          </button>
        </form>
        <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: ".75rem", color: "#2a2a2a" }}>
          Acesso restrito · fale com o administrador
        </div>
      </div>
    </div>
  );
};

export default Login;
