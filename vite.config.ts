import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(async () => ({
  root: "frontend",
  plugins: [
    react(),
    ...(process.env.CLOUDFLARE_BUILD === "true"
      ? (await import("@cloudflare/vite-plugin")).cloudflare()
      : []),
  ],
  build: { outDir: "../dist", emptyOutDir: true },
}));
