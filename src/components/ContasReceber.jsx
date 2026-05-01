import { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { fmt, today } from '../lib/utils';
import { inp, btn } from '../styles/shared';
import Icon from './ui/Icon';
import Modal from './ui/Modal';
import Field from './ui/Field';
import Spinner from './ui/Spinner';

const FORMAS = ["a_vista", "cartao", "pix", "fiado"];
const FORMA_LABEL = { a_vista: "À Vista", cartao: "Cartão", pix: "Pix", fiado: "Fiado" };
const FORMA_COR = { a_vista: "#4caf82", cartao: "#6b9fd4", pix: "#5cb8d4", fiado: "#e8a020" };
const STATUS_COR = { pago: "#4caf82", pendente: "#e8a020", vencido: "#e05a5a" };
const STATUS_LABEL = { pago: "Pago", pendente: "Pendente", vencido: "Vencido" };

const statusReal = (cr) => {
  if (cr.status === "pago") return "pago";
  if (cr.data_vencimento < today()) return "vencido";
  return "pendente";
};

const diasAtraso = (vencimento) =>
  Math.floor((new Date(today() + "T12:00:00") - new Date(vencimento + "T12:00:00")) / 86400000);

const ContasReceber = ({ contasReceber, setContasReceber, clientes, notify }) => {
  const [filtro, setFiltro] = useState("todos");
  const [modalNova, setModalNova] = useState(false);
  const [modalPagar, setModalPagar] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ clienteId: "", descricao: "", valor: "", forma: "fiado", vencimento: today(), obs: "" });
  const [pagarForm, setPagarForm] = useState({ forma: "pix", data: today() });

  const lista = useMemo(() => {
    return contasReceber
      .map(cr => ({ ...cr, _status: statusReal(cr) }))
      .filter(cr => filtro === "todos" || cr._status === filtro)
      .sort((a, b) => {
        if (a._status === "vencido" && b._status !== "vencido") return -1;
        if (b._status === "vencido" && a._status !== "vencido") return 1;
        return a.data_vencimento.localeCompare(b.data_vencimento);
      });
  }, [contasReceber, filtro]);

  const totais = useMemo(() => {
    const mapeado = contasReceber.map(cr => ({ ...cr, _status: statusReal(cr) }));
    return {
      pendente: mapeado.filter(cr => cr._status === "pendente").reduce((a, c) => a + Number(c.valor), 0),
      vencido: mapeado.filter(cr => cr._status === "vencido").reduce((a, c) => a + Number(c.valor), 0),
      pago: mapeado.filter(cr => cr._status === "pago").reduce((a, c) => a + Number(c.valor), 0),
      qtdVencido: mapeado.filter(cr => cr._status === "vencido").length,
    };
  }, [contasReceber]);

  const salvarNova = async () => {
    if (!form.clienteId || !form.valor || !form.vencimento) { notify("Preencha todos os campos obrigatórios.", "error"); return; }
    setSaving(true);
    const { data, error } = await supabase.from("contas_receber").insert({
      cliente_id: Number(form.clienteId),
      descricao: form.descricao,
      valor: Number(form.valor),
      forma_pagamento: form.forma,
      data_emissao: today(),
      data_vencimento: form.vencimento,
      status: "pendente",
      obs: form.obs,
    }).select().single();
    setSaving(false);
    if (error) { notify("Erro ao salvar cobrança.", "error"); return; }
    setContasReceber(prev => [...prev, data].sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento)));
    setModalNova(false);
    setForm({ clienteId: "", descricao: "", valor: "", forma: "fiado", vencimento: today(), obs: "" });
    notify("Cobrança lançada!");
  };

  const confirmarPagamento = async () => {
    if (!modalPagar) return;
    setSaving(true);
    const { data, error } = await supabase.from("contas_receber")
      .update({ status: "pago", data_pagamento: pagarForm.data, forma_pagamento: pagarForm.forma })
      .eq("id", modalPagar.id).select().single();
    setSaving(false);
    if (error) { notify("Erro ao registrar pagamento.", "error"); return; }
    setContasReceber(prev => prev.map(cr => cr.id === modalPagar.id ? data : cr));
    setModalPagar(null);
    notify("Pagamento registrado!");
  };

  const excluir = async (id) => {
    if (!window.confirm("Excluir esta cobrança?")) return;
    const { error } = await supabase.from("contas_receber").delete().eq("id", id);
    if (error) { notify("Erro ao excluir.", "error"); return; }
    setContasReceber(prev => prev.filter(cr => cr.id !== id));
    notify("Cobrança removida.");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.6rem", color: "#e8c97a", margin: 0 }}>Contas a Receber</h2>
        <button style={btn("primary")} onClick={() => setModalNova(true)}><Icon name="plus" size={14} /> Nova Cobrança</button>
      </div>

      {/* Cards de resumo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: "1.5rem" }}>
        {[
          { label: "A Receber", valor: totais.pendente, cor: "#e8a020" },
          { label: "Em Atraso", valor: totais.vencido, cor: "#e05a5a" },
          { label: "Recebido", valor: totais.pago, cor: "#4caf82" },
        ].map((s, i) => (
          <div key={i} style={{ background: "#161616", border: `1px solid ${s.cor}33`, borderRadius: 10, padding: "1.1rem 1.25rem" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: s.cor, fontFamily: "'DM Mono',monospace", lineHeight: 1 }}>{fmt(s.valor)}</div>
            <div style={{ fontSize: ".72rem", color: "#666", marginTop: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Alerta de vencidos */}
      {totais.qtdVencido > 0 && (
        <div style={{ background: "#1f0d0d", border: "1px solid #5a1a1a", borderRadius: 8, padding: ".75rem 1rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: 10, color: "#e05a5a" }}>
          <Icon name="warn" size={18} />
          <span style={{ fontSize: ".9rem" }}>
            <b>{totais.qtdVencido} cobrança{totais.qtdVencido > 1 ? "s" : ""} em atraso</b>
            {" · "}Total: <b>{fmt(totais.vencido)}</b>
          </span>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, marginBottom: "1rem", flexWrap: "wrap" }}>
        {["todos", "pendente", "vencido", "pago"].map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            style={{ padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: ".8rem",
              background: filtro === f
                ? (f === "vencido" ? "#e05a5a" : f === "pago" ? "#4caf82" : f === "pendente" ? "#e8a020" : "#c9a84c")
                : "#1a1a1a",
              color: filtro === f ? "#0a0a08" : "#888",
              fontWeight: filtro === f ? 700 : 400 }}>
            {f === "todos" ? "Todos" : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".88rem" }}>
          <thead>
            <tr style={{ background: "#111" }}>
              {["Cliente", "Descrição", "Forma", "Vencimento", "Valor", "Status", "Ações"].map(h => (
                <th key={h} style={{ padding: ".75rem 1rem", textAlign: "left", fontSize: ".72rem", color: "#555", textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.map(cr => {
              const cli = clientes.find(c => c.id === cr.cliente_id);
              const atraso = cr._status === "vencido" ? diasAtraso(cr.data_vencimento) : 0;
              return (
                <tr key={cr.id} style={{ borderTop: "1px solid #1f1f1f", background: cr._status === "vencido" ? "#1a0a0a" : "transparent" }}>
                  <td style={{ padding: ".8rem 1rem", color: "#e0e0e0", fontWeight: 500 }}>{cli?.nome ?? "—"}</td>
                  <td style={{ padding: ".8rem 1rem", color: "#888", fontSize: ".82rem", maxWidth: 180 }}>
                    <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cr.descricao || "—"}</div>
                    {cr.venda_id && <div style={{ fontSize: ".7rem", color: "#555", marginTop: 2 }}>Venda #{String(cr.venda_id).slice(-4)}</div>}
                  </td>
                  <td style={{ padding: ".8rem 1rem" }}>
                    <span style={{ fontSize: ".75rem", padding: "2px 8px", borderRadius: 20, background: (FORMA_COR[cr.forma_pagamento] || "#888") + "22", color: FORMA_COR[cr.forma_pagamento] || "#888" }}>
                      {FORMA_LABEL[cr.forma_pagamento] || cr.forma_pagamento}
                    </span>
                  </td>
                  <td style={{ padding: ".8rem 1rem" }}>
                    <div style={{ color: cr._status === "vencido" ? "#e05a5a" : "#aaa", fontFamily: "'DM Mono',monospace", fontSize: ".85rem" }}>{cr.data_vencimento}</div>
                    {atraso > 0 && <div style={{ fontSize: ".7rem", color: "#e05a5a", marginTop: 2 }}>{atraso} dia{atraso > 1 ? "s" : ""} atraso</div>}
                    {cr._status === "pago" && cr.data_pagamento && <div style={{ fontSize: ".7rem", color: "#4caf82", marginTop: 2 }}>Pago em {cr.data_pagamento}</div>}
                  </td>
                  <td style={{ padding: ".8rem 1rem", color: "#c9a84c", fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>{fmt(cr.valor)}</td>
                  <td style={{ padding: ".8rem 1rem" }}>
                    <span style={{ fontSize: ".75rem", padding: "3px 10px", borderRadius: 20, background: STATUS_COR[cr._status] + "22", color: STATUS_COR[cr._status] }}>
                      {STATUS_LABEL[cr._status]}
                    </span>
                  </td>
                  <td style={{ padding: ".8rem 1rem" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {cr._status !== "pago" && (
                        <button
                          onClick={() => { setModalPagar(cr); setPagarForm({ forma: cr.forma_pagamento || "pix", data: today() }); }}
                          style={{ padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", background: "#4caf8222", color: "#4caf82", fontSize: ".75rem", display: "flex", alignItems: "center", gap: 4 }}>
                          <Icon name="check" size={13} /> Receber
                        </button>
                      )}
                      <button onClick={() => excluir(cr.id)} style={{ ...btn("danger"), padding: "4px 10px", fontSize: ".75rem" }}>
                        <Icon name="trash" size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {lista.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: "#444" }}>
                  {filtro === "todos" ? "Nenhuma conta a receber registrada" : `Nenhuma conta ${STATUS_LABEL[filtro]?.toLowerCase()}`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal nova cobrança */}
      {modalNova && (
        <Modal title="Nova Cobrança" onClose={() => setModalNova(false)}>
          <Field label="Cliente *">
            <select style={inp} value={form.clienteId} onChange={e => setForm({ ...form, clienteId: e.target.value })}>
              <option value="">Selecionar cliente...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Field>
          <Field label="Descrição">
            <input style={inp} value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Pedido de fevereiro" />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <Field label="Valor (R$) *">
              <input style={inp} type="number" step=".01" min="0" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} />
            </Field>
            <Field label="Vencimento *">
              <input style={inp} type="date" value={form.vencimento} onChange={e => setForm({ ...form, vencimento: e.target.value })} />
            </Field>
          </div>
          <Field label="Forma de Pagamento">
            <div style={{ display: "flex", gap: 6 }}>
              {FORMAS.map(f => (
                <button key={f} onClick={() => setForm({ ...form, forma: f })}
                  style={{ flex: 1, padding: "7px 0", borderRadius: 6, border: `1px solid ${form.forma === f ? FORMA_COR[f] : "#333"}`, cursor: "pointer",
                    background: form.forma === f ? FORMA_COR[f] + "22" : "transparent",
                    color: form.forma === f ? FORMA_COR[f] : "#666",
                    fontSize: ".78rem", fontWeight: form.forma === f ? 700 : 400 }}>
                  {FORMA_LABEL[f]}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Observação">
            <input style={inp} value={form.obs} onChange={e => setForm({ ...form, obs: e.target.value })} />
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <button style={btn("ghost")} onClick={() => setModalNova(false)}>Cancelar</button>
            <button style={btn("primary")} onClick={salvarNova} disabled={saving}>
              {saving ? <><Spinner size={14} color="#0a0a08" /> Salvando...</> : "Lançar Cobrança"}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal confirmar recebimento */}
      {modalPagar && (
        <Modal title="Registrar Recebimento" onClose={() => setModalPagar(null)}>
          <div style={{ background: "#111", borderRadius: 8, padding: "1rem 1.25rem", marginBottom: "1.25rem" }}>
            <div style={{ fontSize: ".72rem", color: "#555", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Cliente</div>
            <div style={{ fontSize: "1rem", color: "#e0e0e0", fontWeight: 600 }}>{clientes.find(c => c.id === modalPagar.cliente_id)?.nome}</div>
            {modalPagar.descricao && <div style={{ fontSize: ".82rem", color: "#666", marginTop: 3 }}>{modalPagar.descricao}</div>}
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#c9a84c", fontFamily: "'DM Mono',monospace", marginTop: 8 }}>{fmt(modalPagar.valor)}</div>
          </div>
          <Field label="Forma de Pagamento Recebida">
            <div style={{ display: "flex", gap: 6 }}>
              {FORMAS.map(f => (
                <button key={f} onClick={() => setPagarForm({ ...pagarForm, forma: f })}
                  style={{ flex: 1, padding: "7px 0", borderRadius: 6, border: `1px solid ${pagarForm.forma === f ? FORMA_COR[f] : "#333"}`, cursor: "pointer",
                    background: pagarForm.forma === f ? FORMA_COR[f] + "22" : "transparent",
                    color: pagarForm.forma === f ? FORMA_COR[f] : "#666",
                    fontSize: ".78rem", fontWeight: pagarForm.forma === f ? 700 : 400 }}>
                  {FORMA_LABEL[f]}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Data do Recebimento">
            <input style={inp} type="date" value={pagarForm.data} onChange={e => setPagarForm({ ...pagarForm, data: e.target.value })} />
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <button style={btn("ghost")} onClick={() => setModalPagar(null)}>Cancelar</button>
            <button style={btn("primary")} onClick={confirmarPagamento} disabled={saving}>
              {saving ? <><Spinner size={14} color="#0a0a08" /> Confirmando...</> : "Confirmar Recebimento"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ContasReceber;
