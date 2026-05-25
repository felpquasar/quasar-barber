import { useState, useMemo } from 'react';
import EmptyState from './ui/EmptyState';
import { useMobile } from '../hooks/useMobile';
import { supabase } from '../lib/supabase';
import { fmt, today } from '../lib/utils';
import { inp, btn } from '../styles/shared';
import Icon from './ui/Icon';
import Modal from './ui/Modal';
import Field from './ui/Field';
import Spinner from './ui/Spinner';

const FORMAS = ["a_vista", "cartao", "pix", "transferencia"];
const FORMA_LABEL = { a_vista: "À Vista", cartao: "Cartão", pix: "Pix", transferencia: "Transferência" };
const FORMA_COR = { a_vista: "#4caf82", cartao: "#6b9fd4", pix: "#5cb8d4", transferencia: "#b86fcf" };

const CATEGORIAS = ["estoque", "aluguel", "servicos", "impostos", "outros"];
const CAT_LABEL = { estoque: "Estoque", aluguel: "Aluguel", servicos: "Serviços", impostos: "Impostos", outros: "Outros" };
const CAT_COR = { estoque: "#ffbf00", aluguel: "#6b9fd4", servicos: "#5cb8d4", impostos: "#e05a5a", outros: "#888" };

const STATUS_COR = { pago: "#4caf82", pendente: "#e8a020", vencido: "#e05a5a" };
const STATUS_LABEL = { pago: "Pago", pendente: "Pendente", vencido: "Vencido" };

const statusReal = (cp) => {
  if (cp.status === "pago") return "pago";
  if (cp.data_vencimento < today()) return "vencido";
  return "pendente";
};

const diasAtraso = (vencimento) =>
  Math.floor((new Date(today() + "T12:00:00") - new Date(vencimento + "T12:00:00")) / 86400000);

