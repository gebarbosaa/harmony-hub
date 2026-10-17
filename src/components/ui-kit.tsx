import type { HTMLAttributes, ReactNode } from "react";
import { ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const CREATE_EVENT = "multicap:open-create";
type CreateDetail = { title?: string; option?: string; source?: string };
function normalizeTitle(value?: string) { return (value ?? "").trim().toUpperCase(); }
function displayText(value: string) { const text = value.trim(); return text ? text.toLocaleLowerCase("pt-BR").replace(/^\p{L}/u, char => char.toLocaleUpperCase("pt-BR")) : text; }

/* ============================================================
   UI Kit — shared building blocks.
   Every page in the app should compose from these primitives
   so the whole site reads as one product.
   ============================================================ */

/* ------------------------------- PageHeader ----------------------------- */
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="core-page-header flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{displayText(title)}</h1>
        {subtitle ? <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action ? <div className="page-header-action">{action}</div> : null}
    </header>
  );
}

/* ------------------------------- CreatePanel ---------------------------- */
function CreatePanel({ title, children, className, aside }: { title: string; children: ReactNode; className?: string; aside?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const normalizedTitle = normalizeTitle(title);
  useEffect(() => {
    const openHandler = (event: Event) => {
      const detail = (event as CustomEvent<CreateDetail>).detail ?? {};
      const requested = normalizeTitle(detail.title || detail.option);
      if (detail.source !== "quick-add" || requested !== normalizedTitle) return;
      setOpen(true);
    };
    window.addEventListener(CREATE_EVENT, openHandler);
    return () => window.removeEventListener(CREATE_EVENT, openHandler);
  }, [normalizedTitle]);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-md sm:p-5" role="presentation">
      <section
        id="novo-registro"
        data-create-form="true"
        role="dialog"
        aria-modal="true"
        aria-labelledby="novo-registro-titulo"
        className={cn("my-auto max-h-[min(88dvh,900px)] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-[24px] border border-border bg-card p-5 shadow-2xl sm:p-7", className)}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-semibold tracking-[0.18em] text-primary">NOVO REGISTRO</p>
            <h2 id="novo-registro-titulo" className="label-caps mt-1 text-sm text-foreground">{title}</h2>
          </div>
          <div className="flex items-center gap-2">
            {aside}
            <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" title="Fechar" className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        {children}
      </section>
    </div>
  );
}

