import { useState } from 'react';
import { useMobile } from '../hooks/useMobile';
import { supabase } from '../lib/supabase';
import { fmt, today } from '../lib/utils';
import { inp, btn } from '../styles/shared';
import Icon from './ui/Icon';
import Modal from './ui/Modal';
import Field from './ui/Field';
import Spinner from './ui/Spinner';
import Compras from './Compras';

const TABS = [{ id: "produtos", label: "Produtos" }, { id: "compras", label: "Compras" }];

const Estoque = ({ produtos, setProdutos, setMovimentos, notify, fornecedores, setContasPagar, pedidosCompra, setPedidosCompra }) => {
  const isMobile = useMobile();
  const [abaEstoque, setAbaEstoque] = useState("produtos");
  const [modalProd, setModalProd] = useState(false);
  const [modalMov, setModalMov] = useState(null);
  const [modalEdit, setModalEdit] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [form, setForm] = useState({ nome: "", categoria: "", unidade: "un", estoque: 0, custo: "", lucro: "", preco: "" });
  const [editForm, setEditForm] = useState({ nome: "", categoria: "", unidade: "un", custo: "", lucro: "", preco: "" });
  const [movForm, setMovForm] = useState({ tipo: "entrada", quantidade: "", obs: "", data: today() });

  const calcPreco = (custo, lucro) => { const c = Number(custo), l = Number(lucro); if (!c || !l || l < 0) return ""; return (c * (1 + l / 100)).toFixed(2); };
  const calcLucro = (custo, preco) => { const c = Number(custo), p = Number(preco); if (!c || !p || p <= c) return ""; return (((p - c) / c) * 100).toFixed(1); };
  const abrirEdicao = (p) => { const lucro = calcLucro(p.custo, p.preco); setEditForm({ nome: p.nome, categoria: p.categoria || "", unidade: p.unidade || "un", custo: p.custo, lucro, preco: p.preco }); setModalEdit(p); };

  const salvarEdicao = async () => {
    if (!editForm.nome || !modalEdit) return; setSaving(true);
    const { data, error } = await supabase.from("produtos").update({ nome: editForm.nome.trim(), categoria: editForm.categoria, unidade: editForm.unidade, custo: Number(editForm.custo), preco: Number(editForm.preco) }).eq("id", modalEdit.id).select().single();
    setSaving(false);
    if (error) { notify("Erro ao editar produto", "error"); return; }
    setProdutos(prev => prev.map(p => p.id === modalEdit.id ? data : p).sort((a, b) => a.nome.localeCompare(b.nome)));
    setModalEdit(null); notify("Produto atualizado!");
  };

  const salvarProduto = async () => {
    if (!form.nome) return;
    const nomeLimpo = form.nome.trim().toLowerCase();
    const jaExiste = produtos.find(p => p.nome.trim().toLowerCase() === nomeLimpo);
    if (jaExiste) { notify(`"${jaExiste.nome}" já está cadastrado.`, "error"); return; }
    setSaving(true);
    const { data, error } = await supabase.from("produtos").insert({ nome: form.nome.trim(), categoria: form.categoria, unidade: form.unidade, estoque: Number(form.estoque), custo: Number(form.custo), preco: Number(form.preco) }).select().single();
    setSaving(false);
    if (error) { notify("Erro ao salvar produto", "error"); return; }
    setProdutos(prev => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)));
    setModalProd(false); setForm({ nome: "", categoria: "", unidade: "un", estoque: 0, custo: "", preco: "" }); notify("Produto cadastrado!");
  };

  const lancarMovimento = async () => {
    const qtd = Number(movForm.quantidade); if (!qtd || qtd <= 0) return; setSaving(true);
    const prod = modalMov;
    const novoEstoque = movForm.tipo === "entrada" ? prod.estoque + qtd : Math.max(prod.estoque - qtd, 0);
    const { error: pe } = await supabase.from("produtos").update({ estoque: novoEstoque }).eq("id", prod.id);
    if (pe) { setSaving(false); notify("Erro ao atualizar estoque", "error"); return; }
    const { data: mov, error: me } = await supabase.from("movimentos").insert({ produto_id: prod.id, tipo: movForm.tipo, quantidade: qtd, obs: movForm.obs, data: movForm.data }).select().single();
    setSaving(false);
    if (me) { notify("Erro ao registrar movimento", "error"); return; }
    setProdutos(prev => prev.map(p => p.id === prod.id ? { ...p, estoque: novoEstoque } : p));
    setMovimentos(prev => [mov, ...prev]);
    setModalMov(null); setMovForm({ tipo: "entrada", quantidade: "", obs: "", data: today() }); notify("Movimento registrado!");
  };

  const excluir = async (id) => {
    if (!window.confirm("Excluir este produto?")) return;
    const { error } = await supabase.from("produtos").delete().eq("id", id);
    if (error) { notify("Erro ao excluir", "error"); return; }
    setProdutos(prev => prev.filter(p => p.id !== id)); notify("Produto excluído.");
  };

  const lista = produtos.filter(p => p.nome.toLowerCase().includes(filtro.toLowerCase()));

  return (
    <div>
      {/* Sub-abas */}
      <div style={{ display: "flex", gap: 0, marginBottom: "1.75rem", borderBottom: "1px solid #1f1f1f" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setAbaEstoque(t.id)}
            style={{ padding: "8px 20px 11px", border: "none", borderBottom: `2px solid ${abaEstoque === t.id ? "#c9a84c" : "transparent"}`, background: "transparent", cursor: "pointer", color: abaEstoque === t.id ? "#e8c97a" : "#555", fontSize: ".92rem", fontWeight: abaEstoque === t.id ? 600 : 400, transition: "all .15s", marginBottom: -1 }}>
            {t.label}
          </button>
        ))}
      </div>

      {abaEstoque === "compras" && (
        <Compras produtos={produtos} setProdutos={setProdutos} setMovimentos={setMovimentos} fornecedores={fornecedores} setContasPagar={setContasPagar} pedidosCompra={pedidosCompra} setPedidosCompra={setPedidosCompra} notify={notify} />
      )}

      {abaEstoque === "produtos" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", marginBottom: "1.5rem", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 12 : 0 }}>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.6rem", color: "#e8c97a", margin: 0 }}>Produtos</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <input placeholder="Buscar produto..." value={filtro} onChange={e => setFiltro(e.target.value)} style={{ ...inp, width: isMobile ? "100%" : 200 }} />
              <button style={btn("primary")} onClick={() => setModalProd(true)}><Icon name="plus" size={14} /> Novo Produto</button>
            </div>
          </div>
          <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 10, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".88rem", minWidth: 520 }}>
              <thead><tr style={{ background: "#111" }}>
                {["Produto", "Categoria", "Estoque", "Custo", "Preço Venda", "Ações"].map(h => (
                  <th key={h} style={{ padding: ".75rem 1rem", textAlign: "left", fontSize: ".72rem", color: "#555", textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 600 }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {lista.map(p => (
                  <tr key={p.id} style={{ borderTop: "1px solid #1f1f1f" }}>
                    <td style={{ padding: ".8rem 1rem", color: "#e0e0e0", fontWeight: 500 }}>{p.nome}</td>
                    <td style={{ padding: ".8rem 1rem" }}><span style={{ background: "#1f1f1f", color: "#888", padding: "2px 8px", borderRadius: 20, fontSize: ".75rem" }}>{p.categoria || "—"}</span></td>
                    <td style={{ padding: ".8rem 1rem" }}><span style={{ color: p.estoque < 10 ? "#e05a5a" : "#e0e0e0", fontFamily: "'DM Mono',monospace" }}>{p.estoque} {p.unidade}</span></td>
                    <td style={{ padding: ".8rem 1rem", color: "#aaa", fontFamily: "'DM Mono',monospace" }}>{fmt(p.custo)}</td>
                    <td style={{ padding: ".8rem 1rem", color: "#c9a84c", fontWeight: 600, fontFamily: "'DM Mono',monospace" }}>{fmt(p.preco)}</td>
                    <td style={{ padding: ".8rem 1rem" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => abrirEdicao(p)} style={{ ...btn("ghost"), padding: "5px 10px", fontSize: ".75rem" }}><Icon name="pencil" size={13} /></button>
                        <button onClick={() => setModalMov(p)} style={{ ...btn("ghost"), padding: "5px 10px", fontSize: ".75rem" }}><Icon name="history" size={13} /> Movimentar</button>
                        <button onClick={() => excluir(p.id)} style={{ ...btn("danger"), padding: "5px 10px", fontSize: ".75rem" }}><Icon name="trash" size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {lista.length === 0 && <tr><td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "#444" }}>Nenhum produto encontrado</td></tr>}
              </tbody>
            </table>
          </div>

          {modalProd && (
            <Modal title="Cadastrar Produto" onClose={() => setModalProd(false)}>
              <Field label="Nome do Produto"><input style={inp} value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></Field>
              <Field label="Categoria"><input style={inp} value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} /></Field>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "1rem" }}>
                <Field label="Estoque Inicial"><input style={inp} type="number" value={form.estoque} onChange={e => setForm({ ...form, estoque: e.target.value })} /></Field>
                <Field label="Unidade"><input style={inp} value={form.unidade} onChange={e => setForm({ ...form, unidade: e.target.value })} /></Field>
                <Field label="Custo (R$)"><input style={inp} type="number" step=".01" value={form.custo} onChange={e => { const custo = e.target.value; const preco = calcPreco(custo, form.lucro); setForm({ ...form, custo, preco }); }} /></Field>
                <Field label="% de Lucro">
                  <div style={{ position: "relative" }}>
                    <input style={{ ...inp, paddingRight: 28 }} type="number" step=".1" min="0" placeholder="Ex: 40" value={form.lucro}
                      onChange={e => { const lucro = e.target.value; const preco = calcPreco(form.custo, lucro); setForm({ ...form, lucro, preco }); }} />
                    <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#555", fontSize: ".8rem" }}>%</span>
                  </div>
                </Field>
              </div>
              <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 8, padding: "12px 16px", marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: ".7rem", color: "#555", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 2 }}>Preço de Venda</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 700, color: form.preco ? "#c9a84c" : "#333", fontFamily: "'DM Mono',monospace" }}>
                    {form.preco ? `R$ ${Number(form.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                  </div>
                </div>
                {form.custo && form.lucro && (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: ".7rem", color: "#555", marginBottom: 2 }}>lucro por unidade</div>
                    <div style={{ fontSize: ".95rem", fontWeight: 600, color: "#4caf82" }}>+ R$ {(Number(form.preco) - Number(form.custo)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button style={btn("ghost")} onClick={() => setModalProd(false)}>Cancelar</button>
                <button style={btn("primary")} onClick={salvarProduto} disabled={saving}>{saving ? <><Spinner size={14} color="#0a0a08" /> Salvando...</> : "Cadastrar"}</button>
              </div>
            </Modal>
          )}

          {modalMov && (
            <Modal title={`Movimentar — ${modalMov.nome}`} onClose={() => setModalMov(null)}>
              <div style={{ background: "#111", borderRadius: 8, padding: "1rem", marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#777", fontSize: ".85rem" }}>Estoque atual</span>
                <span style={{ color: "#e8c97a", fontWeight: 700, fontSize: "1.1rem" }}>{modalMov.estoque} {modalMov.unidade}</span>
              </div>
              <Field label="Tipo">
                <div style={{ display: "flex", gap: 8 }}>
                  {["entrada", "saida"].map(t => (
                    <button key={t} onClick={() => setMovForm({ ...movForm, tipo: t })}
                      style={{ ...btn(movForm.tipo === t ? "primary" : "ghost"), flex: 1, justifyContent: "center", textTransform: "capitalize" }}>
                      {t === "saida" ? "Saída" : "Entrada"}
                    </button>
                  ))}
                </div>
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "1rem" }}>
                <Field label="Quantidade"><input style={inp} type="number" value={movForm.quantidade} onChange={e => setMovForm({ ...movForm, quantidade: e.target.value })} /></Field>
                <Field label="Data"><input style={inp} type="date" value={movForm.data} onChange={e => setMovForm({ ...movForm, data: e.target.value })} /></Field>
              </div>
              <Field label="Observação"><input style={inp} value={movForm.obs} onChange={e => setMovForm({ ...movForm, obs: e.target.value })} /></Field>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                <button style={btn("ghost")} onClick={() => setModalMov(null)}>Cancelar</button>
                <button style={btn("primary")} onClick={lancarMovimento} disabled={saving}>{saving ? <><Spinner size={14} color="#0a0a08" /> Salvando...</> : "Confirmar"}</button>
              </div>
            </Modal>
          )}

          {modalEdit && (
            <Modal title={`Editar — ${modalEdit.nome}`} onClose={() => setModalEdit(null)}>
              <div style={{ background: "#111", borderRadius: 8, padding: "10px 14px", marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#777", fontSize: ".85rem" }}>Estoque atual</span>
                <span style={{ color: "#e8c97a", fontWeight: 700 }}>{modalEdit.estoque} {modalEdit.unidade}</span>
              </div>
              <Field label="Nome do Produto"><input style={inp} value={editForm.nome} onChange={e => setEditForm({ ...editForm, nome: e.target.value })} /></Field>
              <Field label="Categoria"><input style={inp} value={editForm.categoria} onChange={e => setEditForm({ ...editForm, categoria: e.target.value })} /></Field>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "1rem" }}>
                <Field label="Unidade"><input style={inp} value={editForm.unidade} onChange={e => setEditForm({ ...editForm, unidade: e.target.value })} /></Field>
                <div />
                <Field label="Custo (R$)"><input style={inp} type="number" step=".01" value={editForm.custo} onChange={e => { const custo = e.target.value; const preco = calcPreco(custo, editForm.lucro); setEditForm({ ...editForm, custo, preco }); }} /></Field>
                <Field label="% de Lucro">
                  <div style={{ position: "relative" }}>
                    <input style={{ ...inp, paddingRight: 28 }} type="number" step=".1" min="0" value={editForm.lucro}
                      onChange={e => { const lucro = e.target.value; const preco = calcPreco(editForm.custo, lucro); setEditForm({ ...editForm, lucro, preco }); }} />
                    <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#555", fontSize: ".8rem" }}>%</span>
                  </div>
                </Field>
              </div>
              <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 8, padding: "12px 16px", marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: ".7rem", color: "#555", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 2 }}>Preço de Venda</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 700, color: editForm.preco ? "#c9a84c" : "#333", fontFamily: "'DM Mono',monospace" }}>
                    {editForm.preco ? `R$ ${Number(editForm.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                  </div>
                </div>
                {editForm.custo && editForm.lucro && (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: ".7rem", color: "#555", marginBottom: 2 }}>lucro por unidade</div>
                    <div style={{ fontSize: ".95rem", fontWeight: 600, color: "#4caf82" }}>+ R$ {(Number(editForm.preco) - Number(editForm.custo)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                  </div>
                )}
              </div>
              <div style={{ fontSize: ".75rem", color: "#555", marginTop: 8 }}>Para alterar o estoque, use o botão Movimentar na lista.</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: "1rem" }}>
                <button style={btn("ghost")} onClick={() => setModalEdit(null)}>Cancelar</button>
                <button style={btn("primary")} onClick={salvarEdicao} disabled={saving}>{saving ? <><Spinner size={14} color="#0a0a08" /> Salvando...</> : "Salvar"}</button>
              </div>
            </Modal>
          )}
        </div>
      )}
    </div>
  );
};

export default Estoque;
