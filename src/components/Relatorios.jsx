import { useState } from 'react';
import RelatorioDRE from './RelatorioDRE';
import RelatorioVendas from './RelatorioVendas';
import RelatorioInadimplencia from './RelatorioInadimplencia';
import RelatorioMargem from './RelatorioMargem';

const Relatorios = ({ vendas, clientes, produtos, contasReceber, contasPagar }) => {
  const [aba, setAba] = useState("dre");

  const tabs = [
    { id: "dre", label: "DRE" },
    { id: "vendas", label: "Análise de Vendas" },
    { id: "inadimplencia", label: "Inadimplência" },
    { id: "margem", label: "Margem por Produto" },
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 0, marginBottom: "1.75rem", borderBottom: "1px solid #1f1f1f" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setAba(t.id)}
            style={{ padding: "8px 20px 11px", border: "none", borderBottom: `2px solid ${aba === t.id ? "#ffbf00" : "transparent"}`, background: "transparent", cursor: "pointer", color: aba === t.id ? "#c9a84c" : "#555", fontSize: ".92rem", fontWeight: aba === t.id ? 600 : 400, transition: "all .15s", marginBottom: -1 }}>
            {t.label}
          </button>
        ))}
      </div>

      {aba === "dre" && <RelatorioDRE contasReceber={contasReceber} contasPagar={contasPagar} />}
      {aba === "vendas" && <RelatorioVendas vendas={vendas} clientes={clientes} produtos={produtos} />}
      {aba === "inadimplencia" && <RelatorioInadimplencia contasReceber={contasReceber} clientes={clientes} />}
      {aba === "margem" && <RelatorioMargem vendas={vendas} produtos={produtos} />}
    </div>
  );
};

export default Relatorios;
