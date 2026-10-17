import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import path from "path";

export default defineConfig({
  plugins: [
    // tanstackStart MUST come before react()
    tanstackStart(),
    nitro({ preset: "vercel" }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    // Vite 8 dropped the `--allowed-hosts` CLI flag; the option now lives
    // only in config. The platform's restart command still appends
    // `--allowed-hosts all`, so we set `true` here to permit any Host header
    // (required for the embedded cross-origin preview iframe) and rely on
    // scripts/dev.mjs to strip the unsupported flag before invoking vite.
    allowedHosts: true,
    host: "0.0.0.0",
    port: 3000,
  },
  build: {
    chunkSizeWarningLimit: 1000,
  },
});
