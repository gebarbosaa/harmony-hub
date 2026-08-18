# Harmony Hub

MULTICAP — ESPECIFICAÇÃO UNIFICADA DO APLICATIVO

O MULTICAP será um aplicativo mobile-first de gestão financeira compartilhada, organização doméstica, produtividade e acompanhamento de hábitos para casais ou famílias.

A identidade visual será baseada em:

Laranja vibrante;

Preto profundo;

Grafite;

Degradês;

Glassmorphism;

Alto contraste;

Interface moderna em Dark Mode.

O aplicativo deverá permitir que duas pessoas compartilhem informações financeiras e de rotina em tempo real, mantendo também áreas individuais e privadas.

1. Objetivo principal do MULTICAP

O aplicativo deve responder rapidamente às seguintes perguntas:

Quanto temos disponível?

Quanto já gastamos este mês?

Quais contas vencem nos próximos dias?

Quanto está comprometido com parcelas?

Qual pessoa realizou cada gasto?

Quanto gastamos juntos?

Estamos dentro do orçamento?

Quais são nossas próximas metas?

Como estão os investimentos?

O que precisamos comprar?

Quais tarefas e hábitos estão pendentes?

2. Estrutura principal do aplicativo

2.1 As 13 abas principais

VISÃO GERAL

CALENDÁRIO

FLUXO MENSAL

ORÇAMENTO MENSAL

CUSTOS FIXOS

PARCELADOS

FATURAS

LISTA DE COMPRAS

MODO MERCADO

AGENDA E COMPROMISSOS

METAS E CAIXINHAS

INVESTIMENTOS

CONFIGURAÇÕES

2.2 Módulos complementares

Os módulos abaixo podem ser acessados pela aba “Mais”, pela Agenda ou por atalhos:

Assinaturas;

Lembretes;

Matriz de Eisenhower;

Hábitos;

Relatórios;

Notificações;

Backup e restauração;

Perfil;

Gestão de membros;

Categorias e formas de pagamento.

3. Navegação e layout

3.1 Navegação mobile

A navegação inferior deverá conter:

PosiçãoItem1VISÃO GERAL2FLUXO3Botão central “+”4CALENDÁRIO5MAIS

O botão central “+” será um botão flutuante circular em degradê laranja e permitirá cadastrar rapidamente:

DESPESA;

RECEITA;

TRANSFERÊNCIA;

CONTA;

COMPRA PARCELADA;

META;

COMPROMISSO;

LEMBRETE;

ITEM DE LISTA.

3.2 Navegação desktop

No desktop, utilizar uma barra lateral fixa:

text

Collapse

 Copy

MULTICAP

PRINCIPAL
- VISÃO GERAL
- CALENDÁRIO
- FLUXO MENSAL

FINANÇAS
- ORÇAMENTO
- CUSTOS FIXOS
- PARCELADOS
- FATURAS
- METAS
- INVESTIMENTOS

ROTINA
- LISTA DE COMPRAS
- MODO MERCADO
- AGENDA
- HÁBITOS
- TAREFAS

SISTEMA
- RELATÓRIOS
- NOTIFICAÇÕES
- CONFIGURAÇÕES


4. Identidade visual

4.1 Direção estética

A interface deve transmitir:

Controle;

Segurança;

Modernidade;

Organização;

Energia;

Clareza;

Exclusividade.

O sistema deve utilizar um Dark Mode consistente, evitando excesso de elementos luminosos. O laranja deve funcionar como elemento de ação, orientação e destaque, não como preenchimento exagerado de toda a interface.

4.2 Paleta principal

css

Collapse

 Copy

:root {
  --orange-primary: #FF6B00;
  --orange-secondary: #FF8C00;
  --orange-light: #FFA94D;

  --black: #0D0D0D;
  --black-soft: #121212;
  --graphite: #1A1A1A;
  --graphite-light: #252525;

  --white: #FFFFFF;
  --text-primary: #F5F5F5;
  --text-secondary: #A3A3A3;
  --border: #333333;

  --success: #73C991;
  --danger: #EF5350;
  --warning: #FFB020;
  --info: #4EA5FF;
}


4.3 Degradê principal

css

Collapse

 Copy

