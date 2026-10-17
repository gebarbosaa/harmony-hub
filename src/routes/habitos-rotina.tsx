import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/habitos-rotina")({
  beforeLoad: () => { throw redirect({ to: "/habitos", replace: true }); },
  head: () => ({ meta: [{ title: "HÁBITOS — HARMONY HUB" }] }),
});
