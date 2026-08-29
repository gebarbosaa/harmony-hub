import type { HTMLAttributes, ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const CREATE_EVENT = "multicap:open-create";
type CreateDetail = { title?: string; option?: string };

function normalizeTitle(value?: string) { return (value ?? "").trim().toUpperCase(); }

function CreateButton({ title }: { title: string }) {
  function handleClick() {
    const normalized = normalizeTitle(title);
    window.dispatchEvent(new CustomEvent<CreateDetail>(CREATE_EVENT, { detail: { title: normalized, option: normalized } }));
  }
  return <button type="button" onClick={handleClick} aria-label={`ADICIONAR ${title}`} title={`ADICIONAR ${title}`} className="group flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-card text-muted-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/5 hover:text-primary active:scale-95"><Plus className="h-5 w-5 transition-transform group-hover:rotate-90" strokeWidth={2} /></button>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  const noDefaultCreate = ["MODO MERCADO", "HÁBITOS", "LISTA DE COMPRAS", "ROTINA DA CASA", "ANOTAÇÕES"].includes(normalizeTitle(title));
  return <header className="flex flex-wrap items-center justify-between gap-4"><div><div className="flex items-center gap-2"><span className="h-7 w-1 rounded-full bg-primary" /><h1 className="label-caps text-2xl font-bold tracking-tight text-foreground md:text-3xl">{title}</h1></div>{subtitle ? <p className="ml-3 mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}</div>{action ?? (noDefaultCreate ? null : <CreateButton title={title} />)}</header>;
}

function CreatePanel({ title, children, className, aside }: { title: string; children: ReactNode; className?: string; aside?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const normalizedTitle = normalizeTitle(title);
  useEffect(() => {
    const openHandler = (event: Event) => {
      const detail = (event as CustomEvent<CreateDetail>).detail ?? {};
      const requested = normalizeTitle(detail.title || detail.option);
      if (requested !== normalizedTitle) return;
      setOpen(true);
    };
    window.addEventListener(CREATE_EVENT, openHandler);
    return () => window.removeEventListener(CREATE_EVENT, openHandler);
  }, [normalizedTitle]);
  useEffect(() => { if (!open) return; const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); }; document.addEventListener("keydown", onKeyDown); return () => document.removeEventListener("keydown", onKeyDown); }, [open]);
  if (!open) return null;
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-3 backdrop-blur-md sm:p-5" onMouseDown={() => setOpen(false)}><section id="novo-registro" data-create-form="true" className={cn("max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-border bg-card p-5 shadow-2xl md:p-6", className)} onMouseDown={event => event.stopPropagation()}><div className="mb-5 flex items-center justify-between gap-3"><div><p className="text-[9px] font-semibold tracking-[0.18em] text-primary">NOVO REGISTRO</p><h2 className="label-caps mt-1 text-sm text-foreground">{title}</h2></div><div className="flex items-center gap-2">{aside}<button type="button" onClick={() => setOpen(false)} aria-label="Fechar" title="Fechar" className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"><X className="h-4 w-4" /></button></div></div>{children}</section></div>;
}

export function Panel({ children, className, title, aside, ...rest }: { children: ReactNode; className?: string; title?: string; aside?: ReactNode } & HTMLAttributes<HTMLElement>) {
  const isCreatePanel = !!title && /^(NOVO|ADICIONAR|CADASTRO|REGISTRAR)/i.test(title.trim());
  if (isCreatePanel) return <CreatePanel title={title!} {...(className ? { className } : {})} aside={aside}>{children}</CreatePanel>;
  return <section {...rest} className={cn("rounded-2xl border border-border/70 bg-card p-5 shadow-[0_12px_40px_-30px_rgba(0,0,0,0.8)] transition-shadow hover:shadow-[0_16px_45px_-32px_rgba(0,0,0,0.9)] md:p-6", className)}>{title || aside ? <div className="mb-5 flex items-center justify-between gap-3 border-b border-border/50 pb-3">{title ? <h2 className="label-caps text-[11px] font-semibold text-foreground">{title}</h2> : <span />}{aside}</div> : null}{children}</section>;
}

export function StatCard({ label, value, delta, icon, tone = "default" }: { label: string; value: string; delta?: string; icon?: ReactNode; tone?: "default" | "primary" | "success" | "danger" | "info" }) { const toneRing = { default: "text-muted-foreground", primary: "text-primary", success: "text-success", danger: "text-danger", info: "text-info" }[tone]; return <div className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg"><div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" /><div className="relative flex items-start justify-between gap-2"><span className="label-caps text-[9px] font-semibold text-muted-foreground">{label}</span><span className={toneRing}>{icon}</span></div><p className="relative mt-3 text-xl font-bold tracking-tight md:text-2xl">{value}</p>{delta ? <p className={cn("relative mt-1 text-xs", toneRing)}>{delta}</p> : null}</div>; }
export function ProgressBar({ percent, tone }: { percent: number; tone?: "auto" | "primary" }) { const p = Math.min(percent, 100); const color = tone === "primary" || percent < 80 ? "gradient-primary" : percent < 100 ? "bg-warning" : "bg-danger"; return <div className="h-2 w-full overflow-hidden rounded-full bg-secondary"><div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${p}%` }} /></div>; }
export function Tag({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "primary" | "success" | "danger" | "warning" | "info" }) { const tones = { neutral: "border-border text-muted-foreground", primary: "border-primary/60 text-primary", success: "border-success/60 text-success", danger: "border-danger/60 text-danger", warning: "border-warning/60 text-warning", info: "border-info/60 text-info" }[tone]; return <span className={cn("label-caps inline-flex items-center rounded-lg border bg-background/70 px-2 py-1 text-[9px] font-medium", tones)}>{children}</span>; }
export function PersonDot({ name }: { name: string }) { const color = name === "MARIA" ? "bg-primary" : name === "LUCAS" ? "bg-info" : "gradient-primary"; return <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className={cn("h-2 w-2 rounded-full", color)} />{name}</span>; }
