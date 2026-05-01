# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start        # dev server at localhost:3000
npm run build    # production build
npm test         # run tests (interactive watch mode)
npm test -- --watchAll=false  # run tests once (CI mode)
```

## What this project is

Internal management system for **Quasar Barber**, a B2B distributor of beard and barber products. Clients are establishments (barbearias, salões, distribuidores) — not end consumers. This context matters when suggesting features.

## Architecture

**Stack:** React 19 (Create React App), Supabase (Postgres + Auth). No TypeScript, no CSS framework, no routing library.

**Navigation** is state-based: a single `aba` string in `App.js` controls which module renders. No React Router.

**State management** lives entirely in `src/hooks/useStore.js`. It loads all data once at mount via parallel Supabase queries and exposes both data and setters as props. Components receive state via props — not context or a global store. The pattern for mutations is always: update Supabase first, then update local state on success.

**Styling** is 100% inline JS objects. There are no CSS modules or styled-components. Shared primitives are in `src/styles/shared.js`:
- `inp` — standard input style object
- `btn(variant)` — returns a style object; variants are `"primary"`, `"ghost"`, `"danger"`

**UI components** in `src/components/ui/`:
- `Icon` — inline SVG. To add a new icon, add a key to the `paths` object in `Icon.jsx`.
- `Modal` — fixed overlay; accepts `wide` prop for wider content
- `Field` — label wrapper for form inputs
- `Spinner`, `Toast` — loading and notification primitives

**Utilities** (`src/lib/utils.js`):
- `fmt(v)` — formats a number as BRL currency
- `today()` — returns today as `YYYY-MM-DD`
- `addDays(date, days)` — adds days to a `YYYY-MM-DD` string

## Supabase

Connection is in `src/lib/supabase.js` using env vars `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_KEY` (anon key). Note: the client is imported from `esm.sh` (CDN), not the npm package — keep this consistent.

**Tables:** `produtos`, `clientes`, `vendas`, `venda_itens`, `movimentos`, `contas_receber`

Key relations:
- `vendas` → `venda_itens` (one-to-many, loaded with `select("*, venda_itens(*)")`)
- `vendas` → `contas_receber` via `venda_id` (auto-created when a venda is saved with `status = "pendente"`)
- `contas_receber.status` is stored as `"pendente"` or `"pago"` — `"vencido"` is computed on the frontend by comparing `data_vencimento` with `today()`

## Key conventions

- **Forma de pagamento** values: `"a_vista"`, `"cartao"`, `"pix"`, `"fiado"`
- When a `venda` is marked as paid (`marcarPago`), the corresponding `contas_receber` row must also be updated
- Overdue badge count (`qtdVencidas`) is computed in `App.js` and passed as `badge` on the nav item — it drives the red badge on the Financeiro tab
- The `Dashboard` component accepts `contasReceber` to show the overdue alert card
