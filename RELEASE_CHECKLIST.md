# Checklist de Release — Minha Agenda

Use antes de publicar uma nova versão em produção.

## 1. Configuração

- [ ] `.env` local atualizado (não commitar)
- [ ] Variáveis públicas no Lovable Cloud conferidas
- [ ] Versão do app atualizada em `src/lib/version.ts`

## 2. Qualidade

- [ ] `npm run lint` sem erros novos
- [ ] `npm test` 100% verde
- [ ] `npm run build` sem warnings de chunk inesperados

## 3. Fluxos críticos (smoke test manual)

- [ ] Login com cliente existente
- [ ] Cadastro de nova conta (validações + e-mail recebido)
- [ ] Cliente em **trial**: acessa Dashboard, Financeiro, Relatórios
- [ ] Cliente com **trial expirado**: vê tela correta
- [ ] Cliente com **plano ativo**: vê módulos contratados
- [ ] Admin → Clientes: badge de status correto, modal de Controle de Acesso libera/revoga
- [ ] Admin → Pix / Plano Base / Catálogo de Módulos: edição salva e reflete

## 4. Segurança

- [ ] Nenhum segredo hardcoded foi adicionado nesta release
- [ ] RLS das tabelas novas (se houver) revisada
- [ ] Edge functions novas (se houver) com `verify_jwt` correto

## 5. Deploy

- [ ] Backend (edge functions, migrations): já deployado automaticamente
- [ ] Frontend: clicar em **Publish → Update** no Lovable
- [ ] Conferir no domínio público que o build novo subiu (`APP_VERSION` no rodapé)

## 6. Pós-release

- [ ] Monitorar logs das edge functions por 30 min
- [ ] Conferir notificações admin chegando
- [ ] Validar fluxo de pagamento Pix com 1 cliente real (se mexeu em cobrança)
