import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Wallet,
  CreditCard,
  Repeat,
  Coins,
  AlertTriangle,
  ArrowRight,
  CalendarClock,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from "recharts";
import { PageHeader, Panel, StatCard, ProgressBar, Tag, PersonDot } from "@/components/ui-kit";
import {
  upcomingBills,
  monthlyEvolution,
  categoryDistribution,
  compositionData,
  splitData,
  appointments,
  goals,
} from "@/lib/mock-data";
import { formatCurrency, calculateGoalProgress, calculateBudgetUsage } from "@/lib/finance";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VISÃO GERAL — MULTICAP" },
      {
        name: "description",
        content: "Resumo financeiro do mês: saldo, gastos, vencimentos, metas e agenda do casal.",
      },
    ],
  }),
  component: Dashboard,
});

const PIE_COLORS = [
  "var(--orange-primary)",
  "var(--orange-light)",
  "var(--graphite-light)",
  "var(--muted-foreground)",
  "var(--danger)",
];

function Dashboard() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const mainGoal = goals[0] || {
    name: "Sem meta cadastrada",
    current: 0,
    target: 1,
    deadline: "-",
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="BOM DIA, MARIA"
        subtitle="Veja como estão as finanças de agosto de 2026."
        action={<Tag tone="primary">AGOSTO 2026</Tag>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="TOTAL DO MÊS"
          value={formatCurrency(6511.2)}
          delta="-19% vs. julho"
          tone="primary"
          icon={<Wallet className="h-4 w-4" />}
        />
        <StatCard
          label="À VISTA"
          value={formatCurrency(1691)}
          delta="+4% vs. julho"
          tone="danger"
          icon={<Coins className="h-4 w-4" />}
        />
        <StatCard
          label="PARCELADOS"
          value={formatCurrency(1280)}
          delta="7 compras ativas"
          tone="info"
          icon={<CreditCard className="h-4 w-4" />}
        />
        <StatCard
          label="CUSTOS FIXOS"
          value={formatCurrency(3140)}
          delta="Estável"
          tone="success"
          icon={<Repeat className="h-4 w-4" />}
        />
      </div>

      <Panel className="border-warning/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/15 text-warning">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <h2 className="label-caps text-sm">VENCENDO EM BREVE</h2>
              <p className="text-xs text-muted-foreground">4 contas nos próximos 5 dias</p>
            </div>
          </div>
          <Link
            to="/faturas"
            className="label-caps rounded-xl border border-primary/60 px-3 py-2 text-[11px] text-primary transition-colors hover:bg-primary/10"
          >
            VER CONTAS
          </Link>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {upcomingBills.map((bill) => (
            <div
              key={bill.id}
              className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 px-3 py-2.5"
            >
              <div>
                <p className="label-caps text-[11px]">{bill.name}</p>
                <Tag tone={bill.tone}>{bill.due}</Tag>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">{formatCurrency(bill.amount)}</p>
                <button className="label-caps text-[10px] text-primary">MARCAR COMO PAGA</button>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="EVOLUÇÃO ANUAL" className="lg:col-span-2">
          <div className="h-64">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyEvolution}>
                  <defs>
                    <linearGradient id="g-gastos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--orange-primary)" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="var(--orange-primary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} width={48} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => formatCurrency(v)}
                  />
                  <Area
                    type="monotone"
                    dataKey="gastos"
                    stroke="var(--orange-primary)"
                    strokeWidth={2.5}
                    fill="url(#g-gastos)"
                  />
                  <Area
                    type="monotone"
                    dataKey="receitas"
                    stroke="var(--success)"
                    strokeWidth={2}
                    fill="transparent"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>

        <Panel title="DISTRIBUIÇÃO DE GASTOS">
          <div className="h-64">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryDistribution}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {categoryDistribution.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={entry.value > entry.budget ? "var(--danger)" : PIE_COLORS[index % 5]}
                      />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 10, letterSpacing: "0.08em" }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => formatCurrency(v)}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="COMPOSIÇÃO FINANCEIRA">
          <div className="h-56">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compositionData}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={10} width={48} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "var(--secondary)" }}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => formatCurrency(v)}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="var(--orange-primary)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>

        <Panel title="DIVISÃO DE CUSTOS">
          <div className="space-y-4 pt-2">
            {splitData.map((person) => {
              const total = splitData.reduce((sum, p) => sum + p.value, 0) || 1;
              const percent = (person.value / total) * 100;
              return (
                <div key={person.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <PersonDot name={person.name} />
                    <span className="text-sm font-semibold">{formatCurrency(person.value)}</span>
                  </div>
                  <ProgressBar percent={percent} tone="primary" />
                  <p className="text-[11px] text-muted-foreground">{Math.round(percent)}% do total</p>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="MAIORES CATEGORIAS" className="lg:col-span-2">
          <div className="space-y-4">
            {categoryDistribution.map((cat) => {
              const usage = calculateBudgetUsage(cat.value, cat.budget);
              return (
                <div key={cat.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="label-caps text-[11px]">{cat.name}</span>
                    <span className="font-semibold">{formatCurrency(cat.value)}</span>
                  </div>
                  <ProgressBar percent={usage} />
                  <p className="text-[11px] text-muted-foreground">
                    {Math.round(usage)}% do orçamento de {formatCurrency(cat.budget)}
                  </p>
                </div>
              );
            })}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="PRÓXIMOS COMPROMISSOS">
            <ul className="space-y-3">
              {appointments.slice(0, 4).map((item) => (
                <li key={item.id} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary">
                    <CalendarClock className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="label-caps truncate text-[11px]">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {item.date} · {item.time} · {item.category}
                    </p>
                  </div>
                  {item.external ? <Tag tone="info">GOOGLE</Tag> : null}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="META PRINCIPAL">
            <p className="label-caps text-sm">{mainGoal.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatCurrency(mainGoal.current)} / {formatCurrency(mainGoal.target)}
            </p>
            <div className="mt-3">
              <ProgressBar
                percent={calculateGoalProgress(mainGoal.current, mainGoal.target)}
                tone="primary"
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                {Math.round(calculateGoalProgress(mainGoal.current, mainGoal.target))}% concluído
              </span>
              <span>Previsão: {mainGoal.deadline}</span>
            </div>
            <Link
              to="/metas"
              className="label-caps mt-4 inline-flex items-center gap-1 text-[11px] text-primary"
            >
              VER TODAS AS METAS <ArrowRight className="h-3 w-3" />
            </Link>
          </Panel>
        </div>
      </div>
    </div>
  );
}
