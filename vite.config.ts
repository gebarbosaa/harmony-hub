import { defineConfig } from "vite";

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1000, // Aumenta o limite para 1 MB
  },
});
