import { createFileRoute } from "@tanstack/react-router";
import { PersonalModule } from "@/components/personal/PersonalModule";

export const Route = createFileRoute("/treinos")({
  component: () => <PersonalModule module="treinos" />,
  head: () => ({ meta: [{ title: "TREINOS — HARMONY HUB" }] }),
});
