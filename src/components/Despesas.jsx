import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { fmt, today } from '../lib/utils';
import Icon from './ui/Icon';
import Modal from './ui/Modal';
import Field from './ui/Field';
import { inp, btn } from '../styles/shared';

const CATEGORIAS = [
  { id: "anuncios", label: "Anúncios" },
  { id: "marketing", label: "Marketing" },
  { id: "frete", label: "Frete" },
  { id: "outros", label: "Outros" },
];

const CAT_COLOR = {
  anuncios: "#6b9fd4",
  marketing: "#c9a84c",
  frete: "#4caf82",
  outros: "#888",
};

const vazio = () => ({ descricao: "", categoria: "anuncios", valor: "", data: today(), observacao: "" });

const Despesas = ({ despesas, setDespesas, notify }) => {
  const [modal, setModal] = useState(false);
  const [modalEditar, setModalEditar] = useState(null);
  const [form, setForm] = useState(vazio());
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const total = despesas.reduce((a, d) => a + Number(d.valor), 0);

  const salvar = async () => {
    if (!form.descricao.trim() || !form.valor || !form.data)
      return notify("Preencha descrição, valor e data.", "error");
    setSaving(true);
    const { data, error } = await supabase.from("despesas").insert([{
      descricao: form.descricao.trim(),
      categoria: form.categoria,
      valor: Number(form.valor),
      data: form.data,
      observacao: form.observacao.trim() || null,
    }]).select().single();
    setSaving(false);
    if (error) return notify("Erro ao salvar despesa.", "error");
    setDespesas(prev => [data, ...prev]);
    setModal(false);
    setForm(vazio());
    notify("Despesa lançada.");
  };

  const abrirEditar = (d) => {
    setEditForm({ descricao: d.descricao, categoria: d.categoria, valor: String(d.valor), data: d.data, observacao: d.observacao || "" });
    setModalEditar(d);
  };

  const salvarEdicao = async () => {
    if (!editForm.descricao.trim() || !editForm.valor || !editForm.data)
      return notify("Preencha descrição, valor e data.", "error");
    setSaving(true);
    const { data, error } = await supabase.from("despesas").update({
      descricao: editForm.descricao.trim(),
      categoria: editForm.categoria,
      valor: Number(editForm.valor),
      data: editForm.data,
      observacao: editForm.observacao.trim() || null,
    }).eq("id", modalEditar.id).select().single();
    setSaving(false);
    if (error) return notify("Erro ao salvar.", "error");
    setDespesas(prev => prev.map(d => d.id === modalEditar.id ? data : d));
    setModalEditar(null);
    notify("Despesa atualizada.");
  };

  const excluir = async (id) => {
    const { error } = await supabase.from("despesas").delete().eq("id", id);
    if (error) return notify("Erro ao excluir.", "error");
    setDespesas(prev => prev.filter(d => d.id !== id));
    notify("Despesa removida.");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: ".7rem", color: "#555", textTransform: "uppercase", letterSpacing: ".06em" }}>Total lançado</div>
          <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#e05a5a", fontFamily: "'DM Mono',monospace", lineHeight: 1.2 }}>{fmt(total)}</div>
        </div>
        <button onClick={() => { setForm(vazio()); setModal(true); }} style={btn("primary")}>
          + Nova Despesa
        </button>
      </div>

      <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 10, overflow: "hidden" }}>
        {despesas.length === 0 && (
          <div style={{ padding: "2rem", textAlign: "center", color: "#555", fontSize: ".85rem" }}>
            Nenhuma despesa lançada
          </div>
        )}
        {despesas.map(d => (
          <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: ".9rem 1.25rem", borderBottom: "1px solid #1a1a1a" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: CAT_COLOR[d.categoria] || "#888", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: ".9rem", color: "#ddd" }}>{d.descricao}</div>
              <div style={{ fontSize: ".75rem", color: "#555" }}>
                {CATEGORIAS.find(c => c.id === d.categoria)?.label ?? d.categoria} · {d.data}
                {d.observacao ? ` · ${d.observacao}` : ""}
              </div>
            </div>
            <div style={{ fontSize: ".9rem", fontWeight: 600, color: "#e05a5a", fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>
              {fmt(Number(d.valor))}
            </div>
            <button onClick={() => abrirEditar(d)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b9fd4", padding: 4, display: "flex" }}>
              <Icon name="pencil" size={14} />
            </button>
            <button onClick={() => excluir(d.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#444", padding: 4, display: "flex" }}>
              <Icon name="trash" size={14} />
            </button>
          </div>
        ))}
      </div>

      {modalEditar && (
        <Modal title="Editar Despesa" onClose={() => setModalEditar(null)}>
          <Field label="Descrição *">
            <input style={inp} value={editForm.descricao} onChange={e => setEditForm(p => ({ ...p, descricao: e.target.value }))} autoFocus />
          </Field>
          <Field label="Categoria *">
            <select style={inp} value={editForm.categoria} onChange={e => setEditForm(p => ({ ...p, categoria: e.target.value }))}>
              {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Valor (R$) *">
              <input style={inp} type="number" min="0" step="0.01" value={editForm.valor} onChange={e => setEditForm(p => ({ ...p, valor: e.target.value }))} />
            </Field>
            <Field label="Data *">
              <input style={inp} type="date" value={editForm.data} onChange={e => setEditForm(p => ({ ...p, data: e.target.value }))} />
            </Field>
          </div>
          <Field label="Observação">
            <input style={inp} value={editForm.observacao} onChange={e => setEditForm(p => ({ ...p, observacao: e.target.value }))} />
          </Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <button onClick={() => setModalEditar(null)} style={btn("ghost")}>Cancelar</button>
            <button onClick={salvarEdicao} disabled={saving} style={btn("primary")}>{saving ? "Salvando..." : "Salvar Alterações"}</button>
          </div>
        </Modal>
      )}

      {modal && (
        <Modal title="Nova Despesa" onClose={() => setModal(false)}>
          <Field label="Descrição *">
            <input style={inp} value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Ex: Google Ads — Maio" autoFocus />
          </Field>
          <Field label="Categoria *">
            <select style={inp} value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}>
              {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Valor (R$) *">
              <input style={inp} type="number" min="0" step="0.01" value={form.valor} onChange={e => setForm(p => ({ ...p, valor: e.target.value }))} placeholder="0,00" />
            </Field>
            <Field label="Data *">
              <input style={inp} type="date" value={form.data} onChange={e => setForm(p => ({ ...p, data: e.target.value }))} />
            </Field>
          </div>
          <Field label="Observação">
            <input style={inp} value={form.observacao} onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))} placeholder="Opcional" />
          </Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <button onClick={() => setModal(false)} style={btn("ghost")}>Cancelar</button>
            <button onClick={salvar} disabled={saving} style={btn("primary")}>{saving ? "Salvando..." : "Lançar"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Despesas;
