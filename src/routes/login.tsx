import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4c-7.5 0-14 4.2-17.7 10.7z" />
      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6c-2 1.5-4.6 2.4-7.7 2.4-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.9 39.8 16.4 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.6 5.6C41.4 35.9 44 30.4 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}

function LoginPage() {
  const { signInWithGoogle, session } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session) void navigate({ to: "/" });
  }, [session, navigate]);

  async function handleLogin() {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch {
      setError("Não foi possível iniciar o login com o Google. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <span className="gradient-primary flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-black text-primary-foreground">H</span>
          <div>
            <h1 className="label-caps text-2xl tracking-[0.2em]">HARMONY HUB</h1>
            <p className="mt-1 text-sm text-muted-foreground">Gestão financeira e de rotina para casais e famílias.</p>
          </div>
        </div>
        <button onClick={handleLogin} disabled={loading} className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-secondary/60 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary disabled:opacity-60">
          <GoogleIcon />
          {loading ? "Redirecionando..." : "Continuar com Google"}
        </button>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <p className="text-xs text-muted-foreground">Ao continuar, você concorda em compartilhar seu perfil básico do Google e, se autorizar, sua agenda do Google Calendário para sincronizar compromissos.</p>
      </div>
    </div>
  );
}
