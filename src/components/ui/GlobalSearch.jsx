import { useState, useRef, useEffect, useMemo } from "react";
import { fmt } from "../../lib/utils";
import Icon from "./Icon";

const SECTION = { fontSize: ".62rem", color: "#555", textTransform: "uppercase", letterSpacing: ".1em", padding: "8px 14px 4px" };
const ROW = { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 14px", border: "none", background: "transparent", cursor: "pointer", textAlign: "left", color: "#ccc", fontSize: ".85rem" };

const GlobalSearch = ({ produtos, clientes, vendas, onGo }) => {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const boxRef = useRef(null);

  useEffect(() => {
    const onKey = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); inputRef.current?.focus(); setOpen(true); }
      if (e.key === "Escape") { setQ(""); setOpen(false); inputRef.current?.blur(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onDown = e => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  const res = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return null;
    const ps = produtos.filter(p => p.nome?.toLowerCase().includes(t)).slice(0, 4);
    const cs = clientes.filter(c => c.nome?.toLowerCase().includes(t) || c.cidade?.toLowerCase().includes(t)).slice(0, 4);
    const vs = vendas.filter(v => clientes.find(x => x.id === v.cliente_id)?.nome?.toLowerCase().includes(t)).slice(0, 3);
    return { ps, cs, vs, total: ps.length + cs.length + vs.length };
  }, [q, produtos, clientes, vendas]);

  const go = aba => { onGo(aba); setQ(""); setOpen(false); inputRef.current?.blur(); };

  return (
    <div ref={boxRef} style={{ position: "relative", flex: 1, maxWidth: 440 }}>
      <div style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#444", pointerEvents: "none" }}>
        <Icon name="search" size={14} />
      </div>
      <input
        ref={inputRef}
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar produto, cliente, venda..."
        style={{ width: "100%", background: "#101010", border: "1px solid #222", borderRadius: 6, padding: "7px 64px 7px 32px", color: "#e0e0e0", fontSize: ".82rem", outline: "none", boxSizing: "border-box" }}
      />
      <kbd style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", fontSize: ".62rem", color: "#444", border: "1px solid #242424", borderRadius: 4, padding: "2px 6px", fontFamily: "'DM Mono',monospace", pointerEvents: "none" }}>Ctrl K</kbd>

      {open && res && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "#141414", border: "1px solid #242424", borderRadius: 8, boxShadow: "0 12px 32px rgba(0,0,0,.5)", overflow: "hidden", zIndex: 500, maxHeight: 380, overflowY: "auto" }}>
          {res.total === 0 && <div style={{ padding: "14px", color: "#555", fontSize: ".82rem" }}>Nada encontrado para "{q}"</div>}
          {res.ps.length > 0 && <>
            <div style={SECTION}>Produtos</div>
            {res.ps.map(p => (
              <button key={`p${p.id}`} style={ROW} onClick={() => go("estoque")}
                onMouseEnter={e => e.currentTarget.style.background = "#1a1a1a"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <span style={{ color: "#555", flexShrink: 0, display: "flex" }}><Icon name="box" size={14} /></span>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nome}</span>
                <span style={{ color: "#ffbf00", fontFamily: "'DM Mono',monospace", fontSize: ".78rem", flexShrink: 0 }}>{fmt(p.preco)}</span>
              </button>
            ))}
          </>}
          {res.cs.length > 0 && <>
            <div style={SECTION}>Clientes</div>
            {res.cs.map(c => (
              <button key={`c${c.id}`} style={ROW} onClick={() => go("clientes")}
                onMouseEnter={e => e.currentTarget.style.background = "#1a1a1a"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <span style={{ color: "#555", flexShrink: 0, display: "flex" }}><Icon name="users" size={14} /></span>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nome}</span>
                <span style={{ color: "#555", fontSize: ".75rem", flexShrink: 0 }}>{c.cidade || ""}</span>
              </button>
            ))}
          </>}
          {res.vs.length > 0 && <>
            <div style={SECTION}>Vendas</div>
            {res.vs.map(v => (
              <button key={`v${v.id}`} style={ROW} onClick={() => go("vendas")}
                onMouseEnter={e => e.currentTarget.style.background = "#1a1a1a"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <span style={{ color: "#555", flexShrink: 0, display: "flex" }}><Icon name="cart" size={14} /></span>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{clientes.find(x => x.id === v.cliente_id)?.nome ?? "Venda"} · {v.data}</span>
                <span style={{ color: "#ffbf00", fontFamily: "'DM Mono',monospace", fontSize: ".78rem", flexShrink: 0 }}>{fmt(v.total)}</span>
              </button>
            ))}
          </>}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
