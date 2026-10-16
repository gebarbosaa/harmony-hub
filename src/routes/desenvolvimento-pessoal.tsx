import { createFileRoute } from "@tanstack/react-router";
import { PersonalModule } from "@/components/personal/PersonalModule";
export const Route = createFileRoute("/desenvolvimento-pessoal")({ component: () => <PersonalModule module="desenvolvimento-pessoal" />, head: () => ({ meta: [{ title: "DESENVOLVIMENTO PESSOAL — HARMONY HUB" }] }) });