--gradient-primary: linear-gradient(
  135deg,
  #FF6B00 0%,
  #FF8C00 35%,
  #1A1A1A 100%
);


Aplicar em:

Botão flutuante;

Botões primários;

Cards hero;

Indicadores de progresso;

Cabeçalhos especiais;

Destaques de metas;

Cards de saldo;

Estados selecionados.

4.4 Cores funcionais

CorUsoLaranjaAções, foco, progresso e destaquesVerde suaveReceitas, sucesso, conclusão e saldo positivoVermelhoDespesas, atraso e orçamento excedidoÂmbarVencimentos próximos e atençãoAzulTransferências, investimentos e informaçõesCinzaDados neutros e itens inativos

5. Tipografia e padrões visuais

Tipografia

Sugestões:

Inter;

Manrope;

Plus Jakarta Sans.

Padrão textual

Títulos, rótulos e nomes principais devem utilizar CAIXA ALTA, especialmente em:

Títulos de telas;

Nomes de cards;

Abas;

Status;

Botões;

Categorias.

Os textos explicativos e descrições podem utilizar caixa normal para facilitar a leitura.

Componentes

Cards com fundo grafite;

Bordas finas em #333333;

Raio entre 12 e 18 pixels;

Sombras suaves;

Efeito de vidro em painéis importantes;

Ícones lineares;

Botões grandes para uso com uma mão;

Espaçamento confortável entre elementos;

Estados de carregamento com skeleton;

Feedback visual após salvar, editar ou excluir.

6. Aba 1 — VISÃO GERAL

Objetivo

Apresentar um resumo financeiro e operacional da conta compartilhada.

Cabeçalho

Exibir:

Saudação;

Nome do usuário;

Avatar;

Perfil ativo;

Notificações;

Mês selecionado;

Indicador de sincronização.

Exemplo:

text

Collapse

 Copy

BOM DIA, MARIA
VEJA COMO ESTÃO AS FINANÇAS DE AGOSTO


Cards principais

TOTAL DO MÊS

Exibe o total movimentado no mês.

À VISTA

Exibe as despesas pagas ou lançadas à vista.

PARCELADOS

Exibe as parcelas ativas do mês.

CUSTOS FIXOS

Exibe o total previsto em despesas recorrentes.

Cada card deve apresentar:

Valor;

Variação em relação ao mês anterior;

Ícone;

Cor contextual;

Acesso rápido aos detalhes.

Card “VENCENDO EM BREVE”

Mostrar contas com vencimento entre hoje e os próximos cinco dias.

Status:

VENCE HOJE;

VENCE AMANHÃ;

EM 2 DIAS;

EM 3 DIAS;

EM 5 DIAS.

O card deve utilizar:

Fundo grafite;

Borda laranja ou âmbar;

Ícone de alerta;

Botão “VER CONTAS”;

Ação “MARCAR COMO PAGA”.

Gráficos

EVOLUÇÃO ANUAL

Gráfico de linha com:

Total de gastos por mês;

Linha em laranja;

Área com transparência;

Comparativo com receitas;

Filtro por ano.

DISTRIBUIÇÃO DE GASTOS

Gráfico de rosca por categoria usando:

Tons de laranja;

Grafite;

Cinza;

Vermelho para categorias acima do orçamento.

COMPOSIÇÃO FINANCEIRA

Comparação entre:

FIXO;

PARCELADO;

À VISTA;

OUTROS.

DIVISÃO DE CUSTOS

Exibir os gastos por responsável:

PESSOA A;

PESSOA B;

AMBAS.

Maiores categorias

Lista com as cinco categorias de maior consumo no período.

Cada item exibe:

Categoria;

Valor;

Percentual;

Barra de progresso;

Comparação com o mês anterior.

Agenda integrada

Mostrar os próximos quatro compromissos:

Contas;

Mercado;

Lazer;

Folga;

Compromissos sincronizados com Google Calendar.

Meta principal

Exibir a primeira meta cadastrada com:

Nome;

Valor atual;

Valor-alvo;

Percentual;

Barra em degradê laranja;

Data estimada de conclusão.

7. Aba 2 — CALENDÁRIO

Objetivo

Exibir os gastos e compromissos organizados por data.

Visualização mensal

Grade com sete colunas:

DOM;

