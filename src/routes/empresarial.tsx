import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/empresarial")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
