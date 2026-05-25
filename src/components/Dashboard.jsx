import { useState, useMemo } from 'react';
import { fmt, today } from '../lib/utils';
import Icon from './ui/Icon';
import LineAreaChart from './LineAreaChart';

const Dashboard = ({ produtos, clientes, vendas, movimentos, contasReceber, contasPagar, despesas, reload }) => {
  const [periodo, setPeriodo] = useState("mes");
  const agora = new Date();
  const mesAtual = agora.toISOString().slice(0, 7);
  const semanaAtras = new Date(agora - 7 * 86400000).toISOString().split("T")[0];
  const trimestre = new Date(agora - 90 * 86400000).toISOString().split("T")[0];

  const fp = periodo === "mes" ? v => v.data?.startsWith(mesAtual)
    : periodo === "semana" ? v => v.data >= semanaAtras
    : v => v.data >= trimestre;

  const vp = vendas.filter(fp);
  const fat = vp.reduce((a, v) => a + Number(v.total), 0);
  const tkt = vp.length > 0 ? fat / vp.length : 0;

  const custoEstoque = useMemo(
    () => produtos.reduce((a, p) => a + Number(p.custo || 0) * Number(p.estoque || 0), 0),
    [produtos]
  );

  const lucroPeriodo = useMemo(() => {
    let custoVendido = 0;
    vp.forEach(v => {
      (v.venda_itens || []).forEach(it => {
        const prod = produtos.find(p => p.id === it.produto_id);
        if (prod) custoVendido += Number(prod.custo || 0) * Number(it.quantidade || 0);
      });
    });
    return fat - custoVendido;
  }, [vp, produtos, fat]);

  const baixo = produtos.filter(p => p.estoque < 10);

  const contasVencidas = useMemo(() => {
    if (!contasReceber) return [];
    return contasReceber.filter(cr => cr.status !== "pago" && cr.data_vencimento < today());
  }, [contasReceber]);

  const totalVencido = contasVencidas.reduce((a, c) => a + Number(c.valor), 0);
  const totalAReceber = (contasReceber || []).filter(cr => cr.status !== "pago").reduce((a, c) => a + Number(c.valor), 0);

  const dp = (despesas || []).filter(fp);
  const totalDespesas = dp.reduce((a, d) => a + Number(d.valor), 0);

  const saldoCaixa = useMemo(() => {
    const entradas = vendas.filter(v => v.status !== "cancelado").reduce((a, v) => a + Number(v.total), 0);
    const saidasCP = (contasPagar || []).filter(cp => cp.status === "pago").reduce((a, c) => a + Number(c.valor), 0);
    const saidasDesp = (despesas || []).reduce((a, d) => a + Number(d.valor), 0);
    return entradas - saidasCP - saidasDesp;
  }, [vendas, contasPagar, despesas]);

  const topProd = useMemo(() => {
    const m = {};
    vp.forEach(v => (v.venda_itens || []).forEach(it => {
      if (!m[it.produto_id]) m[it.produto_id] = { qty: 0, valor: 0 };
      m[it.produto_id].qty += Number(it.quantidade);
      m[it.produto_id].valor += Number(it.quantidade) * Number(it.preco);
    }));
    return Object.entries(m).map(([id, d]) => ({ id: Number(id), ...d })).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [vp]);

  const topCli = useMemo(() => {
    const m = {};
    vp.forEach(v => {
      if (!v.cliente_id) return;
      if (!m[v.cliente_id]) m[v.cliente_id] = { total: 0, pedidos: 0 };
      m[v.cliente_id].total += Number(v.total);
      m[v.cliente_id].pedidos += 1;
    });
    return Object.entries(m).map(([id, d]) => ({ id: Number(id), ...d })).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [vp]);

  const grafico = useMemo(() => {
    if (periodo === "mes") {
      const m = {};
      vp.forEach(v => {
        const d = v.data?.slice(8, 10);
        if (d) { if (!m[d]) m[d] = { valor: 0, qtd: 0 }; m[d].valor += Number(v.total); m[d].qtd += 1; }
      });
      return Object.entries(m).sort((a, b) => a[0].localeCompare(b[0])).map(([d, x]) => ({ label: d, valor: x.valor, qtd: x.qtd }));
    } else if (periodo === "semana") {
      const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]; const m = {};
      vp.forEach(v => {
        if (!v.data) return;
        const k = dias[new Date(v.data + "T12:00:00").getDay()];
        if (!m[k]) m[k] = { valor: 0, qtd: 0 }; m[k].valor += Number(v.total); m[k].qtd += 1;
      });
      return dias.map(d => ({ label: d, valor: m[d]?.valor || 0, qtd: m[d]?.qtd || 0 }));
    } else {
      const m = {};
      vp.forEach(v => {
        const mes = v.data?.slice(0, 7);
        if (mes) { if (!m[mes]) m[mes] = { valor: 0, qtd: 0 }; m[mes].valor += Number(v.total); m[mes].qtd += 1; }
      });
      return Object.entries(m).sort((a, b) => a[0].localeCompare(b[0])).map(([mes, x]) => ({ label: mes.slice(5), valor: x.valor, qtd: x.qtd }));
    }
  }, [vp, periodo, mesAtual]);

  const maxP = topProd[0]?.qty || 1, maxC = topCli[0]?.total || 1;
  const labelPeriodo = periodo === "mes" ? "do Mês" : periodo === "semana" ? "da Semana" : "do Trimestre";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.6rem", color: "#c9a84c", margin: 0 }}>Dashboard</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["semana", "mes", "trimestre"].map(p => (
            <button key={p} onClick={() => setPeriodo(p)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", background: periodo === p ? "#ffbf00" : "#1a1a1a", color: periodo === p ? "#0a0a08" : "#888", fontSize: ".8rem", fontWeight: periodo === p ? 700 : 400 }}>
              {p === "mes" ? "Mês" : p === "semana" ? "Semana" : "Trimestre"}
            </button>
          ))}
          <button onClick={reload} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #2a2a2a", background: "none", color: "#666", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: ".8rem" }}>
            <Icon name="refresh" size={14} /> Atualizar
          </button>
        </div>
      </div>

      {/* Saldo */}
      <div style={{ background: saldoCaixa >= 0 ? "#0d1f14" : "#1f0d0d", border: `1px solid ${saldoCaixa >= 0 ? "#1e4a2a" : "#5a1a1a"}`, borderRadius: 10, padding: "1.25rem 1.5rem", marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: ".72rem", color: "#555", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>Saldo no Caixa</div>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: saldoCaixa >= 0 ? "#4caf82" : "#e05a5a", fontFamily: "'DM Mono',monospace", lineHeight: 1 }}>{fmt(saldoCaixa)}</div>
        </div>
        <div style={{ fontSize: ".75rem", color: "#444", textAlign: "right", lineHeight: 1.7 }}>
          <div>Vendas: <span style={{ color: "#4caf82", fontFamily: "'DM Mono',monospace" }}>{fmt(vendas.filter(v => v.status !== "cancelado").reduce((a, v) => a + Number(v.total), 0))}</span></div>
          <div>Fornecedores: <span style={{ color: "#e05a5a", fontFamily: "'DM Mono',monospace" }}>−{fmt((contasPagar || []).filter(cp => cp.status === "pago").reduce((a, c) => a + Number(c.valor), 0))}</span></div>
          <div>Despesas: <span style={{ color: "#e05a5a", fontFamily: "'DM Mono',monospace" }}>−{fmt((despesas || []).reduce((a, d) => a + Number(d.valor), 0))}</span></div>
        </div>
      </div>

      {/* Hero Faturamento */}
      <div style={{ background: "linear-gradient(135deg, #141200 0%, #0d0c00 100%)", border: "1px solid #2a2200", borderRadius: 12, padding: "1.5rem 2rem", marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontSize: ".68rem", color: "#5a4a00", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8 }}>Faturamento {labelPeriodo}</div>
          <div style={{ fontSize: "2.8rem", fontWeight: 700, color: "#ffbf00", lineHeight: 1, fontFamily: "'DM Mono',monospace" }}>{fmt(fat)}</div>
          {fat > 0 && <div style={{ fontSize: ".75rem", color: lucroPeriodo >= 0 ? "#4caf82" : "#e05a5a", marginTop: 8, fontFamily: "'DM Mono',monospace" }}>{fmt(lucroPeriodo)} lucro · {((lucroPeriodo / fat) * 100).toFixed(1)}% margem</div>}
        </div>
        <div style={{ display: "flex", gap: "2.5rem" }}>
          <div>
            <div style={{ fontSize: ".68rem", color: "#5a4a00", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Ticket Médio</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#c9a84c", fontFamily: "'DM Mono',monospace" }}>{fmt(tkt)}</div>
          </div>
          <div>
            <div style={{ fontSize: ".68rem", color: "#5a4a00", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Vendas</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#6b9fd4", fontFamily: "'DM Mono',monospace" }}>{vp.length}</div>
          </div>
        </div>
      </div>

      {/* Cards secundários */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: "1.5rem" }}>
        <div style={{ background: "#161616", border: `1px solid ${lucroPeriodo >= 0 ? "#1e3a2a" : "#3a1e1e"}`, borderRadius: 10, padding: "1.25rem" }}>
          <div style={{ fontSize: "1.6rem", fontWeight: 700, color: lucroPeriodo >= 0 ? "#4caf82" : "#e05a5a", lineHeight: 1, fontFamily: "'DM Mono',monospace" }}>{fmt(lucroPeriodo)}</div>
          <div style={{ fontSize: ".75rem", color: "#777", marginTop: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>Lucro {labelPeriodo}</div>
        </div>
        <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 10, padding: "1.25rem" }}>
          <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#b86fcf", lineHeight: 1, fontFamily: "'DM Mono',monospace" }}>{fmt(custoEstoque)}</div>
          <div style={{ fontSize: ".75rem", color: "#777", marginTop: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>Custo do Estoque</div>
          <div style={{ fontSize: ".7rem", color: "#555", marginTop: 4 }}>{produtos.length} produto(s)</div>
        </div>
        <div style={{ background: "#161616", border: `1px solid ${totalVencido > 0 ? "#5a1a1a" : "#2a2a2a"}`, borderRadius: 10, padding: "1.25rem" }}>
          <div style={{ fontSize: "1.6rem", fontWeight: 700, color: totalVencido > 0 ? "#e05a5a" : "#e8a020", lineHeight: 1, fontFamily: "'DM Mono',monospace" }}>{fmt(totalAReceber)}</div>
          <div style={{ fontSize: ".75rem", color: "#777", marginTop: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>A Receber</div>
          {totalVencido > 0 && <div style={{ fontSize: ".7rem", color: "#e05a5a", marginTop: 4 }}>{fmt(totalVencido)} em atraso</div>}
        </div>
        <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 10, padding: "1.25rem" }}>
          <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#e05a5a", lineHeight: 1, fontFamily: "'DM Mono',monospace" }}>{fmt(totalDespesas)}</div>
          <div style={{ fontSize: ".75rem", color: "#777", marginTop: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>Despesas {labelPeriodo}</div>
          <div style={{ fontSize: ".7rem", color: "#555", marginTop: 4 }}>Anúncios · Marketing · Frete</div>
        </div>
      </div>

      {contasVencidas.length > 0 && (
        <div style={{ background: "#1f0d0d", border: "1px solid #5a1a1a", borderRadius: 8, padding: ".75rem 1rem", marginBottom: ".75rem", display: "flex", alignItems: "center", gap: 10, color: "#e05a5a" }}>
          <Icon name="warn" size={20} />
          <span style={{ fontSize: ".9rem" }}>
            <b>{contasVencidas.length} cobrança{contasVencidas.length > 1 ? "s" : ""} em atraso</b>
            {" · "}{fmt(totalVencido)} pendente{contasVencidas.length > 1 ? "s" : ""}
          </span>
        </div>
      )}
      {baixo.length > 0 && (
        <div style={{ background: "#1f1409", border: "1px solid #5a3a0a", borderRadius: 8, padding: ".75rem 1rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: 10, color: "#e8a020" }}>
          <Icon name="warn" size={20} />
          <span style={{ fontSize: ".9rem" }}><b>{baixo.length} produto(s)</b> com estoque baixo (menos de 10 unidades)</span>
        </div>
      )}

      {/* Gráfico */}
      <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 10, padding: "1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div>
            <div style={{ fontSize: ".7rem", color: "#555", textTransform: "uppercase", letterSpacing: ".06em" }}>Evolução de Vendas</div>
            <div style={{ fontSize: ".95rem", fontWeight: 600, color: "#e8e4d8", marginTop: 2 }}>
              {periodo === "mes" ? "Dia a dia do mês" : periodo === "semana" ? "Dias da semana" : "Meses do trimestre"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: ".85rem", color: "#ffbf00", fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>{fmt(fat)}</div>
            <div style={{ fontSize: ".72rem", color: "#555", marginTop: 2 }}>{vp.length} venda{vp.length !== 1 ? "s" : ""} no período</div>
          </div>
        </div>
        <LineAreaChart dados={grafico} />
      </div>

      {/* Top produtos e clientes */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 10, padding: "1.25rem" }}>
          <div style={{ fontSize: ".7rem", color: "#555", textTransform: "uppercase", letterSpacing: ".06em" }}>Top Produtos</div>
          <div style={{ fontSize: ".95rem", fontWeight: 600, color: "#e8e4d8", marginBottom: "1rem", marginTop: 4 }}>Mais vendidos</div>
          {topProd.length === 0 && <div style={{ color: "#444", fontSize: ".85rem" }}>Sem dados no período</div>}
          {topProd.map((tp, i) => { const p = produtos.find(x => x.id === tp.id); return (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: i === 0 ? "#ffbf00" : "#444", width: 16 }}>#{i + 1}</span>
                  <span style={{ fontSize: ".85rem", color: "#ccc" }}>{p?.nome ?? `Produto #${tp.id}`}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: ".8rem", color: "#ffbf00", fontFamily: "'DM Mono',monospace" }}>{tp.qty} un</div>
                  <div style={{ fontSize: ".72rem", color: "#444" }}>{fmt(tp.valor)}</div>
                </div>
              </div>
              <div style={{ background: "#1a1a10", borderRadius: 3, height: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(tp.qty / maxP) * 100}%`, background: "#ffbf00", borderRadius: 3 }} />
              </div>
            </div>
          ); })}
        </div>
        <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 10, padding: "1.25rem" }}>
          <div style={{ fontSize: ".7rem", color: "#555", textTransform: "uppercase", letterSpacing: ".06em" }}>Top Clientes</div>
          <div style={{ fontSize: ".95rem", fontWeight: 600, color: "#e8e4d8", marginBottom: "1rem", marginTop: 4 }}>Maiores compradores</div>
          {topCli.length === 0 && <div style={{ color: "#444", fontSize: ".85rem" }}>Sem dados no período</div>}
          {topCli.map((tc, i) => { const c = clientes.find(x => x.id === tc.id); return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: i === 0 ? "#1a1a10" : "transparent" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: i === 0 ? "#ffbf0022" : "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".75rem", color: i === 0 ? "#ffbf00" : "#555", fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: ".85rem", color: "#ccc", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c?.nome ?? `Cliente #${tc.id}`}</div>
                <div style={{ fontSize: ".72rem", color: "#444" }}>{c?.cidade ?? ""} · {tc.pedidos} pedido(s)</div>
              </div>
              <div style={{ fontSize: ".85rem", color: "#ffbf00", fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>{fmt(tc.total)}</div>
            </div>
          ); })}
        </div>
      </div>

      {/* Movimentos recentes */}
      <h3 style={{ fontSize: ".75rem", color: "#666", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: ".75rem" }}>Movimentos Recentes</h3>
      <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 10, overflow: "hidden" }}>
        {movimentos.slice(0, 6).map(m => { const p = produtos.find(x => x.id === m.produto_id); return (
          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: ".9rem 1.25rem", borderBottom: "1px solid #1a1a1a" }}>
            <div style={{ color: m.tipo === "entrada" ? "#4caf82" : "#e05a5a", flexShrink: 0 }}><Icon name={m.tipo === "entrada" ? "up" : "down"} size={16} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: ".9rem", color: "#ddd" }}>{p?.nome ?? "Produto removido"}</div>
              <div style={{ fontSize: ".75rem", color: "#555" }}>{m.obs || m.tipo} · {m.data}</div>
            </div>
            <div style={{ fontSize: ".9rem", fontWeight: 600, color: m.tipo === "entrada" ? "#4caf82" : "#e05a5a", fontFamily: "'DM Mono',monospace" }}>
              {m.tipo === "entrada" ? "+" : "-"}{m.quantidade} un
            </div>
          </div>
        ); })}
        {movimentos.length === 0 && <div style={{ padding: "1.5rem", color: "#555", textAlign: "center", fontSize: ".85rem" }}>Nenhum movimento registrado</div>}
      </div>
    </div>
  );
};


// ── Estoque ───────────────────────────────────────────────────────

export default Dashboard;
