import { cpSync, mkdirSync, readFileSync, rmSync } from "node:fs";
const source = "frontend/.cloudflare/output/v0";
const config = JSON.parse(
  readFileSync(`${source}/workers/default/worker.config.json`, "utf8"),
);
if (
  config.name !== "crossword" ||
  config.env?.DB?.type !== "d1" ||
  config.env?.ASSETS?.type !== "assets"
) {
  throw new Error(
    "Cloudflare build must include the crossword Worker and D1 binding.",
  );
}
rmSync(".cloudflare/output/v0", { recursive: true, force: true });
mkdirSync(".cloudflare/output", { recursive: true });
cpSync(source, ".cloudflare/output/v0", { recursive: true });
console.log(
  "Cloudflare Worker and static assets prepared in .cloudflare/output/v0",
);
