import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig(({ command }) => ({
  test: { include: ["src/**/*.test.ts"] },
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: { manualChunks: { charts: ["recharts"], validation: ["zod"] } },
    },
  },
  base: process.env.GITHUB_ACTIONS && command === "build" ? "/tripwise/" : "/",
}));