SEG;

TER;

QUA;

QUI;

SEX;

SÁB.

Mapa de calor de gastos

Cada dia terá intensidade proporcional ao volume de despesas:

Nível 0: sem gasto;

Nível 1: gasto baixo;

Nível 2: gasto moderado;

Nível 3: gasto alto;

Nível 4: maior gasto do mês.

O dia atual deve possuir:

Borda laranja;

Brilho externo;

Ícone ou marcador de “HOJE”.

Detalhes do dia

Ao selecionar uma data, abrir uma janela ou painel com:

Total gasto;

Total recebido;

Contas do dia;

Parcelas;

Compromissos;

Hábitos;

Lembretes;

Botões para editar, excluir ou adicionar lançamento.

8. Aba 3 — FLUXO MENSAL

Objetivo

Gerenciar lançamentos à vista, receitas, despesas, transferências e investimentos.

Cadastro rápido

Campos:

DATA;

DESCRIÇÃO;

VALOR;

CATEGORIA;

FORMA DE PAGAMENTO;

RESPONSÁVEL;

CONTA;

OBSERVAÇÃO.

Campo de valor com calculadora

Permitir expressões simples:

text

Collapse

 Copy

50 + 30
1200 / 3
100 * 2


O sistema deve calcular o resultado antes de salvar.

Tipos de lançamento

RECEITA;

DESPESA;

TRANSFERÊNCIA;

INVESTIMENTO;

AJUSTE DE SALDO.

Indicadores visuais

Verde: receitas;

Vermelho: despesas;

Azul: transferências;

Laranja ou roxo: investimentos.

Lista de lançamentos

Exibir:

Data;

Descrição;

Categoria;

Responsável;

Forma de pagamento;

Valor;

Status.

Permitir edição e exclusão inline com atualização automática dos totais.

Filtros

Mês;

Tipo;

Responsável;

Categoria;

Conta;

Forma de pagamento;

Status;

Busca por texto.

9. Aba 4 — ORÇAMENTO MENSAL

Objetivo

Definir o teto de gastos de cada categoria.

Estrutura

Cada categoria deve apresentar:

text

Collapse

 Copy

ALIMENTAÇÃO
R$ 800,00 / R$ 1.000,00
80% UTILIZADO


A ordem pode ser:

text

Collapse

 Copy

[VALOR GASTO] / [VALOR ORÇADO]


Barra de progresso

Degradê laranja dentro do limite;

Âmbar quando próximo do limite;

Vermelho quando exceder;

Percentual visível;

Valor restante ou excedido.

Alertas configuráveis

O usuário poderá definir alertas em:

50%;

75%;

90%;

100%.

10. Aba 5 — CUSTOS FIXOS

Objetivo

Controlar despesas recorrentes.

Campos do formulário

DESCRIÇÃO;

VALOR;

CATEGORIA;

FORMA DE PAGAMENTO;

DIA DE VENCIMENTO;

CARTÃO OU CONTA;

RESPONSÁVEL;

MESES ATIVOS;

OBSERVAÇÕES.

Matriz anual de recorrência

Exibir os 12 meses:

text

Collapse

 Copy

DESPESA             JAN FEV MAR ABR MAI JUN JUL AGO SET OUT NOV DEZ
ALUGUEL              ●   ●   ●   ●   ●   ●   ●   ●   ●   ●   ●   ●
IPTU                  ●   ●   ●   ●   ●   ●
SEGURO                ●       ●       ●       ●


Os meses ativos devem possuir selo ou marcador laranja.

Recursos

Pausar despesa;

Encerrar recorrência;

Alterar valor por mês;

Definir valor variável;

Gerar contas automaticamente;

Visualizar custo anual estimado.

11. Aba 6 — PARCELADOS

Objetivo

Controlar compras realizadas a prazo.

Formulário

DESCRIÇÃO;

DATA DA COMPRA;

VALOR TOTAL;

NÚMERO DE PARCELAS;

CATEGORIA;

FORMA DE PAGAMENTO;

CARTÃO;

RESPONSÁVEL;

PRIMEIRO VENCIMENTO.

Cálculo automático

ts

Collapse

 Copy

valorParcela = valorTotal / numeroParcelas


