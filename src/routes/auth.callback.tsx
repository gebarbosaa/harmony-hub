import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // supabase-js reads the OAuth code/hash from the URL automatically
    // (detectSessionInUrl is on by default). We just wait for the session
    // to land, then move on.
    supabase.auth.getSession().then(({ data }) => {
      navigate({ to: data.session ? "/" : "/login" });
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        navigate({ to: "/" });
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="label-caps text-sm text-muted-foreground">Entrando...</p>
    </div>
  );
}
