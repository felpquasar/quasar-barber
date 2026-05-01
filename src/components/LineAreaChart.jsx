import { useState } from "react";
import { fmt } from "../lib/utils";

const LineAreaChart = ({ dados }) => {
  const [tooltip, setTooltip] = useState(null);
  const [hoverX, setHoverX] = useState(null);

  if (!dados || dados.length === 0) {
    return (
      <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: ".85rem" }}>
        Sem dados no período
      </div>
    );
  }

  const W = 800, H = 200;
  const padL = 64, padR = 20, padT = 24, padB = 36;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const maxVal = Math.max(...dados.map(d => d.valor), 1);
  const maxQtd = Math.max(...dados.map(d => d.qtd || 0), 1);

  const xPos = (i) => padL + (i / Math.max(dados.length - 1, 1)) * chartW;
  const yVal = (v) => padT + chartH - (v / maxVal) * chartH;
  const yQtd = (q) => padT + chartH - ((q || 0) / maxQtd) * chartH;

  const fatPoints = dados.map((d, i) => `${xPos(i)},${yVal(d.valor)}`).join(" ");
  const fatArea = [
    `M ${xPos(0)},${padT + chartH}`,
    ...dados.map((d, i) => `L ${xPos(i)},${yVal(d.valor)}`),
    `L ${xPos(dados.length - 1)},${padT + chartH}`,
    "Z"
  ].join(" ");
  const qtdPoints = dados.map((d, i) => `${xPos(i)},${yQtd(d.qtd || 0)}`).join(" ");
  const grades = [0, 0.25, 0.5, 0.75, 1];

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width) - padL;
    const idx = Math.round((mx / chartW) * (dados.length - 1));
    const clamped = Math.max(0, Math.min(dados.length - 1, idx));
    setTooltip(clamped); setHoverX(xPos(clamped));
  };
  const handleMouseLeave = () => { setTooltip(null); setHoverX(null); };
  const d = tooltip !== null ? dados[tooltip] : null;

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div style={{ display: "flex", gap: 20, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 24, height: 2, background: "linear-gradient(90deg,#c9a84c,#e8c97a)", borderRadius: 2 }} />
          <span style={{ fontSize: ".72rem", color: "#777", textTransform: "uppercase", letterSpacing: ".05em" }}>Faturamento</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 24, height: 2, background: "#4caf82", borderRadius: 2, opacity: .8 }} />
          <span style={{ fontSize: ".72rem", color: "#777", textTransform: "uppercase", letterSpacing: ".05em" }}>Nº de Vendas</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", overflow: "visible", cursor: "crosshair" }}
        onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
        <defs>
          <linearGradient id="fatGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#c9a84c" stopOpacity="0.02" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {grades.map((g, i) => {
          const y = padT + chartH - g * chartH;
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#1f1f1f" strokeWidth="1" strokeDasharray="4 4" />
              {g > 0 && (
                <text x={padL - 8} y={y + 4} textAnchor="end" fill="#444" fontSize="9" fontFamily="'DM Mono',monospace">
                  {fmt(maxVal * g).replace("R$ ", "").replace(",00", "")}
                </text>
              )}
            </g>
          );
        })}

        {dados.map((d, i) => {
          const step = dados.length > 15 ? Math.ceil(dados.length / 10) : 1;
          if (i % step !== 0 && i !== dados.length - 1) return null;
          return (
            <text key={i} x={xPos(i)} y={H - 4} textAnchor="middle" fill="#444" fontSize="9" fontFamily="'DM Mono',monospace">
              {d.label}
            </text>
          );
        })}

        <path d={fatArea} fill="url(#fatGrad)" />
        <polyline points={fatPoints} fill="none" stroke="#c9a84c" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" filter="url(#glow)" />
        <polyline points={qtdPoints} fill="none" stroke="#4caf82" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="5 3" opacity="0.75" />

        {hoverX !== null && (
          <line x1={hoverX} y1={padT} x2={hoverX} y2={padT + chartH} stroke="#333" strokeWidth="1" strokeDasharray="3 3" />
        )}
        {tooltip !== null && (
          <>
            <circle cx={xPos(tooltip)} cy={yVal(dados[tooltip].valor)} r="4" fill="#c9a84c" stroke="#1a1a1a" strokeWidth="2" />
            <circle cx={xPos(tooltip)} cy={yQtd(dados[tooltip].qtd || 0)} r="3.5" fill="#4caf82" stroke="#1a1a1a" strokeWidth="2" />
          </>
        )}
      </svg>

      {tooltip !== null && d && (() => {
        const px = xPos(tooltip);
        const pct = px / W;
        return (
          <div style={{
            position: "absolute", top: 32,
            left: pct > 0.7 ? "auto" : `calc(${(px / W) * 100}% + 12px)`,
            right: pct > 0.7 ? `calc(${(1 - px / W) * 100}% + 12px)` : "auto",
            background: "#1a1a1a", border: "1px solid #2e2e1e", borderRadius: 8,
            padding: "10px 14px", pointerEvents: "none", zIndex: 10, minWidth: 148,
          }}>
            <div style={{ fontSize: ".7rem", color: "#555", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{d.label}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#c9a84c", flexShrink: 0 }} />
              <span style={{ fontSize: ".85rem", color: "#c9a84c", fontFamily: "'DM Mono',monospace", fontWeight: 600 }}>{fmt(d.valor)}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4caf82", flexShrink: 0 }} />
              <span style={{ fontSize: ".82rem", color: "#4caf82", fontFamily: "'DM Mono',monospace" }}>{d.qtd || 0} venda{(d.qtd || 0) !== 1 ? "s" : ""}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default LineAreaChart;
