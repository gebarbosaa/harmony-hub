import { createFileRoute } from "@tanstack/react-router";
import { MorePage } from "./mais";

export const Route = createFileRoute("/painel")({
  head: () => ({ meta: [{ title: "PAINEL — HARMONY HUB" }] }),
  component: MorePage,
});
