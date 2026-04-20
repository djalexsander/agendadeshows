# Minha Agenda

App de gestão de agenda profissional (shows, eventos, financeiro e equipe).

## Stack

- React 18 + Vite + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (banco, auth, storage, edge functions) via Lovable Cloud

## Desenvolvimento

```bash
# Instalar dependências
npm install

# Rodar em modo desenvolvimento
npm run dev

# Build de produção
npm run build

# Preview do build
npm run preview
```

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha com os valores do projeto:

```bash
cp .env.example .env
```

O arquivo `.env` é gerado/atualizado automaticamente pela integração com Lovable Cloud e **não deve ser commitado**.

## Deploy

Publicação via Lovable Cloud. Domínio principal: `appminhaagenda.alexproapps.com.br`.