O sistema deve permitir ajustes de centavos na última parcela, caso necessário.

Exibição

text

Collapse

 Copy

NOTEBOOK
PARCELA 5/12
FALTAM 7 PARCELAS
R$ 350,00 POR MÊS
RESTANTE: R$ 2.450,00


Funcionalidades

Gerar parcelas automaticamente;

Marcar parcela paga;

Antecipar parcelas;

Cancelar compra;

Visualizar impacto nos meses seguintes;

Filtrar por cartão, categoria ou responsável.

12. Aba 7 — FATURAS

Objetivo

Centralizar as faturas dos cartões.

Seleção

Permitir filtrar por:

Cartão;

Forma de pagamento;

Mês;

Status da fatura.

Informações do cartão

Exibir:

Nome do cartão;

Bandeira;

Últimos quatro dígitos;

Limite total;

Limite disponível;

Dia de fechamento;

Dia de vencimento;

Fatura atual.

Extrato unificado

A fatura deverá somar:

Compras à vista feitas no cartão;

Parcelas ativas no mês;

Custos fixos associados ao cartão.

ts

Collapse

 Copy

valorFatura =
  comprasAVista +
  parcelasAtivas +
  custosFixosDoCartao


Status

ABERTA;

FECHADA;

VENCE HOJE;

VENCIDA;

PAGA.

13. Aba 8 — LISTA DE COMPRAS

Objetivo

Gerenciar múltiplas listas de compras.

Listas

Exemplos:

PRINCIPAL;

CHURRASCO;

FARMÁCIA;

CASA;

VIAGEM;

MATERIAL ESCOLAR.

Dados dos itens

NOME;

CATEGORIA;

QUANTIDADE;

UNIDADE;

PREÇO ESTIMADO;

PRIORIDADE;

CONCLUÍDO.

Unidades

UN;

KG;

L;

PCT;

CX;

FR;

DZ.

Regras padrão

Hortifruti: KG;

Açougue: KG;

Bebidas: UN ou L;

Limpeza: UN;

Mercearia: UN ou PCT.

Permitir alterar manualmente a unidade.

14. Aba 9 — MODO MERCADO

Objetivo

Oferecer uma interface otimizada para uso durante as compras.

Subaba: CARRINHO AO VIVO

Interface com:

Fontes ampliadas;

Botões grandes;

Alto contraste;

Ações acessíveis com uma mão;

Campo de preço rápido;

Itens já comprados;

Total acumulado.

Cálculo de preço

Para produtos por unidade:

ts

Collapse

 Copy

subtotal = quantidade * precoUnitario


Para produtos por peso:

ts

Collapse

 Copy

subtotal = peso * precoPorKg


Rodapé fixo

Exibir:

text

Collapse

 Copy

TOTAL ESTIMADO: R$ 350,00
TOTAL REAL: R$ 327,80
DIFERENÇA: -R$ 22,20


O rodapé deve utilizar degradê laranja e permanecer fixo na parte inferior.

Subaba: HISTÓRICO E CÓPIAS

Permitir:

Ver compras anteriores;

Duplicar listas;

Comparar valores;

Ver estabelecimento;

Identificar aumento de preços;

Reutilizar lista antiga.

15. Aba 10 — AGENDA E COMPROMISSOS

Categorias

MERCADO;

CONTAS;

FOLGA;

LAZER;

TRABALHO;

SAÚDE;

FAMÍLIA;

OUTROS.

Formulário

TÍTULO;

DATA;

HORÁRIO;

CATEGORIA;

RESPONSÁVEL;

LOCAL;

OBSERVAÇÃO;

RECORRÊNCIA;

NOTIFICAÇÃO.

Visualização

Exibir cartões cronológicos com:

Data;

Horário;

Título;

Categoria;

Responsável;

Status;

Indicador de sincronização externa.

16. Aba 11 — METAS E CAIXINHAS

Objetivo

Acompanhar objetivos financeiros e reservas separadas.

Dados

NOME DO OBJETIVO;

VALOR ATUAL;

VALOR-ALVO;

PRAZO;

PRIORIDADE;

CONTRIBUIÇÃO MENSAL;

RESPONSÁVEL;

CONTA VINCULADA;

ÍCONE.

Exibição

text

Collapse

 Copy

