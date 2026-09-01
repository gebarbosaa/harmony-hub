import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/onboarding")({ component: OnboardingPage });

function OnboardingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    void navigate({ to: "/", replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-sm text-muted-foreground">ABRINDO O HARMONY HUB...</div>
    </div>
  );
}
