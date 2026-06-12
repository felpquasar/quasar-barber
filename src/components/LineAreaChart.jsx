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

  const W = 800, H = 210;
  const padL = 56, padR = 78, padT = 18, padB = 30;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const maxVal = Math.max(...dados.map(d => d.valor), 1) * 1.12;

  const xPos = (i) => padL + (i / Math.max(dados.length - 1, 1)) * chartW;
  const yVal = (v) => padT + chartH - (v / maxVal) * chartH;

  const pts = dados.map((d, i) => [xPos(i), yVal(d.valor)]);

  const smoothPath = (p) => {
    if (p.length < 2) return "";
    let path = `M ${p[0][0]},${p[0][1]}`;
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[Math.max(0, i - 1)], p1 = p[i], p2 = p[i + 1], p3 = p[Math.min(p.length - 1, i + 2)];
      path += ` C ${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
    }
    return path;
  };

  const line = smoothPath(pts);
  const area = pts.length >= 2
    ? `${line} L ${pts[pts.length - 1][0]},${padT + chartH} L ${pts[0][0]},${padT + chartH} Z`
    : "";

  const last = pts[pts.length - 1];
  const lastValor = dados[dados.length - 1].valor;
  const chipText = fmt(lastValor);
  const chipW = Math.max(56, chipText.length * 6.6 + 14);
  const chipFits = last[0] + 12 + chipW < W;

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
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", overflow: "visible", cursor: "crosshair" }}
        onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
        <defs>
          <linearGradient id="fatGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffbf00" stopOpacity="0.32" />
            <stop offset="55%" stopColor="#ffbf00" stopOpacity="0.07" />
            <stop offset="100%" stopColor="#ffbf00" stopOpacity="0" />
          </linearGradient>
          <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {[0, 0.5, 1].map((g, i) => {
          const y = padT + chartH - g * chartH;
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#1d1d1d" strokeWidth="1" opacity=".6" />
              {g > 0 && (
                <text x={padL - 10} y={y + 3} textAnchor="end" fill="#3d3d3d" fontSize="9.5" fontFamily="'DM Mono',monospace">
                  {fmt(maxVal * g).replace(",00", "")}
                </text>
              )}
            </g>
          );
        })}

        {dados.map((dd, i) => {
          const step = dados.length > 15 ? Math.ceil(dados.length / 10) : 1;
          if (i % step !== 0 && i !== dados.length - 1) return null;
          return (
            <text key={i} x={xPos(i)} y={H - 6} textAnchor="middle" fill="#4a4a4a" fontSize="10" fontFamily="'DM Mono',monospace">
              {dd.label}
            </text>
          );
        })}

        {area && <path d={area} fill="url(#fatGrad)" />}
        {pts.length >= 2 && <path d={line} fill="none" stroke="#ffbf00" strokeWidth="2.5" strokeLinecap="round" filter="url(#glow)" />}

        <circle cx={last[0]} cy={last[1]} r="9" fill="#ffbf00" opacity=".15">
          <animate attributeName="r" values="6;11;6" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values=".25;.05;.25" dur="2.4s" repeatCount="indefinite" />
        </circle>
        <circle cx={last[0]} cy={last[1]} r="4" fill="#ffbf00" stroke="#141414" strokeWidth="2" />
        {tooltip === null && (
          <g transform={`translate(${chipFits ? last[0] + 12 : last[0] - chipW - 12},${last[1] - 10})`}>
            <rect x="0" y="-12" rx="6" width={chipW} height="22" fill="#1f1a06" stroke="#3a3008" />
            <text x={chipW / 2} y="3" textAnchor="middle" fill="#ffbf00" fontSize="10.5" fontWeight="600" fontFamily="'DM Mono',monospace">{chipText}</text>
          </g>
        )}

        {hoverX !== null && (
          <line x1={hoverX} y1={padT} x2={hoverX} y2={padT + chartH} stroke="#333" strokeWidth="1" strokeDasharray="3 3" />
        )}
        {tooltip !== null && (
          <circle cx={xPos(tooltip)} cy={yVal(dados[tooltip].valor)} r="4.5" fill="#ffbf00" stroke="#141414" strokeWidth="2" />
        )}
      </svg>

      {tooltip !== null && d && (() => {
        const px = xPos(tooltip);
        const pct = px / W;
        return (
          <div style={{
            position: "absolute", top: 24,
            left: pct > 0.7 ? "auto" : `calc(${(px / W) * 100}% + 12px)`,
            right: pct > 0.7 ? `calc(${(1 - px / W) * 100}% + 12px)` : "auto",
            background: "#1a1a1a", border: "1px solid #2e2e1e", borderRadius: 8,
            padding: "10px 14px", pointerEvents: "none", zIndex: 10, minWidth: 148,
          }}>
            <div style={{ fontSize: ".7rem", color: "#555", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{d.label}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: "#ffbf00", flexShrink: 0 }} />
              <span style={{ fontSize: ".85rem", color: "#ffbf00", fontFamily: "'DM Mono',monospace", fontWeight: 600 }}>{fmt(d.valor)}</span>
            </div>
            <div style={{ fontSize: ".74rem", color: "#888" }}>{d.qtd || 0} venda{(d.qtd || 0) !== 1 ? "s" : ""}</div>
          </div>
        );
      })()}
    </div>
  );
};

export default LineAreaChart;
