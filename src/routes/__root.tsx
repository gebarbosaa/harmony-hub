import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, useRouterState, useNavigate, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppShell } from "@/components/layout/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { GlobalMonthProvider } from "@/hooks/use-global-month";

const PUBLIC_ROUTES = ["/login", "/auth/callback"];

function NotFoundComponent() { return <div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="max-w-md text-center"><h1 className="text-7xl font-bold text-foreground">404</h1><h2 className="mt-4 text-xl font-semibold text-foreground">PÁGINA NÃO ENCONTRADA</h2><p className="mt-2 text-sm text-muted-foreground">A PÁGINA QUE VOCÊ PROCURA NÃO EXISTE OU FOI MOVIDA.</p><div className="mt-6"><Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">IR PARA O INÍCIO</Link></div></div></div>; }

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) { console.error(error); const router = useRouter(); useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]); return <div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="max-w-md text-center"><h1 className="text-xl font-semibold tracking-tight text-foreground">ERRO AO CARREGAR</h1><p className="mt-2 text-sm text-muted-foreground">ALGO DEU ERRADO. TENTE ATUALIZAR A PÁGINA.</p><div className="mt-6 flex flex-wrap justify-center gap-2"><button onClick={() => { router.invalidate(); reset(); }} className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">TENTAR NOVAMENTE</button><a href="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground">IR PARA O INÍCIO</a></div></div></div>; }

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({ head: () => ({ meta: [{ charSet: "utf-8" }, { name: "viewport", content: "width=device-width, initial-scale=1" }, { title: "MULTICAP — GESTÃO FINANCEIRA" }, { name: "description", content: "PAINEL COMPARTILHADO DE FINANÇAS, ROTINA, METAS E HÁBITOS." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }], links: [{ rel: "stylesheet", href: appCss }, { rel: "preconnect", href: "https://fonts.googleapis.com" }, { rel: "preconnect", href: "https://fonts.gstatic.com" }, { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" }, { rel: "icon", href: "/favicon.ico", type: "image/x-icon" }] }), shellComponent: RootShell, component: RootComponent, notFoundComponent: NotFoundComponent, errorComponent: ErrorComponent });

function RootShell({ children }: { children: ReactNode }) { return <html lang="pt-BR" className="dark"><head><HeadContent /></head><body>{children}<Scripts /></body></html>; }
function RootComponent() { const { queryClient } = Route.useRouteContext(); return <QueryClientProvider client={queryClient}><AuthProvider><GlobalMonthProvider><AuthGate /><Toaster position="top-center" /></GlobalMonthProvider></AuthProvider></QueryClientProvider>; }

function AuthGate() {
  const { loading, profileLoading, session, profile } = useAuth();
  const pathname = useRouterState({ select: s => s.location.pathname });
  const navigate = useNavigate();
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isOnboarding = pathname === "/onboarding";

  useEffect(() => {
    if (loading || profileLoading) return;
    if (!session) {
      if (!isPublicRoute) navigate({ to: "/login" });
      return;
    }
    if (isPublicRoute) {
      navigate({ to: "/" });
      return;
    }
    if (!profile) {
      if (!isOnboarding) navigate({ to: "/onboarding" });
      return;
    }
    if (!profile.household_id) {
      if (!isOnboarding) navigate({ to: "/onboarding" });
      return;
    }
    if (isOnboarding) navigate({ to: "/" });
  }, [loading, profileLoading, session, profile, isPublicRoute, isOnboarding, navigate]);

  if (loading || (session && profileLoading)) return <div className="flex min-h-screen items-center justify-center bg-background"><p className="label-caps text-sm text-muted-foreground">CARREGANDO...</p></div>;
  if (isPublicRoute || isOnboarding || !session) return <Outlet />;
  if (!profile?.household_id) return <div className="flex min-h-screen items-center justify-center bg-background"><p className="label-caps text-sm text-muted-foreground">PREPARANDO SEU HUB...</p></div>;
  return <AppShell><Outlet /></AppShell>;
}
