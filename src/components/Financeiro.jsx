import { useState } from 'react';
import { fmt, today } from '../lib/utils';
import ContasReceber from './ContasReceber';
import ContasPagar from './ContasPagar';
import Fornecedores from './Fornecedores';
import FluxoCaixa from './FluxoCaixa';
import Despesas from './Despesas';

const Financeiro = ({ contasReceber, setContasReceber, contasPagar, setContasPagar, fornecedores, setFornecedores, clientes, vendas, despesas, setDespesas, notify }) => {
  const [aba, setAba] = useState("receber");

  const qtdReceberVencidas = contasReceber.filter(cr => cr.status !== "pago" && cr.data_vencimento < today()).length;
  const qtdPagarVencidas = contasPagar.filter(cp => cp.status !== "pago" && cp.data_vencimento < today()).length;

  const totalVendas = (vendas || []).filter(v => v.status !== "cancelado").reduce((a, v) => a + Number(v.total), 0);
  const totalFornecedores = contasPagar.filter(cp => cp.status === "pago").reduce((a, c) => a + Number(c.valor), 0);
  const totalDespesas = (despesas || []).reduce((a, d) => a + Number(d.valor), 0);
  const saldoCaixa = totalVendas - totalFornecedores - totalDespesas;

  const tabs = [
    { id: "receber", label: "A Receber", badge: qtdReceberVencidas },
    { id: "pagar", label: "A Pagar", badge: qtdPagarVencidas },
    { id: "fornecedores", label: "Fornecedores" },
    { id: "fluxo", label: "Fluxo de Caixa" },
    { id: "despesas", label: "Despesas" },
  ];

  return (
    <div>
      <div style={{ background: saldoCaixa >= 0 ? "#0d1f14" : "#1f0d0d", border: `1px solid ${saldoCaixa >= 0 ? "#1e4a2a" : "#5a1a1a"}`, borderRadius: 10, padding: "1rem 1.5rem", marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: ".7rem", color: "#555", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>Saldo no Caixa</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: saldoCaixa >= 0 ? "#4caf82" : "#e05a5a", fontFamily: "'DM Mono',monospace", lineHeight: 1 }}>{fmt(saldoCaixa)}</div>
        </div>
        <div style={{ fontSize: ".75rem", color: "#444", textAlign: "right", lineHeight: 1.7 }}>
          <div>Vendas: <span style={{ color: "#4caf82", fontFamily: "'DM Mono',monospace" }}>{fmt(totalVendas)}</span></div>
          <div>Fornecedores: <span style={{ color: "#e05a5a", fontFamily: "'DM Mono',monospace" }}>−{fmt(totalFornecedores)}</span></div>
          <div>Despesas: <span style={{ color: "#e05a5a", fontFamily: "'DM Mono',monospace" }}>−{fmt(totalDespesas)}</span></div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 0, marginBottom: "1.75rem", borderBottom: "1px solid #1f1f1f", overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setAba(t.id)}
            style={{ padding: "8px 16px 11px", border: "none", borderBottom: `2px solid ${aba === t.id ? "#ffbf00" : "transparent"}`, background: "transparent", cursor: "pointer", color: aba === t.id ? "#c9a84c" : "#555", fontSize: ".88rem", fontWeight: aba === t.id ? 600 : 400, display: "inline-flex", alignItems: "center", gap: 7, transition: "all .15s", marginBottom: -1, whiteSpace: "nowrap", flexShrink: 0 }}>
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
        <FluxoCaixa contasReceber={contasReceber} setContasReceber={setContasReceber} contasPagar={contasPagar} setContasPagar={setContasPagar} clientes={clientes} fornecedores={fornecedores} notify={notify} />
      )}
      {aba === "despesas" && (
        <Despesas despesas={despesas} setDespesas={setDespesas} notify={notify} />
      )}
    </div>
  );
};

export default Financeiro;
