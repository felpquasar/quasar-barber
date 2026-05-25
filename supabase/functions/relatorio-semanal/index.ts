import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const OWNER_EMAIL = Deno.env.get("OWNER_EMAIL")!;

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const toDateStr = (d: Date) => d.toISOString().split("T")[0];

const fmtBR = (s: string) => s.split("-").reverse().join("/");

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const hoje = new Date();
  const semanaAtras = new Date(hoje);
  semanaAtras.setDate(hoje.getDate() - 7);

  const hojeStr = toDateStr(hoje);
  const semanaAtrasStr = toDateStr(semanaAtras);

  const [vendasRes, clientesRes, contasRes, despesasRes] = await Promise.all([
    supabase
      .from("vendas")
      .select("id, total, forma_pagamento, status, cliente_id, data")
      .gte("data", semanaAtrasStr)
      .neq("status", "cancelado"),
    supabase.from("clientes").select("id, nome"),
    supabase
      .from("contas_receber")
      .select("id, valor, data_vencimento, status, cliente_id")
      .neq("status", "pago")
      .lt("data_vencimento", hojeStr),
    supabase
      .from("despesas")
      .select("id, valor, descricao, data")
      .gte("data", semanaAtrasStr),
  ]);

  const vendas = vendasRes.data ?? [];
  const clientes = clientesRes.data ?? [];
  const contasVencidas = contasRes.data ?? [];
  const despesas = despesasRes.data ?? [];

  const clienteMap: Record<string, string> = {};
  clientes.forEach((c) => {
    clienteMap[c.id] = c.nome;
  });

  const faturamento = vendas.reduce((a, v) => a + Number(v.total), 0);
  const vendasFiado = vendas
    .filter((v) => v.forma_pagamento === "fiado")
    .reduce((a, v) => a + Number(v.total), 0);
  const vendasCaixa = faturamento - vendasFiado;
  const totalDespesas = despesas.reduce((a, d) => a + Number(d.valor), 0);
  const saldoCaixa = vendasCaixa - totalDespesas;
  const totalVencido = contasVencidas.reduce(
    (a, c) => a + Number(c.valor),
    0
  );

  // Top 3 clientes por faturamento na semana
  const vendasPorCliente: Record<string, number> = {};
  vendas.forEach((v) => {
    if (v.cliente_id)
      vendasPorCliente[v.cliente_id] =
        (vendasPorCliente[v.cliente_id] ?? 0) + Number(v.total);
  });
  const topClientes = Object.entries(vendasPorCliente)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, total]) => ({ nome: clienteMap[id] ?? "—", total }));

  // Inadimplentes (total vencido por cliente)
  const debitosPorCliente: Record<string, number> = {};
  contasVencidas.forEach((c) => {
    if (c.cliente_id)
      debitosPorCliente[c.cliente_id] =
        (debitosPorCliente[c.cliente_id] ?? 0) + Number(c.valor);
  });
  const inadimplentes = Object.entries(debitosPorCliente)
    .sort((a, b) => b[1] - a[1])
    .map(([id, total]) => ({ nome: clienteMap[id] ?? "—", total }));

  const period = `${fmtBR(semanaAtrasStr)} a ${fmtBR(hojeStr)}`;

  const rowStyle =
    'style="padding:6px 0;border-bottom:1px solid #2a2a4a;color:#ccc"';
  const valStyle = 'style="text-align:right;font-weight:600"';

  const topClientesRows =
    topClientes.length > 0
      ? topClientes
          .map(
            (c, i) =>
              `<tr><td ${rowStyle}>${i + 1}. ${c.nome}</td><td ${rowStyle} ${valStyle} style="text-align:right;color:#4caf82;font-weight:600">${fmt(c.total)}</td></tr>`
          )
          .join("")
      : `<tr><td colspan="2" style="color:#888;padding:6px 0">Nenhuma venda no período</td></tr>`;

  const inadimplentesRows =
    inadimplentes.length > 0
      ? inadimplentes
          .map(
            (c) =>
              `<tr><td ${rowStyle}>${c.nome}</td><td ${rowStyle} style="text-align:right;color:#e05a5a;font-weight:600">${fmt(c.total)}</td></tr>`
          )
          .join("")
      : `<tr><td colspan="2" style="color:#888;padding:6px 0">Nenhuma conta vencida ✓</td></tr>`;

  const saldoCor = saldoCaixa >= 0 ? "#4caf82" : "#e05a5a";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;background:#0f0f1a;margin:0;padding:20px">
