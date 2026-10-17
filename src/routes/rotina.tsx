import { createFileRoute } from "@tanstack/react-router";
import { PersonalModule } from "@/components/personal/PersonalModule";

export const Route = createFileRoute("/rotina")({
  component: () => <PersonalModule module="rotina" />,
  head: () => ({ meta: [{ title: "ROTINA — HARMONY HUB" }] }),
});
