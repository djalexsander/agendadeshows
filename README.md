# Minha Agenda

App SaaS multi-tenant de gestão de agenda profissional para músicos e profissionais de eventos: shows, financeiro, equipe, módulos pagos e painel administrativo.

- **Produção:** https://appminhaagenda.alexproapps.com.br
- **Stack:** React 18 + Vite + TypeScript + Tailwind + shadcn/ui + Supabase (Lovable Cloud)

## Stack técnica

| Camada | Tecnologia |
|---|---|
| Frontend | React 18, Vite 5, TypeScript 5 |
| UI | Tailwind CSS v3, shadcn/ui, Radix UI, lucide-react |
| Estado/Data | TanStack Query, React Router v6 |
| Validação | zod |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions) via Lovable Cloud |
| PDF/PNG | jspdf, html2canvas (lazy-loaded) |
| Gráficos | recharts (lazy-loaded) |
| Testes | Vitest + Testing Library |

## Requisitos

- Node.js 20+
- npm 10+ (ou bun)

## Instalação

```bash
npm install
cp .env.example .env   # preencha com os valores do projeto
npm run dev            # http://localhost:8080
```

> O arquivo `.env` é gerenciado automaticamente pelo Lovable Cloud em ambientes vinculados — **nunca commite** valores reais.

## Comandos

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (porta 8080) |
| `npm run build` | Build de produção em `dist/` |
| `npm run build:dev` | Build com source maps (debug) |
| `npm run preview` | Pré-visualiza o build local |
| `npm run lint` | ESLint |
| `npm test` | Roda toda a suíte Vitest |
| `npm run test:watch` | Vitest em watch mode |

## Variáveis de ambiente

Definidas em `.env.example`. Todas com prefixo `VITE_` são públicas (entram no bundle):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
```

Segredos privados (chaves de Asaas, SMTP, etc) **nunca** vão no frontend — são gerenciados via Lovable Cloud → Edge Function Secrets.

## Estrutura

```
src/
  components/        # UI (shadcn em ui/, domínio em domain/)
  hooks/             # useAuth, useCompany, useShows, useFinancialEntries...
  lib/               # planStatus, financialStatus, validation, exports...
  pages/             # rotas (lazy-loaded em App.tsx)
    admin/           # painel administrativo
  integrations/
    supabase/        # client + types (gerados — não editar)
supabase/
  functions/         # edge functions (deploy automático)
  migrations/        # schema (read-only neste repo)
```

## Arquitetura — pontos-chave

- **Roteamento e bootstrap:** `src/App.tsx` define rotas com `React.lazy` para todas as páginas admin e secundárias. Login + Dashboard + telas de bloqueio carregam eager.
- **Status do plano:** centralizado em `src/lib/planStatus.ts` (`getEffectivePlanStatus`). É a única fonte de verdade — não duplicar a lógica em componentes.
- **Status financeiro:** centralizado em `src/lib/financialStatus.ts`.
- **Validação:** schemas zod em `src/lib/validation.ts` (login, signup, telefone BR, etc).
- **Roles:** `admin` x `client` (tabela `user_roles`). Admin tem toggle "Minha Empresa" para acessar áreas de cliente.
- **Multi-tenant:** tabela `companies` + `company_members` com RLS por `company_id`.

## Deploy

- **Backend** (edge functions, migrations): deploy **automático** ao salvar.
- **Frontend**: clicar em **Publish → Update** no editor Lovable para promover o build atual.
- Domínios custom configurados em **Project Settings → Domains**.

## CI

GitHub Actions em `.github/workflows/ci.yml` roda em todo push/PR para `main`:

1. `npm ci`
2. `npm run lint` (não-bloqueante)
3. `npm test`
4. `npm run build`

## Release

Antes de publicar, siga o [`RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md).

## Troubleshooting

- **Erro 404 ao recarregar uma rota:** o hosting Lovable já tem fallback SPA — confira o roteamento em `App.tsx`.
- **Tela em branco em produção após publish:** abra DevTools → Network → procure chunks `.js` com 404 (cache antigo do Service Worker). Solução: `Ctrl+Shift+R` ou aguardar o `sw.js` atualizar.
- **`.env` não está sendo lido:** Vite só expõe variáveis com prefixo `VITE_`.