<div style="max-width:520px;margin:0 auto">

  <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);border-radius:12px 12px 0 0;padding:24px">
    <div style="font-size:1.1rem;font-weight:700;color:#fff;letter-spacing:.02em">⚡ QUASAR BARBER</div>
    <div style="color:#c4b5fd;font-size:.8rem;margin-top:4px">Relatório Semanal · ${period}</div>
  </div>

  <div style="background:#1a1a2e;border-radius:0 0 12px 12px;padding:24px">

    <!-- Faturamento -->
    <div style="background:#16213e;border-radius:8px;padding:16px;margin-bottom:12px">
      <div style="color:#a78bfa;font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">Faturamento da Semana</div>
      <div style="font-size:1.6rem;font-weight:700;color:#fff;margin-bottom:10px">${fmt(faturamento)}</div>
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:5px 0;color:#ccc;font-size:.85rem">À vista / Pix / Cartão</td>
          <td style="text-align:right;color:#4caf82;font-weight:600;font-size:.85rem">${fmt(vendasCaixa)}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#ccc;font-size:.85rem">Fiado</td>
          <td style="text-align:right;color:#e8a020;font-weight:600;font-size:.85rem">${fmt(vendasFiado)}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#ccc;font-size:.85rem">Nº de vendas</td>
          <td style="text-align:right;color:#fff;font-size:.85rem">${vendas.length}</td>
        </tr>
      </table>
    </div>

    <!-- Caixa -->
    <div style="background:#16213e;border-radius:8px;padding:16px;margin-bottom:12px">
      <div style="color:#a78bfa;font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">Caixa</div>
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:5px 0;color:#ccc;font-size:.85rem">Entradas (sem fiado)</td>
          <td style="text-align:right;color:#4caf82;font-weight:600;font-size:.85rem">${fmt(vendasCaixa)}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#ccc;font-size:.85rem">Despesas</td>
          <td style="text-align:right;color:#e05a5a;font-weight:600;font-size:.85rem">- ${fmt(totalDespesas)}</td>
        </tr>
        <tr style="border-top:1px solid #2a2a4a">
          <td style="padding:10px 0 4px;color:#fff;font-weight:600">Saldo estimado</td>
          <td style="text-align:right;font-size:1.1rem;font-weight:700;color:${saldoCor};padding-top:10px">${fmt(saldoCaixa)}</td>
        </tr>
      </table>
    </div>

    <!-- Top Clientes -->
    <div style="background:#16213e;border-radius:8px;padding:16px;margin-bottom:12px">
      <div style="color:#a78bfa;font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">Top Clientes da Semana</div>
      <table style="width:100%;border-collapse:collapse">${topClientesRows}</table>
    </div>

    <!-- Inadimplência -->
    <div style="background:#1e0f1f;border:1px solid #3d1515;border-radius:8px;padding:16px">
      <div style="color:#e05a5a;font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Inadimplência Acumulada</div>
      <div style="font-size:1.3rem;font-weight:700;color:#e05a5a;margin-bottom:10px">${fmt(totalVencido)}</div>
      <table style="width:100%;border-collapse:collapse">${inadimplentesRows}</table>
    </div>

  </div>

  <div style="text-align:center;color:#444;font-size:.7rem;margin-top:16px">
    Gerado automaticamente · Quasar Barber
  </div>
</div>
</body>
</html>`;

  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Quasar Barber <onboarding@resend.dev>",
      to: [OWNER_EMAIL],
      subject: `📊 Relatório Semanal Quasar Barber — ${period}`,
      html,
    }),
  });

  const result = await emailRes.json();

  return new Response(JSON.stringify({ ok: true, resend: result }), {
    headers: { "Content-Type": "application/json" },
  });
});
