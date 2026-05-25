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

const STATUS_COR = { pendente: "#e8a020", recebido: "#4caf82", cancelado: "#555" };
const STATUS_LABEL = { pendente: "Pendente", recebido: "Recebido", cancelado: "Cancelado" };
const FORMA_LABEL = { a_vista: "À Vista", cartao: "Cartão", pix: "Pix", transferencia: "Transferência" };

const ITEM_VAZIO = { produto_id: "", quantidade: "", custo_unitario: "" };

const Compras = ({ produtos, setProdutos, setMovimentos, fornecedores, setContasPagar, pedidosCompra, setPedidosCompra, notify }) => {
  const isMobile = useMobile();
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [modalNovo, setModalNovo] = useState(false);
  const [modalVer, setModalVer] = useState(null);
  const [modalReceber, setModalReceber] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fornecedor_id: "", data_pedido: today(), data_prevista: "", obs: "", itens: [{ ...ITEM_VAZIO }] });
  const [receberForm, setReceberForm] = useState({ data_recebimento: today(), gerar_conta: false, forma_pagamento: "a_vista", data_vencimento: today() });

  const [ordenarPor, setOrdenarPor] = useState("data_pedido");
  const [ordenarDir, setOrdenarDir] = useState("desc");

  const toggleOrdem = (col) => {
    if (ordenarPor === col) setOrdenarDir(d => d === "asc" ? "desc" : "asc");
    else { setOrdenarPor(col); setOrdenarDir("asc"); }
  };

  const nomeForn = id => fornecedores.find(f => f.id === id)?.nome ?? "—";
  const nomeProd = id => produtos.find(p => p.id === id)?.nome ?? "—";

  const lista = useMemo(() => {
    const base = filtroStatus === "todos" ? pedidosCompra : pedidosCompra.filter(p => p.status === filtroStatus);
    return [...base].sort((a, b) => {
      let va, vb;
      if (ordenarPor === "data_pedido") { va = a.data_pedido; vb = b.data_pedido; }
      else if (ordenarPor === "fornecedor") { va = nomeForn(a.fornecedor_id).toLowerCase(); vb = nomeForn(b.fornecedor_id).toLowerCase(); }
      else if (ordenarPor === "total") { va = Number(a.total); vb = Number(b.total); }
      else if (ordenarPor === "status") { va = a.status; vb = b.status; }
      if (va < vb) return ordenarDir === "asc" ? -1 : 1;
      if (va > vb) return ordenarDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [pedidosCompra, filtroStatus, fornecedores, ordenarPor, ordenarDir]);

  const totalForm = useMemo(() =>
    form.itens.reduce((s, it) => s + (Number(it.quantidade) || 0) * (Number(it.custo_unitario) || 0), 0)
  , [form.itens]);

  const abrirNovo = () => {
    setForm({ fornecedor_id: "", data_pedido: today(), data_prevista: "", obs: "", itens: [{ ...ITEM_VAZIO }] });
    setModalNovo(true);
  };

  const abrirReceber = (pedido) => {
    setReceberForm({ data_recebimento: today(), gerar_conta: false, forma_pagamento: "a_vista", data_vencimento: today() });
    setModalReceber(pedido);
  };

  const addItem = () => setForm(f => ({ ...f, itens: [...f.itens, { ...ITEM_VAZIO }] }));
  const removeItem = i => setForm(f => ({ ...f, itens: f.itens.filter((_, idx) => idx !== i) }));
  const updateItem = (i, field, val) => setForm(f => ({
    ...f,
    itens: f.itens.map((it, idx) => {
      if (idx !== i) return it;
      const updated = { ...it, [field]: val };
      if (field === "produto_id" && val) {
        const prod = produtos.find(p => p.id === Number(val));
        if (prod) updated.custo_unitario = String(prod.custo ?? "");
      }
      return updated;
    }),
  }));

  const salvarPedido = async () => {
    const validos = form.itens.filter(it => it.produto_id && Number(it.quantidade) > 0);
    if (!form.data_pedido) { notify("Informe a data do pedido.", "error"); return; }
    if (validos.length === 0) { notify("Adicione pelo menos um item com produto e quantidade.", "error"); return; }
    setSaving(true);
    try {
      const total = validos.reduce((s, it) => s + Number(it.quantidade) * (Number(it.custo_unitario) || 0), 0);
      const { data: pedido, error: pe } = await supabase.from("pedidos_compra").insert({
        fornecedor_id: form.fornecedor_id ? Number(form.fornecedor_id) : null,
        data_pedido: form.data_pedido,
        data_prevista: form.data_prevista || null,
        obs: form.obs || null,
        status: "pendente",
        total,
      }).select().single();
      if (pe) { notify(`Erro ao criar pedido: ${pe.message}`, "error"); return; }

      const { data: itensData, error: ie } = await supabase.from("pedido_itens").insert(
        validos.map(it => ({ pedido_id: pedido.id, produto_id: Number(it.produto_id), quantidade: Number(it.quantidade), custo_unitario: Number(it.custo_unitario) || 0 }))
      ).select();
      if (ie) { notify(`Erro ao salvar itens: ${ie.message}`, "error"); return; }

      setPedidosCompra(prev => [{ ...pedido, pedido_itens: itensData || [] }, ...prev]);
      setModalNovo(false);
      notify("Pedido criado!");
    } finally { setSaving(false); }
  };

  const cancelarPedido = async (pedido) => {
    if (!window.confirm("Cancelar este pedido de compra?")) return;
    const { error } = await supabase.from("pedidos_compra").update({ status: "cancelado" }).eq("id", pedido.id);
    if (error) { notify(`Erro: ${error.message}`, "error"); return; }
    setPedidosCompra(prev => prev.map(p => p.id === pedido.id ? { ...p, status: "cancelado" } : p));
    notify("Pedido cancelado.");
  };

  const receberPedido = async () => {
    if (!modalReceber || !receberForm.data_recebimento) { notify("Informe a data de recebimento.", "error"); return; }
    if (receberForm.gerar_conta && !receberForm.data_vencimento) { notify("Informe a data de vencimento da conta.", "error"); return; }
    setSaving(true);
    try {
      const { error: pe } = await supabase.from("pedidos_compra").update({
        status: "recebido",
        data_recebimento: receberForm.data_recebimento,
      }).eq("id", modalReceber.id);
      if (pe) { notify(`Erro: ${pe.message}`, "error"); return; }

      const itens = modalReceber.pedido_itens || [];

      // Calcula novos estoques e custo médio ponderado (CMP) por produto
      const estoqueMap = {};
      const custoMap = {};
      itens.forEach(it => {
        const prod = produtos.find(p => p.id === it.produto_id);
        if (!prod) return;
        const estoqueBase = custoMap[prod.id]?.estoqueAcum ?? prod.estoque;
        const custoBase = custoMap[prod.id]?.custo ?? prod.custo;
        const novoEstoque = estoqueBase + it.quantidade;
        estoqueMap[prod.id] = novoEstoque;
        if (it.custo_unitario) {
          const novoCusto = novoEstoque > 0
            ? (estoqueBase * custoBase + it.quantidade * it.custo_unitario) / novoEstoque
            : it.custo_unitario;
          custoMap[prod.id] = { custo: novoCusto, estoqueAcum: novoEstoque };
        }
      });

      // Atualiza produtos no banco (estoque + custo médio)
      await Promise.all(
        Object.entries(estoqueMap).map(([id, novoEstoque]) => {
          const numId = Number(id);
          const updates = { estoque: novoEstoque };
          if (custoMap[numId]) updates.custo = Number(custoMap[numId].custo.toFixed(4));
          return supabase.from("produtos").update(updates).eq("id", numId);
        })
      );

      // Insere movimentos de entrada
      const movInserts = await Promise.all(
        itens.map(it =>
          supabase.from("movimentos").insert({
            produto_id: it.produto_id,
            tipo: "entrada",
            quantidade: it.quantidade,
            obs: `Recebimento pedido #${modalReceber.id}`,
            data: receberForm.data_recebimento,
          }).select().single()
        )
      );
      const novosMovs = movInserts.map(r => r.data).filter(Boolean);

      // Atualiza estado local de produtos e movimentos
      setProdutos(prev => prev.map(p => {
        if (estoqueMap[p.id] === undefined) return p;
        return { ...p, estoque: estoqueMap[p.id], custo: custoMap[p.id]?.custo ?? p.custo };
      }));
      if (novosMovs.length > 0) setMovimentos(prev => [...novosMovs, ...prev]);

      // Cria conta a pagar se solicitado
      if (receberForm.gerar_conta && modalReceber.total > 0) {
        const { data: cp, error: ce } = await supabase.from("contas_pagar").insert({
          fornecedor_id: modalReceber.fornecedor_id || null,
          descricao: `Compra pedido #${modalReceber.id}`,
          categoria: "estoque",
          valor: modalReceber.total,
          forma_pagamento: receberForm.forma_pagamento,
          data_emissao: receberForm.data_recebimento,
          data_vencimento: receberForm.data_vencimento,
          status: "pendente",
        }).select().single();
        if (ce) notify(`Conta a pagar não criada: ${ce.message}`, "error");
        else if (cp) setContasPagar(prev => [...prev, cp].sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento)));
      }

      setPedidosCompra(prev => prev.map(p => p.id === modalReceber.id
        ? { ...p, status: "recebido", data_recebimento: receberForm.data_recebimento }
        : p
      ));
      setModalReceber(null);
      notify("Pedido recebido! Estoque e custo médio atualizados.");
    } finally { setSaving(false); }
  };

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: 10, flexDirection: isMobile ? "column" : "row" }}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.6rem", color: "#c9a84c", margin: 0 }}>Compras</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 4 }}>
            {["todos", "pendente", "recebido", "cancelado"].map(s => (
              <button key={s} onClick={() => setFiltroStatus(s)}
                style={{ ...btn(filtroStatus === s ? "primary" : "ghost"), padding: "5px 12px", fontSize: ".8rem" }}>
                {s === "todos" ? "Todos" : STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          <button style={btn("primary")} onClick={abrirNovo}><Icon name="plus" size={14} /> Novo Pedido</button>
        </div>
      </div>

      {/* Tabela de pedidos */}
      <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 10, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".88rem", minWidth: 560 }}>
          <thead>
            <tr style={{ background: "#111" }}>
              {[
                { label: "Data", col: "data_pedido" },
                { label: "Fornecedor", col: "fornecedor" },
                { label: "Itens", col: null, align: "right" },
                { label: "Total", col: "total", align: "right" },
                { label: "Data Prevista", col: null },
                { label: "Status", col: "status", align: "center" },
                { label: "Ações", col: null },
              ].map(({ label, col, align }) => (
                <th key={label} onClick={col ? () => toggleOrdem(col) : undefined}
                  style={{ padding: ".75rem 1rem", textAlign: align || "left", fontSize: ".72rem", color: col ? (ordenarPor === col ? "#c9a84c" : "#555") : "#555", textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 600, cursor: col ? "pointer" : "default", userSelect: "none", whiteSpace: "nowrap" }}>
                  {label}{col && ordenarPor === col ? (ordenarDir === "asc" ? " ↑" : " ↓") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.map(p => (
              <tr key={p.id} style={{ borderTop: "1px solid #1f1f1f" }}>
                <td style={{ padding: ".8rem 1rem", color: "#e0e0e0" }}>{p.data_pedido}</td>
                <td style={{ padding: ".8rem 1rem", color: "#aaa" }}>{nomeForn(p.fornecedor_id)}</td>
                <td style={{ padding: ".8rem 1rem", textAlign: "right", color: "#888" }}>{(p.pedido_itens || []).length}</td>
                <td style={{ padding: ".8rem 1rem", textAlign: "right", color: "#ffbf00", fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>{fmt(p.total)}</td>
                <td style={{ padding: ".8rem 1rem", color: "#666" }}>
                  {p.status === "recebido" ? (
                    <span style={{ color: "#4caf82", fontSize: ".82rem" }}>Recebido {p.data_recebimento}</span>
                  ) : (
                    p.data_prevista || <span style={{ color: "#444" }}>—</span>
                  )}
                </td>
                <td style={{ padding: ".8rem 1rem", textAlign: "center" }}>
                  <span style={{ fontSize: ".75rem", padding: "3px 10px", borderRadius: 20, background: (STATUS_COR[p.status] || "#555") + "22", color: STATUS_COR[p.status] || "#555" }}>
                    {STATUS_LABEL[p.status] || p.status}
                  </span>
                </td>
                <td style={{ padding: ".8rem 1rem" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setModalVer(p)} style={{ ...btn("ghost"), padding: "4px 10px", fontSize: ".75rem" }}>Ver</button>
                    {p.status === "pendente" && (
                      <>
                        <button onClick={() => abrirReceber(p)} style={{ ...btn("primary"), padding: "4px 10px", fontSize: ".75rem" }}>Receber</button>
                        <button onClick={() => cancelarPedido(p)} style={{ ...btn("danger"), padding: "4px 10px", fontSize: ".75rem" }}><Icon name="trash" size={12} /></button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 0 }}>
                <EmptyState iconName="truck" title={`Nenhum pedido ${filtroStatus !== "todos" ? STATUS_LABEL[filtroStatus]?.toLowerCase() : "cadastrado"}`} subtitle="Registre pedidos de compra para controlar seu estoque" />
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Novo Pedido */}
      {modalNovo && (
        <Modal title="Novo Pedido de Compra" onClose={() => setModalNovo(false)} wide>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: "1rem" }}>
            <Field label="Fornecedor">
              <select style={inp} value={form.fornecedor_id} onChange={e => setForm(f => ({ ...f, fornecedor_id: e.target.value }))}>
                <option value="">Sem fornecedor</option>
                {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </Field>
            <Field label="Data do Pedido">
              <input style={inp} type="date" value={form.data_pedido} onChange={e => setForm(f => ({ ...f, data_pedido: e.target.value }))} />
            </Field>
            <Field label="Data Prevista">
              <input style={inp} type="date" value={form.data_prevista} onChange={e => setForm(f => ({ ...f, data_prevista: e.target.value }))} />
            </Field>
          </div>
          <Field label="Observação">
            <input style={inp} value={form.obs} placeholder="Opcional" onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} />
          </Field>

          {/* Itens */}
          <div style={{ marginTop: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".75rem" }}>
              <div style={{ fontSize: ".7rem", color: "#555", textTransform: "uppercase", letterSpacing: ".06em" }}>Itens do Pedido</div>
              <button style={{ ...btn("ghost"), padding: "4px 10px", fontSize: ".78rem" }} onClick={addItem}><Icon name="plus" size={13} /> Adicionar Item</button>
            </div>
            <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 8, overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 460 }}>
                <thead>
                  <tr style={{ background: "#161616" }}>
                    {["Produto", "Qtd", "Custo Unit. (R$)", "Subtotal", ""].map((h, i) => (
                      <th key={i} style={{ padding: ".5rem .75rem", textAlign: i >= 2 && i < 4 ? "right" : "left", fontSize: ".7rem", color: "#555", textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {form.itens.map((it, i) => {
                    const sub = (Number(it.quantidade) || 0) * (Number(it.custo_unitario) || 0);
                    return (
                      <tr key={i} style={{ borderTop: "1px solid #1f1f1f" }}>
                        <td style={{ padding: ".5rem .75rem" }}>
                          <select style={{ ...inp, minWidth: 180 }} value={it.produto_id} onChange={e => updateItem(i, "produto_id", e.target.value)}>
                            <option value="">Selecione...</option>
                            {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: ".5rem .75rem" }}>
                          <input style={{ ...inp, width: 70, textAlign: "right" }} type="number" min="1" placeholder="0" value={it.quantidade} onChange={e => updateItem(i, "quantidade", e.target.value)} />
                        </td>
                        <td style={{ padding: ".5rem .75rem" }}>
                          <input style={{ ...inp, width: 110, textAlign: "right" }} type="number" step=".01" min="0" placeholder="0,00" value={it.custo_unitario} onChange={e => updateItem(i, "custo_unitario", e.target.value)} />
                        </td>
                        <td style={{ padding: ".5rem .75rem", textAlign: "right", color: "#ffbf00", fontFamily: "'DM Mono',monospace", fontSize: ".85rem", whiteSpace: "nowrap" }}>
                          {sub > 0 ? fmt(sub) : "—"}
                        </td>
                        <td style={{ padding: ".5rem .75rem", textAlign: "right" }}>
                          {form.itens.length > 1 && (
                            <button onClick={() => removeItem(i)} style={{ ...btn("danger"), padding: "3px 8px" }}><Icon name="trash" size={12} /></button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "1rem", marginTop: ".75rem", padding: "0 .75rem" }}>
              <span style={{ fontSize: ".8rem", color: "#555" }}>Total do Pedido</span>
              <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "#c9a84c", fontFamily: "'DM Mono',monospace" }}>{fmt(totalForm)}</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: "1.25rem" }}>
            <button style={btn("ghost")} onClick={() => setModalNovo(false)}>Cancelar</button>
            <button style={btn("primary")} onClick={salvarPedido} disabled={saving}>
              {saving ? <><Spinner size={14} color="#0a0a08" /> Salvando...</> : "Criar Pedido"}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal: Ver pedido */}
      {modalVer && (
        <Modal title={`Pedido #${modalVer.id}`} onClose={() => setModalVer(null)} wide>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: 10, marginBottom: "1.25rem" }}>
            {[
              { label: "Status", val: <span style={{ color: STATUS_COR[modalVer.status], fontWeight: 600 }}>{STATUS_LABEL[modalVer.status]}</span> },
              { label: "Fornecedor", val: nomeForn(modalVer.fornecedor_id) },
              { label: "Data Pedido", val: modalVer.data_pedido },
              { label: "Data Prevista", val: modalVer.data_prevista || "—" },
              { label: "Recebimento", val: modalVer.data_recebimento || "—" },
              { label: "Total", val: <span style={{ color: "#ffbf00", fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>{fmt(modalVer.total)}</span> },
            ].map((s, i) => (
              <div key={i} style={{ background: "#111", borderRadius: 8, padding: ".75rem" }}>
                <div style={{ fontSize: ".65rem", color: "#555", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{s.label}</div>
                <div style={{ color: "#e0e0e0", fontSize: ".88rem" }}>{s.val}</div>
              </div>
            ))}
          </div>

          {modalVer.obs && (
            <div style={{ background: "#111", borderRadius: 8, padding: ".75rem 1rem", marginBottom: "1.25rem", fontSize: ".85rem", color: "#888" }}>
              <span style={{ color: "#555", marginRight: 6 }}>Obs:</span>{modalVer.obs}
            </div>
          )}

          <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 10, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".88rem" }}>
              <thead>
                <tr style={{ background: "#111" }}>
                  {["Produto", "Qtd", "Custo Unit.", "Subtotal"].map((h, i) => (
                    <th key={h} style={{ padding: ".65rem 1rem", textAlign: i >= 2 ? "right" : "left", fontSize: ".7rem", color: "#555", textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(modalVer.pedido_itens || []).map((it, i) => (
                  <tr key={i} style={{ borderTop: "1px solid #1f1f1f" }}>
                    <td style={{ padding: ".65rem 1rem", color: "#e0e0e0" }}>{nomeProd(it.produto_id)}</td>
                    <td style={{ padding: ".65rem 1rem", color: "#aaa" }}>{it.quantidade}</td>
                    <td style={{ padding: ".65rem 1rem", textAlign: "right", color: "#aaa", fontFamily: "'DM Mono',monospace" }}>{fmt(it.custo_unitario)}</td>
                    <td style={{ padding: ".65rem 1rem", textAlign: "right", color: "#ffbf00", fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>{fmt(it.quantidade * it.custo_unitario)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "2px solid #2a2a2a", background: "#111" }}>
                  <td colSpan={3} style={{ padding: ".65rem 1rem", color: "#aaa", fontWeight: 700 }}>Total</td>
                  <td style={{ padding: ".65rem 1rem", textAlign: "right", color: "#c9a84c", fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>{fmt(modalVer.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: "1.25rem" }}>
            <button style={btn("ghost")} onClick={() => setModalVer(null)}>Fechar</button>
            {modalVer.status === "pendente" && (
              <button style={btn("primary")} onClick={() => { setModalVer(null); abrirReceber(modalVer); }}>
                Receber Pedido
              </button>
            )}
          </div>
        </Modal>
      )}

      {/* Modal: Receber pedido */}
      {modalReceber && (
        <Modal title={`Receber Pedido #${modalReceber.id}`} onClose={() => setModalReceber(null)}>
          <div style={{ background: "#111", borderRadius: 8, padding: "1rem", marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: ".7rem", color: "#555", marginBottom: 3 }}>Total do Pedido</div>
              <div style={{ fontSize: "1.2rem", color: "#c9a84c", fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>{fmt(modalReceber.total)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: ".7rem", color: "#555", marginBottom: 3 }}>Fornecedor</div>
              <div style={{ color: "#e0e0e0", fontSize: ".88rem" }}>{nomeForn(modalReceber.fornecedor_id)}</div>
            </div>
          </div>

          <Field label="Data de Recebimento">
            <input style={inp} type="date" value={receberForm.data_recebimento} onChange={e => setReceberForm(f => ({ ...f, data_recebimento: e.target.value }))} />
          </Field>

          {/* Checkbox gerar conta */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "1rem 0", padding: ".85rem 1rem", background: "#111", borderRadius: 8, cursor: "pointer" }}
            onClick={() => setReceberForm(f => ({ ...f, gerar_conta: !f.gerar_conta }))}>
            <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${receberForm.gerar_conta ? "#ffbf00" : "#333"}`, background: receberForm.gerar_conta ? "#ffbf00" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .15s" }}>
              {receberForm.gerar_conta && <span style={{ color: "#0a0a08", fontSize: 11, fontWeight: 800, lineHeight: 1 }}>✓</span>}
            </div>
            <div>
              <div style={{ fontSize: ".88rem", color: "#e0e0e0", fontWeight: 500 }}>Gerar conta a pagar</div>
              <div style={{ fontSize: ".75rem", color: "#555" }}>Lança automaticamente em Financeiro → A Pagar</div>
            </div>
          </div>

          {receberForm.gerar_conta && (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <Field label="Forma de Pagamento">
                <select style={inp} value={receberForm.forma_pagamento} onChange={e => setReceberForm(f => ({ ...f, forma_pagamento: e.target.value }))}>
                  {Object.entries(FORMA_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="Data de Vencimento">
                <input style={inp} type="date" value={receberForm.data_vencimento} onChange={e => setReceberForm(f => ({ ...f, data_vencimento: e.target.value }))} />
              </Field>
            </div>
          )}

          <div style={{ background: "#111", borderRadius: 8, padding: ".75rem 1rem", marginBottom: "1.25rem", fontSize: ".82rem", color: "#555", display: "flex", gap: 8, alignItems: "center" }}>
            <Icon name="box" size={13} />
            {(modalReceber.pedido_itens || []).length} produto{(modalReceber.pedido_itens || []).length !== 1 ? "s" : ""} entrarão no estoque automaticamente.
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button style={btn("ghost")} onClick={() => setModalReceber(null)}>Cancelar</button>
            <button style={btn("primary")} onClick={receberPedido} disabled={saving}>
              {saving ? <><Spinner size={14} color="#0a0a08" /> Recebendo...</> : "Confirmar Recebimento"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Compras;
