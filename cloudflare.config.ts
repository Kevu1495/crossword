import { fileURLToPath } from "node:url";
import { bindings, defineConfig } from "cf/config";
export default defineConfig({
  worker: {
    name: "crossword",
    entrypoint: fileURLToPath(
      new URL("./worker/src/index.ts", import.meta.url),
    ),
    compatibilityDate: "2026-11-11",
    env: {
      DB: bindings.d1({
        name: "crossword",
        id:
          process.env.CLOUDFLARE_DATABASE_ID ??
          "437b453e-741f-4fc7-b486-ad5caf6ac66d",
      }),
      ASSETS: bindings.assets(),
    },
    assets: {
      notFoundHandling: "single-page-application",
      runWorkerFirst: ["/api/*"],
    },
    observability: {
      enabled: true,
      headSamplingRate: 0.1,
      redactQueryString: true,
      logs: { enabled: true },
      traces: { enabled: true, headSamplingRate: 0.1 },
    },
    domains: ["crossword.kevinp.dev"],
    workersDev: true,
  },
});
