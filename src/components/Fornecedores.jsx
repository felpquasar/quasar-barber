import { useState } from 'react';
import { useMobile } from '../hooks/useMobile';
import { supabase } from '../lib/supabase';
import { fmt } from '../lib/utils';
import { inp, btn } from '../styles/shared';
import Icon from './ui/Icon';
import Modal from './ui/Modal';
import Field from './ui/Field';
import Spinner from './ui/Spinner';
import Confirm from './ui/Confirm';

const Fornecedores = ({ fornecedores, setFornecedores, contasPagar, notify }) => {
  const isMobile = useMobile();
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [form, setForm] = useState({ nome: "", contato: "", telefone: "", cidade: "", obs: "" });
  const [confirmState, setConfirmState] = useState(null);

  const abrir = (f = null) => {
    setEditando(f);
    setForm(f ? { nome: f.nome, contato: f.contato || "", telefone: f.telefone || "", cidade: f.cidade || "", obs: f.obs || "" } : { nome: "", contato: "", telefone: "", cidade: "", obs: "" });
    setModal(true);
  };

  const salvar = async () => {
    if (!form.nome) { notify("Nome é obrigatório.", "error"); return; }
    setSaving(true);
    try {
      if (editando) {
        const { data, error } = await supabase.from("fornecedores").update({ nome: form.nome, contato: form.contato, telefone: form.telefone, cidade: form.cidade, obs: form.obs }).eq("id", editando.id).select().single();
        if (error) { console.error("fornecedores update:", error); notify(`Erro ao salvar: ${error.message}`, "error"); return; }
        setFornecedores(prev => prev.map(f => f.id === editando.id ? data : f));
      } else {
        const { data, error } = await supabase.from("fornecedores").insert({ nome: form.nome, contato: form.contato, telefone: form.telefone, cidade: form.cidade, obs: form.obs }).select().single();
        if (error) { console.error("fornecedores insert:", error); notify(`Erro ao salvar: ${error.message}`, "error"); return; }
        setFornecedores(prev => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)));
      }
      setModal(false);
      notify(editando ? "Fornecedor atualizado." : "Fornecedor cadastrado.");
    } finally { setSaving(false); }
  };

  const excluir = (id) => {
    setConfirmState({ msg: "Excluir este fornecedor?", onConfirm: async () => {
      const { error } = await supabase.from("fornecedores").delete().eq("id", id);
      if (error) { console.error("fornecedores delete:", error); notify(`Erro ao excluir: ${error.message}`, "error"); return; }
      setFornecedores(prev => prev.filter(f => f.id !== id));
      notify("Fornecedor excluído.");
    }});
  };

  const totalPendente = (fid) =>
    contasPagar
      .filter(cp => cp.fornecedor_id === fid && cp.status !== "pago")
      .reduce((a, c) => a + Number(c.valor), 0);

  const lista = fornecedores.filter(f => f.nome.toLowerCase().includes(filtro.toLowerCase()));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", marginBottom: "1.5rem", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 12 : 0 }}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.6rem", color: "#c9a84c", margin: 0 }}>Fornecedores</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <input placeholder="Buscar fornecedor..." value={filtro} onChange={e => setFiltro(e.target.value)} style={{ ...inp, width: isMobile ? "100%" : 200 }} />
          <button style={btn("primary")} onClick={() => abrir()}><Icon name="plus" size={14} /> Novo Fornecedor</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
        {lista.map(f => {
          const pendente = totalPendente(f.id);
          return (
            <div key={f.id} style={{ background: "#141414", border: "1px solid #1f1f1f", borderRadius: 10, padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: ".75rem" }}>
                <span style={{ fontWeight: 600, color: "#e0e0e0", fontSize: "1rem" }}>{f.nome}</span>
                <span style={{ color: "#333" }}><Icon name="truck" size={16} /></span>
              </div>
              <div style={{ fontSize: ".82rem", color: "#888", lineHeight: 1.8 }}>
                {f.contato && <div>👤 {f.contato}</div>}
                {f.telefone && <div>📞 {f.telefone}</div>}
                {f.cidade && <div>📍 {f.cidade}</div>}
              </div>
              {pendente > 0 && (
                <div style={{ marginTop: 10, padding: "8px 10px", background: "#1a1000", border: "1px solid #e8a02033", borderRadius: 8 }}>
                  <div style={{ fontSize: ".7rem", color: "#888", textTransform: "uppercase", letterSpacing: ".05em" }}>A Pagar</div>
                  <div style={{ fontSize: ".95rem", fontWeight: 700, color: "#e8a020", fontFamily: "'DM Mono',monospace" }}>{fmt(pendente)}</div>
                </div>
              )}
              <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                <button style={{ ...btn("ghost"), padding: "5px 10px", fontSize: ".75rem" }} onClick={() => abrir(f)}><Icon name="pencil" size={12} /> Editar</button>
                <button style={{ ...btn("danger"), padding: "5px 10px", fontSize: ".75rem" }} onClick={() => excluir(f.id)}><Icon name="trash" size={12} /></button>
              </div>
            </div>
          );
        })}
        {lista.length === 0 && (
          <div style={{ color: "#555", padding: "2rem", gridColumn: "1/-1", textAlign: "center" }}>
            {filtro ? "Nenhum fornecedor encontrado" : "Nenhum fornecedor cadastrado"}
          </div>
        )}
      </div>

      {modal && (
        <Modal title={editando ? "Editar Fornecedor" : "Novo Fornecedor"} onClose={() => setModal(false)}>
          <Field label="Nome / Razão Social *">
            <input style={inp} value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
          </Field>
          <Field label="Nome do Contato">
            <input style={inp} value={form.contato} onChange={e => setForm({ ...form, contato: e.target.value })} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "1rem" }}>
            <Field label="Telefone">
              <input style={inp} value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} />
            </Field>
            <Field label="Cidade">
              <input style={inp} value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} />
            </Field>
          </div>
          <Field label="Observação">
            <input style={inp} value={form.obs} onChange={e => setForm({ ...form, obs: e.target.value })} />
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <button style={btn("ghost")} onClick={() => setModal(false)}>Cancelar</button>
            <button style={btn("primary")} onClick={salvar} disabled={saving}>
              {saving ? <><Spinner size={14} color="#0a0a08" /> Salvando...</> : "Salvar"}
            </button>
          </div>
        </Modal>
      )}
      {confirmState && <Confirm msg={confirmState.msg} danger={confirmState.danger !== false} onConfirm={() => { confirmState.onConfirm(); setConfirmState(null); }} onCancel={() => setConfirmState(null)} />}
    </div>
  );
};

export default Fornecedores;

