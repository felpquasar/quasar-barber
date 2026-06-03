# Tutorial: Cobrança Automática de Inadimplentes via WhatsApp

## O que este workflow faz

1. Recebe um POST do botão "Cobrar" no painel Quasar Barber
2. Busca todas as contas a receber com `status = pendente` e `data_vencimento < hoje`
3. Filtra somente clientes com telefone cadastrado
4. Envia mensagem WhatsApp personalizada para cada um via Evolution API

---

## Pré-requisitos

- n8n rodando em https://n8n.felper.cloud/
- Evolution API instalada e com instância conectada ao WhatsApp
- Clientes com campo `telefone` preenchido no Quasar Barber

---

## Passo 1 — Importar o workflow no n8n

1. Acesse https://n8n.felper.cloud/
2. Menu lateral → **Workflows** → botão **+** (novo)
3. No menu do editor → **Import from File**
4. Selecione o arquivo `workflow-cobrar-inadimplentes.json`
5. O workflow aparece com 4 nós em linha

---

## Passo 2 — Configurar o nó "Buscar Inadimplentes" (Supabase)

Clique no nó **Buscar Inadimplentes** e edite:

### URL
Substitua `YOUR_SUPABASE_URL` pela URL do seu projeto Supabase.

**Onde achar:** Supabase → Settings → API → **Project URL**

Exemplo: `https://xyzcompany.supabase.co/rest/v1/contas_receber`

### Headers
Substitua `YOUR_SUPABASE_ANON_KEY` pela anon key do projeto.

**Onde achar:** Supabase → Settings → API → **anon public**

Faça a substituição nos dois headers:
- `apikey: YOUR_SUPABASE_ANON_KEY`
- `Authorization: Bearer YOUR_SUPABASE_ANON_KEY`

---

## Passo 3 — Configurar o nó "Enviar WhatsApp" (Evolution API)

Clique no nó **Enviar WhatsApp** e edite:

### URL
Substitua:
- `YOUR_EVOLUTION_API_URL` → URL base da sua Evolution API (ex: `https://evolution.felper.cloud`)
- `YOUR_INSTANCE_NAME` → nome da instância conectada (ex: `quasar-barber`)

Resultado: `https://evolution.felper.cloud/message/sendText/quasar-barber`

### Header apikey
Substitua `YOUR_EVOLUTION_API_KEY` pela API key da Evolution API.

**Onde achar:** Evolution API → painel da instância → API Key

---

## Passo 4 — Ativar o webhook

1. Clique no nó **Webhook**
2. Copie a **Webhook URL** de produção (aba "Production URL")
   - Formato: `https://n8n.felper.cloud/webhook/cobrar-inadimplentes`
3. Salve esta URL — você vai usá-la no `.env` do React

---

## Passo 5 — Configurar o React (Quasar Barber)

Abra o arquivo `.env` na raiz do projeto e adicione:

```
REACT_APP_N8N_WEBHOOK_URL=https://n8n.felper.cloud/webhook/cobrar-inadimplentes
```

Reinicie o servidor de desenvolvimento:
```bash
npm start
```

---

## Passo 6 — Ativar o workflow

No n8n, clique no toggle no canto superior direito para ativar o workflow.
O status muda de **Inactive** para **Active**.

---

## Passo 7 — Testar

1. Abra o Quasar Barber → aba **Financeiro** → **Contas a Receber**
2. Se houver contas vencidas, o botão **📱 Cobrar (X)** aparece no cabeçalho
3. Clique no botão → confirme
4. Verifique no n8n → **Executions** se o workflow rodou
5. Confira o WhatsApp do cliente de teste

---

## Formato da mensagem enviada

```
Olá, *Nome do Cliente*! 👋

Identificamos um débito em aberto:

📋 *Descrição da cobrança*
💰 Valor: *R$ 1.500,00*
📅 Vencimento: *15/01/2024*

Para regularizar ou negociar, entre em contato conosco. 💈

*Quasar Barber*
```

---

## Formato do telefone

O sistema aceita qualquer formato cadastrado e normaliza automaticamente:

| Cadastrado | Enviado para API |
|-----------|-----------------|
| `11999999999` | `5511999999999` |
| `5511999999999` | `5511999999999` |
| `(11) 99999-9999` | `5511999999999` |
| `11 99999-9999` | `5511999999999` |

Clientes sem telefone cadastrado são ignorados automaticamente.

---

## Troubleshooting

### Webhook retorna erro 404
→ O workflow está inativo. Ative com o toggle no n8n.

### Supabase retorna array vazio
→ Verifique se há contas com `status = pendente` e `data_vencimento` anterior à data atual.

### Evolution API retorna erro 401
→ API Key incorreta ou instance name errado na URL.

### Evolution API retorna erro 400
→ Número de telefone inválido. Verifique o formato no cadastro do cliente.

### Mensagem não chega no WhatsApp
→ Verifique se a instância está conectada no painel da Evolution API (status deve ser "open").

### Botão não aparece no React
→ A variável `REACT_APP_N8N_WEBHOOK_URL` não está no `.env` ou o servidor não foi reiniciado.
