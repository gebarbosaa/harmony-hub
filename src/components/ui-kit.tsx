import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="label-caps text-2xl text-foreground md:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function Panel({
  children,
  className,
  title,
  aside,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  aside?: ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card p-4 shadow-[0_10px_30px_-24px_rgba(0,0,0,0.9)] md:p-5",
        className,
      )}
    >
      {title || aside ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? <h2 className="label-caps text-xs text-muted-foreground">{title}</h2> : <span />}
          {aside}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  delta,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  delta?: string;
  icon?: ReactNode;
  tone?: "default" | "primary" | "success" | "danger" | "info";
}) {
  const toneRing = {
    default: "text-muted-foreground",
    primary: "text-primary",
    success: "text-success",
    danger: "text-danger",
    info: "text-info",
  }[tone];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4">
      {tone === "primary" ? (
        <div className="gradient-soft pointer-events-none absolute inset-0 opacity-80" />
      ) : null}
      <div className="relative flex items-start justify-between gap-2">
        <span className="label-caps text-[10px] text-muted-foreground">{label}</span>
        <span className={toneRing}>{icon}</span>
      </div>
      <p className="relative mt-3 text-xl font-bold tracking-tight md:text-2xl">{value}</p>
      {delta ? <p className={cn("relative mt-1 text-xs", toneRing)}>{delta}</p> : null}
    </div>
  );
}

export function ProgressBar({ percent, tone }: { percent: number; tone?: "auto" | "primary" }) {
  const p = Math.min(percent, 100);
  const color =
    tone === "primary" || percent < 80
      ? "gradient-primary"
      : percent < 100
        ? "bg-warning"
        : "bg-danger";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${p}%` }} />
    </div>
  );
}

export function Tag({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "primary" | "success" | "danger" | "warning" | "info";
}) {
  const tones = {
    neutral: "border-border text-muted-foreground",
    primary: "border-primary/60 text-primary",
    success: "border-success/60 text-success",
    danger: "border-danger/60 text-danger",
    warning: "border-warning/60 text-warning",
    info: "border-info/60 text-info",
  }[tone];
  return (
    <span
      className={cn(
        "label-caps inline-flex items-center rounded-md border bg-background/60 px-2 py-0.5 text-[10px]",
        tones,
      )}
    >
      {children}
    </span>
  );
}

export function PersonDot({ name }: { name: string }) {
  const color =
    name === "MARIA" ? "bg-primary" : name === "LUCAS" ? "bg-info" : "gradient-primary";
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className={cn("h-2 w-2 rounded-full", color)} />
      {name}
    </span>
  );
}
