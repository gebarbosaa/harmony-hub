import { createFileRoute, redirect } from "@tanstack/react-router";

// Keep old bookmarks and links working while Ajustes is the canonical screen.
export const Route = createFileRoute("/configuracoes")({
  beforeLoad: () => { throw redirect({ to: "/ajustes", replace: true }); },
});
