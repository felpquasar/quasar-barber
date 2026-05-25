import { useState } from 'react';
import { useMobile } from '../hooks/useMobile';
import { supabase } from '../lib/supabase';
import { fmt, today } from '../lib/utils';
import { inp, btn } from '../styles/shared';
import Icon from './ui/Icon';
import Modal from './ui/Modal';
import Field from './ui/Field';
import Spinner from './ui/Spinner';

const calcTier = (n) => {
  if (n >= 4) return { nome: "Elite", pct: 20, cor: "#c9a84c" };
  if (n >= 3) return { nome: "Ouro", cor: "#c9a84c", pct: 15 };
  if (n >= 1) return { nome: "Bronze", cor: "#cd7f32", pct: 5 };
  return null;
};

const Clientes = ({ clientes, setClientes, vendas, produtos, contasReceber, notify }) => {
  const isMobile = useMobile();
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [historico, setHistorico] = useState(null);
  const [detalheVenda, setDetalheVenda] = useState(null);
  const [form, setForm] = useState({ nome: "", contato: "", telefone: "", cidade: "", tipo: "Barbearia", limite_credito: "", indicado_por: "" });

  const abrir = (c = null) => {
    setEditando(c);
    setForm(c
      ? { nome: c.nome, contato: c.contato || "", telefone: c.telefone || "", cidade: c.cidade || "", tipo: c.tipo || "Barbearia", limite_credito: c.limite_credito || "", indicado_por: c.indicado_por || "" }
      : { nome: "", contato: "", telefone: "", cidade: "", tipo: "Barbearia", limite_credito: "", indicado_por: "" });
    setModal(true);
  };

  const salvar = async () => {
    if (!form.nome) return; setSaving(true);
    const payload = {
      nome: form.nome, contato: form.contato, telefone: form.telefone,
      cidade: form.cidade, tipo: form.tipo, limite_credito: Number(form.limite_credito) || 0,
      indicado_por: form.indicado_por ? Number(form.indicado_por) : null,
    };
    if (editando) {
      const { data, error } = await supabase.from("clientes").update(payload).eq("id", editando.id).select().single();
      setSaving(false); if (error) { notify("Erro ao salvar", "error"); return; }
      setClientes(prev => prev.map(c => c.id === editando.id ? data : c));
    } else {
      const { data, error } = await supabase.from("clientes").insert(payload).select().single();
      setSaving(false); if (error) { notify("Erro ao salvar", "error"); return; }
      setClientes(prev => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)));

      if (form.indicado_por) {
        const refId = Number(form.indicado_por);
        const referrer = clientes.find(c => c.id === refId);
        if (referrer) {
          const novasIndicacoes = (Number(referrer.indicacoes_ativas) || 0) + 1;
          const tier = calcTier(novasIndicacoes);
          const novoDesconto = tier ? tier.pct : 0;
          const { error: eRef } = await supabase.from("clientes")
            .update({ indicacoes_ativas: novasIndicacoes, desconto_pendente: novoDesconto })
            .eq("id", refId);
          if (!eRef) setClientes(prev => prev.map(c => c.id === refId ? { ...c, indicacoes_ativas: novasIndicacoes, desconto_pendente: novoDesconto } : c));
        }
      }
    }
    setModal(false); notify(editando ? "Cliente atualizado!" : "Cliente cadastrado!");
  };

  const usarDesconto = async (c) => {
    if (!window.confirm(`Aplicar ${c.desconto_pendente}% de desconto para ${c.nome}? Isso zerará o contador de indicações.`)) return;
    const { error } = await supabase.from("clientes").update({ indicacoes_ativas: 0, desconto_pendente: 0 }).eq("id", c.id);
    if (error) { notify("Erro ao aplicar desconto", "error"); return; }
    setClientes(prev => prev.map(x => x.id === c.id ? { ...x, indicacoes_ativas: 0, desconto_pendente: 0 } : x));
    notify(`Desconto de ${c.desconto_pendente}% aplicado e zerado!`);
  };

  const excluir = async (id) => {
    if (!window.confirm("Excluir este cliente?")) return;
    const { error } = await supabase.from("clientes").delete().eq("id", id);
    if (error) { notify("Erro ao excluir", "error"); return; }
    setClientes(prev => prev.filter(c => c.id !== id)); notify("Cliente excluído.");
  };

  const metricas = (cid) => { const vs = vendas.filter(v => v.cliente_id === cid); const t = vs.reduce((a, v) => a + Number(v.total), 0); return { total: t, pedidos: vs.length, ticket: vs.length > 0 ? t / vs.length : 0 }; };
  const vcli = (cid) => vendas.filter(v => v.cliente_id === cid).sort((a, b) => (b.data || "").localeCompare(a.data || ""));
  const statusCor = { pago: "#4caf82", pendente: "#e8a020", cancelado: "#e05a5a" };
  const cores = { Barbearia: "#ffbf00", Salão: "#b86fcf", Distribuidor: "#6b9fd4", Outros: "#4caf82" };
  const lista = clientes.filter(c => c.nome.toLowerCase().includes(filtro.toLowerCase()));

  const inadimplente = (cid) => (contasReceber || []).some(cr => cr.cliente_id === cid && cr.status !== "pago" && cr.data_vencimento < today());
  const pendenteCli = (cid) => (contasReceber || []).filter(cr => cr.cliente_id === cid && cr.status !== "pago").reduce((a, c) => a + Number(c.valor), 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", marginBottom: "1.5rem", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 12 : 0 }}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.6rem", color: "#c9a84c", margin: 0 }}>Clientes</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <input placeholder="Buscar cliente..." value={filtro} onChange={e => setFiltro(e.target.value)} style={{ ...inp, width: isMobile ? "100%" : 200 }} />
          <button style={btn("primary")} onClick={() => abrir()}><Icon name="plus" size={14} /> Novo Cliente</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
        {lista.map(c => {
          const m = metricas(c.id);
          const inadim = inadimplente(c.id);
          const pendente = pendenteCli(c.id);
          const limCred = Number(c.limite_credito) || 0;
          const pctCred = limCred > 0 ? Math.min(pendente / limCred * 100, 100) : 0;
          const corCred = pctCred >= 90 ? "#e05a5a" : pctCred >= 70 ? "#e8a020" : "#4caf82";
          const tier = calcTier(Number(c.indicacoes_ativas) || 0);
          const indicador = c.indicado_por ? clientes.find(x => x.id === c.indicado_por) : null;
          return (
            <div key={c.id} style={{ background: "#161616", border: `1px solid ${inadim ? "#5a1a1a" : "#2a2a2a"}`, borderRadius: 10, padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: ".75rem" }}>
                <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 600, color: "#e0e0e0", fontSize: "1rem" }}>{c.nome}</span>
                    {inadim && (
                      <span style={{ fontSize: ".65rem", padding: "2px 7px", borderRadius: 20, background: "#e05a5a22", color: "#e05a5a", fontWeight: 700, whiteSpace: "nowrap" }}>
                        Inadimplente
                      </span>
                    )}
                    {tier && (
                      <span style={{ fontSize: ".65rem", padding: "2px 7px", borderRadius: 20, background: tier.cor + "22", color: tier.cor, fontWeight: 700, whiteSpace: "nowrap" }}>
                        {tier.nome}
                      </span>
                    )}
                  </div>
                  {indicador && (
                    <div style={{ fontSize: ".72rem", color: "#555", marginTop: 2 }}>Indicado por {indicador.nome}</div>
                  )}
                </div>
                <span style={{ fontSize: ".7rem", padding: "2px 8px", borderRadius: 20, background: (cores[c.tipo] || "#4caf82") + "22", color: cores[c.tipo] || "#4caf82", flexShrink: 0 }}>{c.tipo}</span>
              </div>
              <div style={{ fontSize: ".82rem", color: "#888", lineHeight: 1.8 }}>
                {c.contato && <div>👤 {c.contato}</div>}
                {c.telefone && <div>📞 {c.telefone}</div>}
                {c.cidade && <div>📍 {c.cidade}</div>}
              </div>

              {(Number(c.indicacoes_ativas) > 0 || Number(c.desconto_pendente) > 0) && (
                <div style={{ marginTop: 10, padding: "8px 10px", background: "#111", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: ".7rem", color: "#555", marginBottom: 2 }}>Indicações ativas</div>
                    <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e0e0e0" }}>{Number(c.indicacoes_ativas) || 0} indicação(ões)</div>
                  </div>
                  {Number(c.desconto_pendente) > 0 && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: ".7rem", color: "#555", marginBottom: 2 }}>Desconto disponível</div>
                      <div style={{ fontSize: "1rem", fontWeight: 700, color: "#4caf82", fontFamily: "'DM Mono',monospace" }}>{c.desconto_pendente}%</div>
                    </div>
                  )}
                </div>
              )}

              {m.pedidos > 0 && (
                <div style={{ display: "flex", gap: 8, marginTop: 10, padding: "8px 10px", background: "#111", borderRadius: 8 }}>
                  <div style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: ".7rem", color: "#555" }}>Total</div>
                    <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#ffbf00", fontFamily: "'DM Mono',monospace" }}>{fmt(m.total)}</div>
                  </div>
                  <div style={{ width: 1, background: "#222" }} />
                  <div style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: ".7rem", color: "#555" }}>Pedidos</div>
                    <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e0e0e0" }}>{m.pedidos}</div>
                  </div>
                </div>
              )}
              {limCred > 0 && (
                <div style={{ marginTop: 10, padding: "8px 10px", background: "#111", borderRadius: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".7rem", marginBottom: 6 }}>
                    <span style={{ color: "#555" }}>Limite de crédito</span>
                    <span style={{ color: corCred, fontFamily: "'DM Mono',monospace" }}>{fmt(pendente)} / {fmt(limCred)}</span>
                  </div>
                  <div style={{ background: "#1a1a1a", borderRadius: 4, height: 5, overflow: "hidden" }}>
                    <div style={{ width: `${pctCred}%`, height: "100%", background: corCred, borderRadius: 4, transition: "width .3s" }} />
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                <button style={{ ...btn("ghost"), padding: "5px 10px", fontSize: ".75rem" }} onClick={() => abrir(c)}><Icon name="pencil" size={12} /> Editar</button>
                <button style={{ ...btn("ghost"), padding: "5px 10px", fontSize: ".75rem" }} onClick={() => setHistorico(c)}><Icon name="history" size={12} /> Histórico</button>
                {Number(c.desconto_pendente) > 0 && (
                  <button style={{ ...btn("primary"), padding: "5px 10px", fontSize: ".75rem" }} onClick={() => usarDesconto(c)}>
                    Usar {c.desconto_pendente}%
                  </button>
                )}
                <button style={{ ...btn("danger"), padding: "5px 10px", fontSize: ".75rem" }} onClick={() => excluir(c.id)}><Icon name="trash" size={12} /></button>
              </div>
            </div>
          );
        })}
        {lista.length === 0 && <div style={{ color: "#555", padding: "2rem", gridColumn: "1/-1", textAlign: "center" }}>Nenhum cliente encontrado</div>}
      </div>

      {modal && (
        <Modal title={editando ? "Editar Cliente" : "Novo Cliente"} onClose={() => setModal(false)}>
          <Field label="Nome / Razão Social"><input style={inp} value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></Field>
          <Field label="Nome do Contato"><input style={inp} value={form.contato} onChange={e => setForm({ ...form, contato: e.target.value })} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "1rem" }}>
            <Field label="Telefone"><input style={inp} value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} /></Field>
            <Field label="Cidade"><input style={inp} value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "1rem" }}>
            <Field label="Tipo">
              <select style={inp} value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                {["Barbearia", "Salão", "Distribuidor", "Outros"].map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Limite de Crédito (R$)">
              <input style={inp} type="number" step=".01" min="0" placeholder="0,00" value={form.limite_credito} onChange={e => setForm({ ...form, limite_credito: e.target.value })} />
            </Field>
          </div>
          <Field label="Indicado por (opcional)">
            <select style={inp} value={form.indicado_por} onChange={e => setForm({ ...form, indicado_por: e.target.value })}>
              <option value="">— Nenhum —</option>
              {clientes
                .filter(c => !editando || c.id !== editando.id)
                .map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <button style={btn("ghost")} onClick={() => setModal(false)}>Cancelar</button>
            <button style={btn("primary")} onClick={salvar} disabled={saving}>{saving ? <><Spinner size={14} color="#0a0a08" /> Salvando...</> : "Salvar"}</button>
          </div>
        </Modal>
      )}

      {historico && (
        <Modal title={`Histórico — ${historico.nome}`} onClose={() => { setHistorico(null); setDetalheVenda(null); }} wide>
          {(() => { const m = metricas(historico.id); return (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: "1.25rem" }}>
              {[{ label: "Total gasto", value: fmt(m.total) }, { label: "Pedidos", value: m.pedidos }, { label: "Ticket médio", value: fmt(m.ticket) }].map((s, i) => (
                <div key={i} style={{ background: "#111", borderRadius: 8, padding: "10px 14px", textAlign: "center" }}>
                  <div style={{ fontSize: ".7rem", color: "#555", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#ffbf00", fontFamily: "'DM Mono',monospace" }}>{s.value}</div>
                </div>
              ))}
            </div>
          ); })()}
          <div style={{ fontSize: ".72rem", color: "#555", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: ".75rem" }}>Pedidos</div>
          {vcli(historico.id).length === 0 && <div style={{ color: "#444", fontSize: ".88rem", padding: ".5rem 0" }}>Nenhuma venda registrada</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {vcli(historico.id).map(v => (
              <div key={v.id}>
                <button onClick={() => setDetalheVenda(detalheVenda?.id === v.id ? null : v)}
                  style={{ width: "100%", background: "#111", border: "1px solid #2a2a2a", borderRadius: 8, padding: "10px 14px", cursor: "pointer", color: "inherit", textAlign: "left" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: ".8rem", fontFamily: "'DM Mono',monospace", color: "#555" }}>#{String(v.id).slice(-4)}</span>
                        <span style={{ fontSize: ".72rem", padding: "1px 8px", borderRadius: 20, background: (statusCor[v.status] || "#555") + "22", color: statusCor[v.status] || "#888" }}>{v.status}</span>
                      </div>
                      <div style={{ fontSize: ".78rem", color: "#555" }}>{v.data} · {(v.venda_itens || []).length} item(s)</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: "1rem", fontWeight: 700, color: "#e0e0e0", fontFamily: "'DM Mono',monospace" }}>{fmt(v.total)}</span>
                      <span style={{ color: "#555", transform: detalheVenda?.id === v.id ? "rotate(90deg)" : "none", transition: ".2s" }}><Icon name="chevron" size={14} /></span>
                    </div>
                  </div>
                </button>
                {detalheVenda?.id === v.id && (
                  <div style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderTop: "none", borderRadius: "0 0 8px 8px", padding: "10px 14px" }}>
                    {(v.venda_itens || []).map((it, i) => { const p = produtos.find(x => x.id === it.produto_id); return (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #1a1a1a" }}>
                        <span style={{ color: "#ccc" }}>{p?.nome ?? "Produto removido"}</span>
                        <span style={{ color: "#888", fontFamily: "'DM Mono',monospace" }}>{it.quantidade}x {fmt(it.preco)}</span>
                      </div>
                    ); })}
                    {(v.venda_itens || []).length === 0 && <div style={{ color: "#444", fontSize: ".82rem" }}>Sem itens</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Clientes;
