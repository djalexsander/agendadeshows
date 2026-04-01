

# Agenda de Shows — Plano de Implementação

## Visão Geral
App mobile-first para gerenciar datas de shows pessoais. Design escuro, elegante e minimalista. Dados salvos no localStorage.

## Tela Única — Calendário + Gestão de Shows

### Calendário Mensal
- Calendário grande e visível ocupando a parte superior da tela
- Navegação entre meses com setas grandes
- Datas com shows marcadas com indicador visual (ponto colorido)
- Mês e ano exibidos em português

### Cadastro de Show (Dialog/Sheet)
- Ao tocar numa data vazia → abre formulário com:
  - **Data** (pré-preenchida, apenas exibição)
  - **Cidade** (input de texto)
  - Botão "Salvar"
- Ao tocar numa data com show → abre visualização com:
  - Data e cidade cadastradas
  - Botões "Editar" e "Excluir"

### Design
- Tema escuro elegante (fundo escuro, acentos em roxo/azul)
- Botões grandes, touch-friendly
- Tipografia clara e legível
- Tudo em português do Brasil
- Layout otimizado para celular (mobile-first)

### Dados
- Armazenamento via localStorage
- Estrutura preparada para campos futuros (evento, horário, local, observações) mas só data e cidade por enquanto

### Lista de Próximos Shows
- Abaixo do calendário, lista simples dos próximos shows ordenados por data

