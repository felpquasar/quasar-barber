import { useState } from 'react';
import { today } from '../lib/utils';
import ContasReceber from './ContasReceber';
import ContasPagar from './ContasPagar';
import Fornecedores from './Fornecedores';
import FluxoCaixa from './FluxoCaixa';

const Financeiro = ({ contasReceber, setContasReceber, contasPagar, setContasPagar, fornecedores, setFornecedores, clientes, notify }) => {
  const [aba, setAba] = useState("receber");

  const qtdReceberVencidas = contasReceber.filter(cr => cr.status !== "pago" && cr.data_vencimento < today()).length;
  const qtdPagarVencidas = contasPagar.filter(cp => cp.status !== "pago" && cp.data_vencimento < today()).length;

  const tabs = [
    { id: "receber", label: "A Receber", badge: qtdReceberVencidas },
    { id: "pagar", label: "A Pagar", badge: qtdPagarVencidas },
    { id: "fornecedores", label: "Fornecedores" },
    { id: "fluxo", label: "Fluxo de Caixa" },
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 0, marginBottom: "1.75rem", borderBottom: "1px solid #1f1f1f", overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setAba(t.id)}
            style={{ padding: "8px 16px 11px", border: "none", borderBottom: `2px solid ${aba === t.id ? "#c9a84c" : "transparent"}`, background: "transparent", cursor: "pointer", color: aba === t.id ? "#e8c97a" : "#555", fontSize: ".88rem", fontWeight: aba === t.id ? 600 : 400, display: "inline-flex", alignItems: "center", gap: 7, transition: "all .15s", marginBottom: -1, whiteSpace: "nowrap", flexShrink: 0 }}>
            {t.label}
            {t.badge > 0 && (
              <span style={{ background: "#e05a5a", color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: ".65rem", fontWeight: 700, minWidth: 18, textAlign: "center" }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {aba === "receber" && (
        <ContasReceber contasReceber={contasReceber} setContasReceber={setContasReceber} clientes={clientes} notify={notify} />
      )}
      {aba === "pagar" && (
        <ContasPagar contasPagar={contasPagar} setContasPagar={setContasPagar} fornecedores={fornecedores} notify={notify} />
      )}
      {aba === "fornecedores" && (
        <Fornecedores fornecedores={fornecedores} setFornecedores={setFornecedores} contasPagar={contasPagar} notify={notify} />
      )}
      {aba === "fluxo" && (
        <FluxoCaixa contasReceber={contasReceber} contasPagar={contasPagar} clientes={clientes} fornecedores={fornecedores} />
      )}
    </div>
  );
};

export default Financeiro;