/* --------------------------------- Panel -------------------------------- */
export function Panel({ children, className, title, aside, ...rest }: { children: ReactNode; className?: string; title?: string; aside?: ReactNode } & HTMLAttributes<HTMLElement>) {
  const isCreatePanel = !!title && /^(NOVO|ADICIONAR|CADASTRO|REGISTRAR)/i.test(title.trim());
  if (isCreatePanel) return <CreatePanel title={title!} {...(className ? { className } : {})} aside={aside}>{children}</CreatePanel>;
  return (
    <section {...rest} className={cn("app-card app-card-loose transition-shadow", className)}>
      {title || aside ? (
        <div className="app-card-header">
          {title ? <h2 className="app-card-title">{displayText(title!)}</h2> : <span />}
          {aside}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/* -------------------------------- StatCard ------------------------------ */
export function StatCard({ label, value, delta, icon, tone = "default" }: { label: string; value: string; delta?: string; icon?: ReactNode; tone?: "default" | "primary" | "success" | "danger" | "info" | "warning" }) {
  const toneRing = {
    default: "text-muted-foreground",
    primary: "text-primary",
    success: "text-success",
    danger: "text-danger",
    info: "text-info",
    warning: "text-warning",
  }[tone];
  return (
    <div className="group relative overflow-hidden rounded-[20px] border border-border/70 bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{displayText(label)}</span>
        <span className={toneRing}>{icon}</span>
      </div>
      <p className="relative mt-3 text-xl font-bold tracking-tight md:text-2xl">{value}</p>
      {delta ? <p className={cn("relative mt-1 text-xs", toneRing)}>{delta}</p> : null}
    </div>
  );
}

/* ------------------------------- ProgressBar ---------------------------- */
export function ProgressBar({ percent, tone }: { percent: number; tone?: "auto" | "primary" }) {
  const p = Math.min(percent, 100);
  const color = tone === "primary" || percent < 80 ? "gradient-primary" : percent < 100 ? "bg-warning" : "bg-danger";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
      <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${p}%` }} />
    </div>
  );
}

/* ----------------------------------- Tag -------------------------------- */
export function Tag({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "primary" | "success" | "danger" | "warning" | "info" }) {
  const tones = {
    neutral: "border-border text-muted-foreground",
    primary: "border-primary/60 text-primary",
    success: "border-success/60 text-success",
    danger: "border-danger/60 text-danger",
    warning: "border-warning/60 text-warning",
    info: "border-info/60 text-info",
  }[tone];
  return (
    <span className={cn("label-caps inline-flex items-center rounded-lg border bg-background/70 px-2 py-1 text-[9px] font-medium", tones)}>
      {children}
    </span>
  );
}

/* -------------------------------- PersonDot ----------------------------- */
export function PersonDot({ name }: { name: string }) {
  const color = name === "MARIA" ? "bg-primary" : name === "LUCAS" ? "bg-info" : "gradient-primary";
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className={cn("h-2 w-2 rounded-full", color)} />
      {name}
    </span>
  );
}

/* ============================================================
   NEW: standardized building blocks used across the whole site.
   These are the result of the site-wide design standardization
   pass — every page should compose from these instead of
   re-inventing layout patterns per route.
   ============================================================ */

/* ----------------------------------- Hero --------------------------------
   Calm welcome/banner block. Use as the first thing on most pages.
   Composes: eyebrow + title + description + actions + optional art slot. */
export function Hero({ eyebrow, title, description, actions, art }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode; art?: ReactNode }) {
  return (
    <section className="app-hero">
      <div className="app-hero-copy">
        {eyebrow ? <p className="app-eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
        {actions ? <div className="app-hero-actions">{actions}</div> : null}
      </div>
      {art}
    </section>
  );
}

/* ------------------------------ SectionHeading ---------------------------
   Section title + description + optional counter pill + optional action row.
   The default anchor for every section in the app. */
export function SectionHeading({ eyebrow, title, description, count, actions, className, id }: { eyebrow?: string; title: string; description?: string; count?: ReactNode; actions?: ReactNode; className?: string; id?: string }) {
  return (
    <div className={cn("app-section-heading", className)}>
      <div>
        {eyebrow ? <p className="app-eyebrow">{eyebrow}</p> : null}
        <h2 id={id}>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {(count || actions) ? (
        <div className="app-section-actions">
          {count}
          {actions}
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------- EmptyState -----------------------------
   Default empty state — used in 20+ pages. Icon + title + description + optional CTA. */
export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("app-empty", className)}>
      {icon ? <span className="app-empty-icon">{icon}</span> : null}
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/* ------------------------------- SegmentedControl ------------------------
   Two-or-three way toggle (PESSOAL/EMPRESARIAL, day filters, etc.). */
export type SegmentedOption<T extends string> = { value: T; label: string; icon?: ReactNode };
export function SegmentedControl<T extends string>({ value, onChange, options, ariaLabel }: { value: T; onChange: (next: T) => void; options: SegmentedOption<T>[]; ariaLabel?: string }) {
  return (
    <div className="app-segmented" role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className="app-segmented-btn"
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------- IconBadge ------------------------------
   A small, colored square to prefix a stat, row or list item. */
export type IconTone = "primary" | "success" | "danger" | "warning" | "info" | "muted";
export function IconBadge({ icon, tone = "primary", size = "md", className }: { icon: ReactNode; tone?: IconTone; size?: "sm" | "md" | "lg"; className?: string }) {
  return (
    <span className={cn("app-icon-badge", size === "sm" && "app-icon-badge-sm", size === "lg" && "app-icon-badge-lg", `app-tone-${tone}`, className)}>
      {icon}
    </span>
  );
}

/* ----------------------------------- Button ------------------------------
   Three sizes, four variants. Replaces ad-hoc rounded-* + bg-* + text-*
   combinations. */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";
export function Button({ children, variant = "primary", size = "md", icon, iconRight, className, ...rest }: { children: ReactNode; variant?: ButtonVariant; size?: ButtonSize; icon?: ReactNode; iconRight?: ReactNode; className?: string } & HTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...rest} className={cn("app-btn", `app-btn-${size}`, `app-btn-${variant}`, className)}>
      {icon}
      {children}
      {iconRight}
    </button>
  );
}

/* --------------------------------- Toolbar -------------------------------
   A row of controls above a list/table — keeps spacing consistent. */
export function Toolbar({ title, description, actions, children, className }: { title?: string; description?: string; actions?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={cn("app-toolbar", className)}>
      {(title || description) ? (
        <div className="app-toolbar-title">
          {title || description ? (
            <div>
              {title ? <h2>{title}</h2> : null}
              {description ? <p>{description}</p> : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {actions ? <div className="app-toolbar-actions">{actions}</div> : null}
      {children}
    </div>
  );
}

/* --------------------------------- DataList ------------------------------
   Vertical list of rows inside a card. Replaces ad-hoc divs+border-top+gap combos. */
export function DataList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("app-list", className)}>{children}</div>;
}
export function DataListRow({ title, meta, aside, leading, className }: { title: ReactNode; meta?: ReactNode; aside?: ReactNode; leading?: ReactNode; className?: string }) {
  return (
    <div className={cn("app-list-row", className)}>
      {leading}
      <div className="app-list-row-main">
        <div className="app-list-row-title">{title}</div>
        {meta ? <div className="app-list-row-meta">{meta}</div> : null}
      </div>
      {aside ? <div className="app-list-row-aside">{aside}</div> : null}
    </div>
  );
}

/* ----------------------------------- Tabs --------------------------------
   Pill-style tab bar. Use for week/day filters, sub-page navigation, etc. */
export type TabOption<T extends string> = { value: T; label: string; icon?: ReactNode };
export function Tabs<T extends string>({ value, onChange, options, ariaLabel }: { value: T; onChange: (next: T) => void; options: TabOption<T>[]; ariaLabel?: string }) {
  return (
    <div className="app-tabs" role="tablist" aria-label={ariaLabel}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            aria-current={active ? "page" : undefined}
            onClick={() => onChange(option.value)}
            className="app-tab"
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------------- Field ---------------------------------
   Label + control stack used across 30+ pages. */
export function Field({ label, htmlFor, children, className }: { label: string; htmlFor?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("app-field", className)}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}

/* -------------------------------- Stat -----------------------------------
   Compact stat tile — number + label + optional sub. */
export function Stat({ label, value, sub, className }: { label: string; value: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={cn("app-stat", className)}>
      <span>{label}</span>
      <strong>{value}</strong>
      {sub ? <small>{sub}</small> : null}
    </div>
  );
}

/* ------------------------------- Shortcuts -------------------------------
   A pill strip of quick-link buttons (used on home, painel). */
export function Shortcuts({ children }: { children: ReactNode }) {
  return <div className="app-shortcuts">{children}</div>;
}

/* ---------------------------------- Link ---------------------------------
   Inline "see more →" link. */
export function TextLink({ children, href, onClick, className, ...rest }: { children: ReactNode; href?: string; onClick?: () => void; className?: string } & HTMLAttributes<HTMLAnchorElement>) {
  if (href) {
    return (
      <a href={href} onClick={onClick} className={cn("app-link", className)} {...rest}>
        {children}
        <ChevronRight className="h-3.5 w-3.5" />
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cn("app-link", className)} {...(rest as unknown as HTMLAttributes<HTMLButtonElement>)}>
      {children}
      <ChevronRight className="h-3.5 w-3.5" />
    </button>
  );
}
