import { createPortal } from "react-dom";

const Confirm = ({ msg, onConfirm, onCancel, danger = true }) => {
  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: "1rem" }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{ background: "#161616", border: "1px solid #272727", borderRadius: 8, padding: "1.75rem 2rem", width: "100%", maxWidth: 360 }}>
        <div style={{ fontSize: ".92rem", color: "#d0c8b0", marginBottom: "1.5rem", lineHeight: 1.6 }}>{msg}</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel}
            style={{ padding: "9px 18px", borderRadius: 6, border: "1px solid #2a2a2a", background: "transparent", color: "#555", cursor: "pointer", fontSize: ".85rem" }}>
            Cancelar
          </button>
          <button onClick={onConfirm}
            style={{ padding: "9px 18px", borderRadius: 6, border: "none", background: danger ? "#2a0d0d" : "#0d1f14", color: danger ? "#e05a5a" : "#4caf82", cursor: "pointer", fontSize: ".85rem", fontWeight: 600 }}>
            {danger ? "Excluir" : "Confirmar"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Confirm;