VIAGEM
R$ 2.500,00 / R$ 8.000,00
31% CONCLUÍDO


A barra deverá ser preenchida em degradê laranja.

Recursos

Adicionar contribuição;

Retirar valor;

Visualizar histórico;

Calcular valor mensal necessário;

Projetar data de conclusão;

Marcar como concluída;

Criar caixinhas compartilhadas ou privadas.

17. Aba 12 — INVESTIMENTOS E CALCULADORA

Visão da carteira

Exibir:

VALOR APLICADO;

VALOR ATUAL;

RENTABILIDADE;

RESULTADO TOTAL;

DISTRIBUIÇÃO POR ATIVO;

EVOLUÇÃO DA CARTEIRA.

Ativos suportados

Tesouro Direto;

CDB;

LCI/LCA;

Ações;

FIIs;

ETFs;

Criptomoedas;

Reserva de emergência;

Outros.

Calculadora de aportes

Aporte necessário

Entradas:

Objetivo final;

Valor inicial;

Prazo;

Taxa estimada.

Saída:

Aporte mensal necessário.

Montante final

Entradas:

Aporte mensal;

Prazo;

Taxa estimada;

Valor inicial.

Saída:

Montante estimado.

Tempo necessário

Entradas:

Meta;

Aporte mensal;

Valor inicial;

Taxa estimada.

Saída:

Quantidade de meses necessários.

Os resultados devem ser apresentados como estimativas e não como recomendação financeira.

18. Aba 13 — CONFIGURAÇÕES E GESTÃO DE DADOS

Perfil

Permitir:

Alterar nome;

Alterar e-mail;

Adicionar foto;

Ajustar tamanho do avatar;

Selecionar moeda;

Definir tema;

Configurar notificações.

Membros da conta

Permitir cadastrar:

PESSOA A;

PESSOA B;

Nome personalizado;

Avatar;

Cor de identificação;

Permissões;

Preferências de privacidade.

Regras de cartão

Configurar:

Dia padrão de fechamento;

Dia de vencimento;

Exceções por mês;

Feriados;

Cartões adicionais.

Gerenciador global

Permitir editar:

Categorias;

Formas de pagamento;

Contas;

Cartões;

Responsáveis;

Tags.

Visual dos itens:

Etiquetas pretas;

Borda laranja;

Ícone de edição;

Opção de arquivar.

Exportação

Formatos:

Excel;

CSV;

JSON;

PDF.

Backup

Permitir:

Criar cópia de segurança;

Baixar arquivo JSON;

Restaurar backup;

Visualizar data do último backup;

Ativar backup automático.

Zona de perigo

Ações destrutivas:

Limpar lançamentos;

Excluir todos os dados;

Restaurar configuração de fábrica;

Encerrar conta.

Todas as ações devem exigir:

Tela de confirmação;

Digitação de uma palavra de confirmação;

Aviso sobre irreversibilidade;

Possibilidade de backup antes da exclusão.

19. Matriz de Eisenhower

Objetivo

Organizar tarefas de acordo com urgência e importância.

Quadrantes

FAZER AGORA

Urgentes;

Importantes;

Bordas laranja;

Maior destaque visual.

AGENDAR

Importantes;

Sem urgência imediata;

Cor azul ou laranja suave.

DELEGAR/DIVIDIR

Urgentes;

Podem ser atribuídas ao parceiro;

Exibir responsável.

ELIMINAR

Sem urgência;

Sem importância;

Visual mais discreto.

Funcionalidades

Criar tarefa;

Arrastar entre quadrantes;

Atribuir responsável;

Definir prazo;

Adicionar lembrete;

Marcar como concluída;

Filtrar por usuário.

20. Hábitos individuais e compartilhados

Perfil de hábitos

No topo, utilizar um seletor em formato pill:

text

Collapse

 Copy

[ MEUS HÁBITOS ] [ HÁBITOS DE PARCEIRO ]


Privacidade

Cada hábito poderá ser:

PRIVADO;

COMPARTILHADO;

DESAFIO DO CASAL.

Hábitos privados não devem aparecer no painel do parceiro.

Controle de constância

Exibir:

Sequência atual;

Maior sequência;

Dias concluídos;

Percentual mensal;

