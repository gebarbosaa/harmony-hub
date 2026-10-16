import { createFileRoute } from "@tanstack/react-router";
import { PersonalModule } from "@/components/personal/PersonalModule";
export const Route = createFileRoute("/alimentacao")({ component: () => <PersonalModule module="alimentacao" />, head: () => ({ meta: [{ title: "ALIMENTAÇÃO — HARMONY HUB" }] }) });