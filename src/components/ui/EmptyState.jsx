import Icon from './Icon';

const EmptyState = ({ iconName = "box", title = "Nenhum resultado", subtitle }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2.5rem 1rem", gap: 10, userSelect: "none" }}>
    <div style={{ color: "#252525" }}><Icon name={iconName} size={40} /></div>
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: ".88rem", color: "#444", fontWeight: 500 }}>{title}</div>
      {subtitle && <div style={{ fontSize: ".75rem", color: "#303030", marginTop: 4 }}>{subtitle}</div>}
    </div>
  </div>
);

export default EmptyState;
