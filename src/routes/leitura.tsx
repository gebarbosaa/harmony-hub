import { createFileRoute } from "@tanstack/react-router";
import { PersonalModule } from "@/components/personal/PersonalModule";
export const Route = createFileRoute("/leitura")({ component: () => <PersonalModule module="leitura" />, head: () => ({ meta: [{ title: "LEITURA — HARMONY HUB" }] }) });