const ContasPagar = ({ contasPagar, setContasPagar, fornecedores, notify }) => {
  const isMobile = useMobile();
  const [filtro, setFiltro] = useState("todos");
  const [modalNova, setModalNova] = useState(false);
  const [modalPagar, setModalPagar] = useState(null);
  const [modalEditar, setModalEditar] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fornecedorId: "", descricao: "", categoria: "outros", valor: "", forma: "a_vista", vencimento: today(), obs: "" });
  const [pagarForm, setPagarForm] = useState({ forma: "a_vista", data: today() });
  const [editForm, setEditForm] = useState({});
  const [ordenarPor, setOrdenarPor] = useState("vencimento");
  const [ordenarDir, setOrdenarDir] = useState("asc");

  const toggleOrdem = (col) => {
    if (ordenarPor === col) setOrdenarDir(d => d === "asc" ? "desc" : "asc");
    else { setOrdenarPor(col); setOrdenarDir("asc"); }
  };

  const lista = useMemo(() => {
    return contasPagar
      .map(cp => ({ ...cp, _status: statusReal(cp) }))
      .filter(cp => filtro === "todos" || cp._status === filtro)
      .sort((a, b) => {
        let va, vb;
        if (ordenarPor === "vencimento") {
          if (a._status === "vencido" && b._status !== "vencido") return ordenarDir === "asc" ? -1 : 1;
          if (b._status === "vencido" && a._status !== "vencido") return ordenarDir === "asc" ? 1 : -1;
          return ordenarDir === "asc" ? a.data_vencimento.localeCompare(b.data_vencimento) : b.data_vencimento.localeCompare(a.data_vencimento);
        }
        if (ordenarPor === "descricao") { va = (a.descricao || "").toLowerCase(); vb = (b.descricao || "").toLowerCase(); }
        else if (ordenarPor === "categoria") { va = a.categoria || ""; vb = b.categoria || ""; }
        else if (ordenarPor === "fornecedor") { va = (fornecedores.find(f => f.id === a.fornecedor_id)?.nome || "").toLowerCase(); vb = (fornecedores.find(f => f.id === b.fornecedor_id)?.nome || "").toLowerCase(); }
        else if (ordenarPor === "valor") { va = Number(a.valor); vb = Number(b.valor); }
        else if (ordenarPor === "status") { va = a._status; vb = b._status; }
        if (va < vb) return ordenarDir === "asc" ? -1 : 1;
        if (va > vb) return ordenarDir === "asc" ? 1 : -1;
        return 0;
      });
  }, [contasPagar, fornecedores, filtro, ordenarPor, ordenarDir]);

  const totais = useMemo(() => {
    const m = contasPagar.map(cp => ({ ...cp, _status: statusReal(cp) }));
    return {
      pendente: m.filter(cp => cp._status === "pendente").reduce((a, c) => a + Number(c.valor), 0),
      vencido: m.filter(cp => cp._status === "vencido").reduce((a, c) => a + Number(c.valor), 0),
      pago: m.filter(cp => cp._status === "pago").reduce((a, c) => a + Number(c.valor), 0),
      qtdVencido: m.filter(cp => cp._status === "vencido").length,
    };
  }, [contasPagar]);

  const salvarNova = async () => {
    if (!form.descricao || !form.valor || !form.vencimento) { notify("Preencha todos os campos obrigatórios.", "error"); return; }
    setSaving(true);
    try {
      const { data, error } = await supabase.from("contas_pagar").insert({
        fornecedor_id: form.fornecedorId ? Number(form.fornecedorId) : null,
        descricao: form.descricao,
        categoria: form.categoria,
        valor: Number(form.valor),
        forma_pagamento: form.forma,
        data_emissao: today(),
        data_vencimento: form.vencimento,
        status: "pendente",
        obs: form.obs,
      }).select().single();
      if (error) { console.error("contas_pagar insert:", error); notify(`Erro ao salvar conta: ${error.message}`, "error"); return; }
      setContasPagar(prev => [...prev, data].sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento)));
      setModalNova(false);
      setForm({ fornecedorId: "", descricao: "", categoria: "outros", valor: "", forma: "a_vista", vencimento: today(), obs: "" });
      notify("Conta a pagar lançada!");
    } finally { setSaving(false); }
  };

  const confirmarPagamento = async () => {
    if (!modalPagar) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from("contas_pagar")
        .update({ status: "pago", data_pagamento: pagarForm.data, forma_pagamento: pagarForm.forma })
        .eq("id", modalPagar.id).select().single();
      if (error) { console.error("contas_pagar update:", error); notify(`Erro ao registrar pagamento: ${error.message}`, "error"); return; }
      setContasPagar(prev => prev.map(cp => cp.id === modalPagar.id ? data : cp));
      setModalPagar(null);
      notify("Pagamento registrado!");
    } finally { setSaving(false); }
  };

  const abrirEditar = (cp) => {
    setEditForm({
      fornecedorId: cp.fornecedor_id ? String(cp.fornecedor_id) : "",
      descricao: cp.descricao || "",
      categoria: cp.categoria || "outros",
      valor: String(cp.valor),
      forma: cp.forma_pagamento || "a_vista",
      vencimento: cp.data_vencimento || today(),
      obs: cp.obs || "",
    });
    setModalEditar(cp);
  };

  const salvarEdicao = async () => {
    if (!editForm.descricao || !editForm.valor || !editForm.vencimento) { notify("Preencha todos os campos obrigatórios.", "error"); return; }
    setSaving(true);
    try {
      const { data, error } = await supabase.from("contas_pagar").update({
        fornecedor_id: editForm.fornecedorId ? Number(editForm.fornecedorId) : null,
        descricao: editForm.descricao,
        categoria: editForm.categoria,
        valor: Number(editForm.valor),
        forma_pagamento: editForm.forma,
        data_vencimento: editForm.vencimento,
        obs: editForm.obs,
      }).eq("id", modalEditar.id).select().single();
      if (error) { notify(`Erro ao salvar: ${error.message}`, "error"); return; }
      setContasPagar(prev => prev.map(cp => cp.id === modalEditar.id ? data : cp));
      setModalEditar(null);
      notify("Conta atualizada!");
    } finally { setSaving(false); }
  };

  const excluir = async (id) => {
    if (!window.confirm("Excluir esta conta?")) return;
    const { error } = await supabase.from("contas_pagar").delete().eq("id", id);
    if (error) { console.error("contas_pagar delete:", error); notify(`Erro ao excluir: ${error.message}`, "error"); return; }
    setContasPagar(prev => prev.filter(cp => cp.id !== id));
    notify("Conta removida.");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", marginBottom: "1.5rem", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 12 : 0 }}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.6rem", color: "#c9a84c", margin: 0 }}>Contas a Pagar</h2>
        <button style={btn("primary")} onClick={() => setModalNova(true)}><Icon name="plus" size={14} /> Nova Conta</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: "1.5rem" }}>
        {[
          { label: "A Pagar", valor: totais.pendente, cor: "#e8a020" },
          { label: "Em Atraso", valor: totais.vencido, cor: "#e05a5a" },
          { label: "Pago", valor: totais.pago, cor: "#4caf82" },
        ].map((s, i) => (
          <div key={i} style={{ background: "#161616", border: `1px solid ${s.cor}33`, borderRadius: 10, padding: "1.1rem 1.25rem" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: s.cor, fontFamily: "'DM Mono',monospace", lineHeight: 1 }}>{fmt(s.valor)}</div>
            <div style={{ fontSize: ".72rem", color: "#666", marginTop: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {totais.qtdVencido > 0 && (
        <div style={{ background: "#1f0d0d", border: "1px solid #5a1a1a", borderRadius: 8, padding: ".75rem 1rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: 10, color: "#e05a5a" }}>
          <Icon name="warn" size={18} />
          <span style={{ fontSize: ".9rem" }}>
            <b>{totais.qtdVencido} conta{totais.qtdVencido > 1 ? "s" : ""} em atraso</b>
            {" · "}Total: <b>{fmt(totais.vencido)}</b>
          </span>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: "1rem", flexWrap: "wrap" }}>
        {["todos", "pendente", "vencido", "pago"].map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            style={{ padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: ".8rem",
              background: filtro === f
                ? (f === "vencido" ? "#e05a5a" : f === "pago" ? "#4caf82" : f === "pendente" ? "#e8a020" : "#ffbf00")
                : "#1a1a1a",
              color: filtro === f ? "#0a0a08" : "#888",
              fontWeight: filtro === f ? 700 : 400 }}>
            {f === "todos" ? "Todos" : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 10, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".88rem", minWidth: 580 }}>
          <thead>
            <tr style={{ background: "#111" }}>
              {[
                { label: "Descrição", col: "descricao" },
                { label: "Categoria", col: "categoria" },
                { label: "Fornecedor", col: "fornecedor" },
                { label: "Vencimento", col: "vencimento" },
                { label: "Valor", col: "valor" },
                { label: "Status", col: "status" },
                { label: "Ações", col: null },
              ].map(({ label, col }) => (
                <th key={label} onClick={col ? () => toggleOrdem(col) : undefined}
                  style={{ padding: ".75rem 1rem", textAlign: "left", fontSize: ".72rem", color: col ? (ordenarPor === col ? "#c9a84c" : "#555") : "#555", textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 600, cursor: col ? "pointer" : "default", userSelect: "none", whiteSpace: "nowrap" }}>
                  {label}{col && ordenarPor === col ? (ordenarDir === "asc" ? " ↑" : " ↓") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.map(cp => {
              const forn = fornecedores.find(f => f.id === cp.fornecedor_id);
              const atraso = cp._status === "vencido" ? diasAtraso(cp.data_vencimento) : 0;
              return (
                <tr key={cp.id} style={{ borderTop: "1px solid #1f1f1f", background: cp._status === "vencido" ? "#1a0a0a" : "transparent" }}>
                  <td style={{ padding: ".8rem 1rem", color: "#e0e0e0", fontWeight: 500, maxWidth: 200 }}>
                    <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cp.descricao}</div>
                    {cp.obs && <div style={{ fontSize: ".7rem", color: "#555", marginTop: 2 }}>{cp.obs}</div>}
                  </td>
                  <td style={{ padding: ".8rem 1rem" }}>
                    <span style={{ fontSize: ".75rem", padding: "2px 8px", borderRadius: 20, background: (CAT_COR[cp.categoria] || "#888") + "22", color: CAT_COR[cp.categoria] || "#888" }}>
                      {CAT_LABEL[cp.categoria] || cp.categoria}
                    </span>
                  </td>
                  <td style={{ padding: ".8rem 1rem", color: "#888", fontSize: ".85rem" }}>{forn?.nome ?? "—"}</td>
                  <td style={{ padding: ".8rem 1rem" }}>
                    <div style={{ color: cp._status === "vencido" ? "#e05a5a" : "#aaa", fontFamily: "'DM Mono',monospace", fontSize: ".85rem" }}>{cp.data_vencimento}</div>
                    {atraso > 0 && <div style={{ fontSize: ".7rem", color: "#e05a5a", marginTop: 2 }}>{atraso} dia{atraso > 1 ? "s" : ""} atraso</div>}
                    {cp._status === "pago" && cp.data_pagamento && <div style={{ fontSize: ".7rem", color: "#4caf82", marginTop: 2 }}>Pago em {cp.data_pagamento}</div>}
                  </td>
                  <td style={{ padding: ".8rem 1rem", color: "#ffbf00", fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>{fmt(cp.valor)}</td>
                  <td style={{ padding: ".8rem 1rem" }}>
                    <span style={{ fontSize: ".75rem", padding: "3px 10px", borderRadius: 20, background: STATUS_COR[cp._status] + "22", color: STATUS_COR[cp._status] }}>
                      {STATUS_LABEL[cp._status]}
                    </span>
                  </td>
                  <td style={{ padding: ".8rem 1rem" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {cp._status !== "pago" && (
                        <>
                          <button
                            onClick={() => { setModalPagar(cp); setPagarForm({ forma: cp.forma_pagamento || "a_vista", data: today() }); }}
                            style={{ padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", background: "#4caf8222", color: "#4caf82", fontSize: ".75rem", display: "flex", alignItems: "center", gap: 4 }}>
                            <Icon name="check" size={13} /> Pagar
                          </button>
                          <button
                            onClick={() => abrirEditar(cp)}
                            style={{ padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", background: "#6b9fd422", color: "#6b9fd4", fontSize: ".75rem", display: "flex", alignItems: "center", gap: 4 }}>
                            <Icon name="pencil" size={13} /> Editar
                          </button>
                        </>
                      )}
                      <button onClick={() => excluir(cp.id)} style={{ ...btn("danger"), padding: "4px 10px", fontSize: ".75rem" }}>
                        <Icon name="trash" size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {lista.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 0 }}>
                  <EmptyState iconName="truck" title={filtro === "todos" ? "Nenhuma conta a pagar" : `Nenhuma conta ${STATUS_LABEL[filtro]?.toLowerCase()}`} subtitle="Contas de compras e despesas aparecem aqui" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalNova && (
        <Modal title="Nova Conta a Pagar" onClose={() => setModalNova(false)}>
          <Field label="Descrição *">
            <input style={inp} value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Nota fiscal fornecedor" />
          </Field>
          <Field label="Categoria">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {CATEGORIAS.map(c => (
                <button key={c} onClick={() => setForm({ ...form, categoria: c })}
                  style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${form.categoria === c ? CAT_COR[c] : "#333"}`, cursor: "pointer",
                    background: form.categoria === c ? CAT_COR[c] + "22" : "transparent",
                    color: form.categoria === c ? CAT_COR[c] : "#666",
                    fontSize: ".78rem", fontWeight: form.categoria === c ? 700 : 400 }}>
                  {CAT_LABEL[c]}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Fornecedor">
            <select style={inp} value={form.fornecedorId} onChange={e => setForm({ ...form, fornecedorId: e.target.value })}>
              <option value="">Sem fornecedor</option>
              {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "1rem" }}>
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
              {saving ? <><Spinner size={14} color="#0a0a08" /> Salvando...</> : "Lançar Conta"}
            </button>
          </div>
        </Modal>
      )}

      {modalEditar && (
        <Modal title="Editar Conta a Pagar" onClose={() => setModalEditar(null)}>
          <Field label="Descrição *">
            <input style={inp} value={editForm.descricao} onChange={e => setEditForm({ ...editForm, descricao: e.target.value })} autoFocus />
          </Field>
          <Field label="Categoria">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {CATEGORIAS.map(c => (
                <button key={c} onClick={() => setEditForm({ ...editForm, categoria: c })}
                  style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${editForm.categoria === c ? CAT_COR[c] : "#333"}`, cursor: "pointer",
                    background: editForm.categoria === c ? CAT_COR[c] + "22" : "transparent",
                    color: editForm.categoria === c ? CAT_COR[c] : "#666",
                    fontSize: ".78rem", fontWeight: editForm.categoria === c ? 700 : 400 }}>
                  {CAT_LABEL[c]}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Fornecedor">
            <select style={inp} value={editForm.fornecedorId} onChange={e => setEditForm({ ...editForm, fornecedorId: e.target.value })}>
              <option value="">Sem fornecedor</option>
              {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "1rem" }}>
            <Field label="Valor (R$) *">
              <input style={inp} type="number" step=".01" min="0" value={editForm.valor} onChange={e => setEditForm({ ...editForm, valor: e.target.value })} />
            </Field>
            <Field label="Vencimento *">
              <input style={inp} type="date" value={editForm.vencimento} onChange={e => setEditForm({ ...editForm, vencimento: e.target.value })} />
            </Field>
          </div>
          <Field label="Forma de Pagamento">
            <div style={{ display: "flex", gap: 6 }}>
              {FORMAS.map(f => (
                <button key={f} onClick={() => setEditForm({ ...editForm, forma: f })}
                  style={{ flex: 1, padding: "7px 0", borderRadius: 6, border: `1px solid ${editForm.forma === f ? FORMA_COR[f] : "#333"}`, cursor: "pointer",
                    background: editForm.forma === f ? FORMA_COR[f] + "22" : "transparent",
                    color: editForm.forma === f ? FORMA_COR[f] : "#666",
                    fontSize: ".78rem", fontWeight: editForm.forma === f ? 700 : 400 }}>
                  {FORMA_LABEL[f]}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Observação">
            <input style={inp} value={editForm.obs} onChange={e => setEditForm({ ...editForm, obs: e.target.value })} />
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <button style={btn("ghost")} onClick={() => setModalEditar(null)}>Cancelar</button>
            <button style={btn("primary")} onClick={salvarEdicao} disabled={saving}>
              {saving ? <><Spinner size={14} color="#0a0a08" /> Salvando...</> : "Salvar Alterações"}
            </button>
          </div>
        </Modal>
      )}

      {modalPagar && (
        <Modal title="Registrar Pagamento" onClose={() => setModalPagar(null)}>
          <div style={{ background: "#111", borderRadius: 8, padding: "1rem 1.25rem", marginBottom: "1.25rem" }}>
            <div style={{ fontSize: ".72rem", color: "#555", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Conta</div>
            <div style={{ fontSize: "1rem", color: "#e0e0e0", fontWeight: 600 }}>{modalPagar.descricao}</div>
            {fornecedores.find(f => f.id === modalPagar.fornecedor_id) && (
              <div style={{ fontSize: ".82rem", color: "#666", marginTop: 3 }}>{fornecedores.find(f => f.id === modalPagar.fornecedor_id).nome}</div>
            )}
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#ffbf00", fontFamily: "'DM Mono',monospace", marginTop: 8 }}>{fmt(modalPagar.valor)}</div>
          </div>
          <Field label="Forma de Pagamento">
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
          <Field label="Data do Pagamento">
            <input style={inp} type="date" value={pagarForm.data} onChange={e => setPagarForm({ ...pagarForm, data: e.target.value })} />
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <button style={btn("ghost")} onClick={() => setModalPagar(null)}>Cancelar</button>
            <button style={btn("primary")} onClick={confirmarPagamento} disabled={saving}>
              {saving ? <><Spinner size={14} color="#0a0a08" /> Confirmando...</> : "Confirmar Pagamento"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ContasPagar;
