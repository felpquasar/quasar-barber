const Toast = ({ msg, type }) => msg ? (
  <div className="fade-in" style={{ position: "fixed", bottom: 24, right: 24, background: type === "error" ? "#3a1515" : "#1a2a1a", border: `1px solid ${type === "error" ? "#e05a5a" : "#4caf82"}`, color: type === "error" ? "#e05a5a" : "#4caf82", padding: "10px 18px", borderRadius: 8, zIndex: 2000, fontSize: ".88rem", boxShadow: "0 8px 24px rgba(0,0,0,.45)" }}>
    {msg}
  </div>
) : null;

export default Toast;
