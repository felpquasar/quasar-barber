const Field = ({ label, children }) => (
  <div style={{ marginBottom: "1rem" }}>
    <label style={{ display: "block", fontSize: ".75rem", color: "#888", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</label>
    {children}
  </div>
);

export default Field;
