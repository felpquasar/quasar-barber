const Spinner = ({ size = 16, color = "#ffbf00" }) => (
  <div style={{ display: "inline-block", width: size, height: size, border: `2px solid ${color}33`, borderTop: `2px solid ${color}`, borderRadius: "50%", animation: "spin .7s linear infinite" }} />
);

export default Spinner;
