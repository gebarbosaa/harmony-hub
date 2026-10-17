import { createFileRoute } from "@tanstack/react-router";
import { PersonalModule } from "@/components/personal/PersonalModule";

export const Route = createFileRoute("/habitos")({
  component: () => <PersonalModule module="habitos-rotina" />,
  head: () => ({ meta: [{ title: "HÁBITOS — HARMONY HUB" }] }),
});
