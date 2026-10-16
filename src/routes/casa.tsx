import { createFileRoute } from "@tanstack/react-router";
import { PersonalModule } from "@/components/personal/PersonalModule";
export const Route = createFileRoute("/casa")({ component: () => <PersonalModule module="casa" />, head: () => ({ meta: [{ title: "CASA — HARMONY HUB" }] }) });