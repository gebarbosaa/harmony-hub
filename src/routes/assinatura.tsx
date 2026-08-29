import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/assinatura")({
  head: () => ({ meta: [{ title: "CUSTOS FIXOS E ASSINATURAS — MULTICAP" }] }),
  component: SubscriptionRedirect,
});

function SubscriptionRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    if (typeof window !== "undefined") {
      const pending = sessionStorage.getItem("multicap:pending-create");
      if (pending === "NOVA ASSINATURA") {
        sessionStorage.setItem("multicap:pending-create", "NOVO CUSTO FIXO");
      }
    }
    void navigate({ to: "/custos-fixos" as never, replace: true });
  }, [navigate]);
  return null;
}
