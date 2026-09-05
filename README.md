# Harmony Hub

Aplicativo **mobile-first de gestão financeira compartilhada**, com suporte a grupos e um calendário financeiro.

## Escopo atual

O Harmony Hub foi simplificado para manter apenas o que faz parte do produto atual:

- **Início** — resumo financeiro real do mês.
- **Fluxo** — visão consolidada de todas as movimentações financeiras.
- **Movimentações** — extrato detalhado, com filtros e busca.
- **Calendário** — visão por data de receitas, despesas e compromissos financeiros.
- **Receitas** — cadastro, edição e exclusão de entradas.
- **Despesas** — cadastro, edição e exclusão de gastos.
- **Contas a Pagar** — controle de vencimentos e pagamentos.
- **Custos Fixos** — despesas recorrentes com controle mensal.
- **Orçamento** — limites e acompanhamento por categoria.
- **Cartões e Faturas** — cartões, limites, fechamento, vencimento e faturas.
- **Parcelas** — compras parceladas e acompanhamento da parcela atual.
- **Assinaturas** — recorrências e controle mensal.
- **Investimentos** — investimentos, aportes e resgates.
- **Metas** — objetivos financeiros.
- **Calculadora de Aportes** — planejamento de aportes.
- **Grupos** — compartilhamento financeiro entre membros.
- **Ajustes** — categorias, formas de pagamento, contas e demais configurações.

## Navegação principal

A navegação mobile segue a ordem:

1. Início
2. Fluxo
3. **+**
4. Ajustes
5. Painel

O **Painel** concentra os módulos do aplicativo.

## Princípios do produto

- Sem dados fictícios ou dados de demonstração.
- Dados financeiros reais vindos do Supabase.
- Isolamento por grupo e usuário através das regras de segurança do banco.
- CRUD funcional para os módulos disponíveis.
- Valores em **R$** e datas no padrão brasileiro.
- Interface responsiva e mobile-first.
- Estados de carregamento, vazio e erro.
- Atualização consistente entre Fluxo, Movimentações, Calendário e módulos financeiros.

## Stack

- React + TypeScript
- TanStack Router
- Tailwind CSS
- Supabase / PostgreSQL / Auth
- Vercel
- Lucide Icons
- Recharts

## Desenvolvimento

```bash
npm install
npm run dev
```

Build de produção:

```bash
npm run build
npm start
```

## Banco de dados

O banco utiliza PostgreSQL via Supabase, com RLS e funções controladas para operações que dependem do grupo ativo.

As migrações ficam em `supabase/migrations` e representam o histórico do schema. Estruturas antigas são removidas por novas migrações, sem reescrever o histórico.

## Observação

O repositório mantém **Grupos** e o **Calendário** atuais. Módulos antigos de rotina, produtividade, compras e tarefas não fazem mais parte do aplicativo.
