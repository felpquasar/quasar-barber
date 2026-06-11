import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useMobile } from "../../hooks/useMobile";
import Icon from "./Icon";

const Modal = ({ title, onClose, children, wide = false }) => {
  const isMobile = useMobile();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: isMobile ? ".75rem" : "1rem" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#1a1a1a", border: "1px solid #272727", borderRadius: 8, width: "100%", maxWidth: wide ? 620 : 480, maxHeight: isMobile ? "92dvh" : "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem 1.5rem", borderBottom: "1px solid #222", position: "sticky", top: 0, background: "#1a1a1a", zIndex: 1 }}>
          <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.1rem", color: "#c9a84c" }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#666", cursor: "pointer" }}><Icon name="x" size={18} /></button>
        </div>
        <div style={{ padding: isMobile ? "1rem" : "1.5rem" }}>{children}</div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