Calendário de constância;

Ícone de chama laranja.

Grade mensal

Cada dia deverá ser preenchido conforme o cumprimento:

Sem preenchimento: não realizado;

Laranja claro: realizado;

Laranja forte: sequência ativa;

Degradê: melhor desempenho.

Desafios do casal

Permitir definir:

Hábito compartilhado;

Meta conjunta;

Participantes;

Prazo;

Percentual de cada pessoa;

Recompensa ou marco.

21. Sincronização e recursos técnicos

Sincronização em tempo real

Alterações feitas por um usuário devem aparecer no dispositivo do parceiro sem necessidade de atualizar manualmente.

Sincronizar:

Lançamentos;

Contas;

Listas;

Metas;

Hábitos compartilhados;

Compromissos;

Orçamentos;

Faturas;

Status de tarefas.

Exibir um pequeno indicador:

text

Collapse

 Copy

SINCRONIZADO AGORA
SINCRONIZANDO...
OFFLINE


Google Calendar

Permitir:

Conectar conta Google;

Importar compromissos;

Exibir eventos no calendário;

Diferenciar eventos internos e externos;

Configurar calendário padrão;

Desconectar integração.

Modo sem internet

O aplicativo deve permitir:

Criar lançamentos offline;

Marcar contas como pagas;

Editar listas;

Registrar produtos no mercado;

Marcar hábitos;

Criar lembretes.

Ao retornar a conexão:

Identificar operações pendentes;

Sincronizar automaticamente;

Resolver conflitos;

Informar o usuário;

Atualizar o estado local.

Controle de conflitos

Se dois usuários editarem o mesmo registro:

Priorizar a alteração mais recente;

Manter histórico da versão anterior;

Exibir aviso quando houver conflito;

Nunca apagar dados silenciosamente.

22. Arquitetura técnica sugerida

text

Collapse

 Copy

src/
├── app/
│   ├── dashboard/
│   ├── calendar/
│   ├── monthly-flow/
│   ├── budget/
│   ├── fixed-costs/
│   ├── installments/
│   ├── invoices/
│   ├── shopping-list/
│   ├── market-mode/
│   ├── agenda/
│   ├── goals/
│   ├── investments/
│   ├── settings/
│   ├── habits/
│   └── tasks/
├── components/
│   ├── ui/
│   ├── cards/
│   ├── charts/
│   ├── forms/
│   ├── modals/
│   ├── navigation/
│   ├── calendar/
│   └── feedback/
├── auth/
│   ├── auth.tsx
│   └── auth-middleware.ts
├── store/
│   └── store.tsx
├── utils/
│   ├── finance.ts
│   ├── dates.ts
│   ├── calculations.ts
│   └── formatters.ts
├── integrations/
│   ├── supabase.ts
│   ├── google-calendar.ts
│   └── offline-sync.ts
├── types/
│   └── index.ts
└── middleware.ts


23. Estado global

ts

Collapse

 Copy

type AppState = {
  user: User | null
  partner: User | null
  household: Household | null

  accounts: Account[]
  transactions: Transaction[]
  fixedCosts: FixedCost[]
  subscriptions: Subscription[]
  installments: Installment[]
  creditCards: CreditCard[]
  invoices: Invoice[]
  budgets: Budget[]
  goals: Goal[]
  investments: Investment[]

  shoppingLists: ShoppingList[]
  marketSessions: MarketSession[]
  appointments: Appointment[]
  reminders: Reminder[]
  tasks: Task[]
  habits: Habit[]

  notifications: Notification[]
  syncStatus: 'SYNCED' | 'SYNCING' | 'OFFLINE'
}


24. Utilitários financeiros

ts

Collapse

 Copy

formatCurrency(value: number): string

calculateBalance(transactions: Transaction[]): number

calculateIncome(transactions: Transaction[]): number

calculateExpenses(transactions: Transaction[]): number

calculateMonthlyResult(
  income: number,
  expenses: number
): number

calculateBudgetUsage(
  spent: number,
  budget: number
): number

calculateGoalProgress(
  current: number,
  target: number
): number

calculateInstallmentValue(
  total: number,
  count: number
): number

calculateInvoiceTotal(
  purchases: number,
  installments: number,
  fixedCosts: number
): number

