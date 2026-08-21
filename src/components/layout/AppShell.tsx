import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Plus,
  LayoutDashboard,
  ArrowLeftRight,
  CalendarDays,
  LayoutGrid,
  Bell,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { navGroups, quickAddOptions } from "./nav";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const bottomItems = [
  { label: "VISÃO", to: "/", icon: LayoutDashboard },
  { label: "FLUXO", to: "/fluxo", icon: ArrowLeftRight },
  { label: "AGENDA", to: "/calendario", icon: CalendarDays },
  { label: "MAIS", to: "/mais", icon: LayoutGrid },
];

const quickRoutes: Record<string, string> = {
  "DESPESA": "/fluxo?tipo=DESPESA",
  "RECEITA": "/fluxo?tipo=RECEITA",
  "TRANSFERÊNCIA": "/fluxo?tipo=TRANSFERENCIA",
  "CONTA": "/custos-fixos",
  "COMPRA PARCELADA": "/parcelados",
  "META": "/metas",
  "COMPROMISSO": "/agenda",
  "LEMBRETE": "/agenda",
  "ITEM DE LISTA": "/lista",
};

function QuickAdd({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  async function openRegistration(option: string) {
    const destination = quickRoutes[option] || "/fluxo";
    setOpen(false);
    await navigate({ to: destination as never });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Cadastro rápido"
          className={cn(
            "gradient-primary shadow-elegant flex h-14 w-14 items-center justify-center rounded-full text-primary-foreground transition-transform active:scale-95",
            className,
          )}
        >
          <Plus className="h-7 w-7" strokeWidth={2.5} />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="label-caps text-base">CADASTRO RÁPIDO</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {quickAddOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => void openRegistration(option)}
              className="label-caps rounded-xl border border-border bg-secondary/60 px-3 py-3 text-center text-[11px] text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {option}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex items-center gap-2 px-5 py-6">
          <span className="gradient-primary flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black text-primary-foreground">
            M
          </span>
          <span className="label-caps text-lg tracking-[0.2em]">MULTICAP</span>
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-8">
          {navGroups.map((group) => (
            <div key={group.group}>
              <p className="label-caps px-3 pb-2 text-[10px] text-muted-foreground">
                {group.group}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = pathname === item.to;
                  return (
                    <Link
                      key={item.to}
                      to={item.to as never}
                      className={cn(
                        "label-caps flex items-center gap-3 rounded-xl px-3 py-2 text-[11px] transition-colors",
                        active
                          ? "gradient-soft border border-primary/40 text-primary"
                          : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <div className="glass sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-3 lg:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <span className="gradient-primary flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black text-primary-foreground">
              M
            </span>
            <span className="label-caps text-sm tracking-[0.2em]">MULTICAP</span>
          </div>
          <div className="hidden items-center gap-2 text-[11px] text-muted-foreground lg:flex">
            <RefreshCw className="h-3.5 w-3.5 text-success" />
            <span className="label-caps">SINCRONIZADO AGORA</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Notificações"
              className="relative rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:text-primary"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary" />
            </button>
            <UserMenu />
          </div>
        </div>

        <main className="mx-auto w-full max-w-7xl space-y-5 px-4 pb-32 pt-5 lg:px-8 lg:pb-12">
          {children}
        </main>
      </div>

      <div className="fixed bottom-5 right-5 z-40 hidden lg:block">
        <QuickAdd />
      </div>

      <nav className="glass fixed inset-x-0 bottom-0 z-40 flex items-end justify-around px-2 pb-3 pt-2 lg:hidden">
        {bottomItems.slice(0, 2).map((item) => (
          <BottomLink key={item.to} item={item} active={pathname === item.to} />
        ))}
        <div className="-mt-8">
          <QuickAdd />
        </div>
        {bottomItems.slice(2).map((item) => (
          <BottomLink key={item.to} item={item} active={pathname === item.to} />
        ))}
      </nav>
    </div>
  );
}

function UserMenu() {
  const { profile, user, signOut } = useAuth();
  const displayName = profile?.name ?? user?.email ?? "Usuário";
  const initials = profile?.initials ?? displayName.slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-sidebar-accent">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-primary-foreground"
            style={{ backgroundColor: profile?.color ?? "#FF6B00" }}
          >
            {initials}
          </span>
          <div className="hidden leading-tight sm:block">
            <p className="label-caps text-[11px]">{displayName}</p>
            <p className="text-[10px] text-muted-foreground">{user?.email}</p>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => void signOut()}>
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BottomLink({ item, active }: { item: (typeof bottomItems)[number]; active: boolean }) {
  return (
    <Link
      to={item.to as never}
      className={cn(
        "label-caps flex w-16 flex-col items-center gap-1 py-1 text-[9px]",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <item.icon className="h-5 w-5" />
      {item.label}
    </Link>
  );
}