calculateMarketSubtotal(
  quantity: number,
  unitPrice: number
): number

calculateProjectedBalance(
  currentBalance: number,
  futureTransactions: Transaction[]
): number


25. Regras de negócio

Lançamentos

Receitas aumentam o saldo;

Despesas reduzem o saldo;

Transferências não entram como receita ou despesa;

Investimentos devem ser exibidos separadamente;

Lançamentos cancelados não entram nos cálculos;

Lançamentos futuros entram apenas no saldo projetado;

Todo gasto deve possuir um responsável;

Gastos conjuntos devem usar o responsável “AMBAS”.

Faturas

ts

Collapse

 Copy

fatura =
  comprasAVistaNoCartao +
  parcelasAtivas +
  custosFixosDoCartao


Orçamento

Despesas pagas e válidas entram no cálculo realizado;

Despesas futuras aparecem como comprometimento;

Acima de 100%, a barra fica vermelha;

O usuário pode definir alertas personalizados.

Parcelas

Cada parcela deve possuir data própria;

O sistema deve gerar automaticamente as parcelas futuras;

O valor restante precisa ser atualizado após cada pagamento;

Alterações no parcelamento devem atualizar o fluxo e a fatura.

Privacidade

Dados compartilhados ficam disponíveis para os membros autorizados;

Hábitos privados ficam visíveis somente para o proprietário;

Ações administrativas devem respeitar permissões;

Exclusões devem exigir confirmação.

26. Responsividade

Mobile

Prioridades:

Operação com uma mão;

Botões grandes;

Formulários curtos;

Navegação inferior;

Botão “+” central;

Rodapés fixos no Modo Mercado;

Cards empilhados;

Gráficos simplificados.

Tablet

Grid de duas colunas;

Menu lateral recolhível;

Visualização ampliada de calendário;

Mais informações por card.

Desktop

Barra lateral fixa;

Dashboard com múltiplas colunas;

Tabelas completas;

Gráficos maiores;

Atalhos de teclado;

Visão detalhada de relatórios.

27. Acessibilidade

O MULTICAP deve garantir:

Contraste elevado;

Navegação por teclado;

Labels em todos os campos;

Tamanho adequado para toque;

Não depender exclusivamente das cores;

Ícones acompanhados de texto quando necessário;

Feedback textual em ações importantes;

Compatibilidade com leitores de tela;

Opção de aumentar fonte;

Controle de animações.

28. Segurança

Autenticação via Supabase;

Rotas protegidas;

Políticas de segurança por usuário e grupo;

Row Level Security no banco;

Validação frontend e backend;

Proteção contra exclusões acidentais;

Chaves privadas somente no servidor;

Sessões persistentes e revogáveis;

Auditoria de alterações importantes;

Backup manual e automático.

29. Roadmap de desenvolvimento

Fase 1 — MVP financeiro

Autenticação;

Gestão de membros;

Dashboard;

Fluxo mensal;

Categorias;

Contas;

Calendário;

Orçamento;

Sincronização básica.

Fase 2 — Controle financeiro avançado

Custos fixos;

Parcelados;

Faturas;

Cartões;

Metas;

Relatórios;

Notificações.

Fase 3 — Rotina e produtividade

Lista de compras;

Modo Mercado;

Agenda;

Lembretes;

Matriz de Eisenhower;

Hábitos.

Fase 4 — Inteligência e integrações

Google Calendar;

Modo offline;

Importação de extrato;

Integração bancária;

Sugestão automática de categorias;

Detecção de assinaturas;

Alertas de saldo projetado;

Relatórios inteligentes.

30. Resultado esperado

O MULTICAP deve ser percebido como um painel central da vida financeira e doméstica do casal, combinando:

Controle financeiro;

Planejamento;

Compras;

Agenda;

Hábitos;

Tarefas;

Investimentos;

Metas;

Colaboração em tempo real.

A principal regra de experiência deve ser:

Registrar rapidamente, visualizar com clareza e tomar decisões melhores.

O visual final deve combinar preto profundo, grafite, laranja em degradê, transparências e alto contraste, criando uma experiência premium, moderna e funcional em qualquer dispositivo.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/943e3cdc-ee5e-45f7-ad63-ade955572701).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
