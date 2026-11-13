import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Miniflare } from "miniflare";
import { chromium } from "@playwright/test";
const output = ".cloudflare/output/v0/workers/default";
const configuration = JSON.parse(
  readFileSync(`${output}/worker.config.json`, "utf8"),
);
const mf = new Miniflare({
  telemetry: { enabled: false },
  enableDevRegistry: false,
  cf: false,
  host: "127.0.0.1",
  port: 0,
  workers: [
    {
      config: {
        name: configuration.name,
        compatibilityDate: configuration.compatibilityDate,
        env: configuration.env,
        assets: {
          ...configuration.assets,
          directory: resolve(`${output}/assets`),
          hasUserWorker: true,
        },
        manifest: {
          mainModule: "index.js",
          modules: {
            "index.js": {
              type: "esm",
              contents: readFileSync(`${output}/bundle/index.js`, "utf8"),
            },
          },
        },
      },
      dev: { rootPath: process.cwd() },
    },
  ],
});
let browser;
try {
  const address = await mf.ready;
  const db = await mf.getD1Database("DB");
  // This migration has no triggers or semicolons inside string literals.
  for (const sql of readFileSync("worker/migrations/0001_initial.sql", "utf8")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean))
    await db.prepare(sql).run();
  const statements = readFileSync("worker/seed.sql", "utf8").trim().split("\n");
  for (let i = 0; i < statements.length; i += 40)
    await db.batch(statements.slice(i, i + 40).map((sql) => db.prepare(sql)));
  for (const size of [7, 11, 15])
    for (const difficulty of ["easy", "medium", "hard"]) {
      const response = await mf.dispatchFetch(
        `${address}api/puzzles?size=${size}&difficulty=${difficulty}`,
      );
      assert.equal(response.status, 200);
      const puzzle = await response.json();
      assert.equal(puzzle.size, size);
      assert.equal(puzzle.difficulty, difficulty);
      const excluded = await mf.dispatchFetch(
        `${address}api/puzzles?size=${size}&difficulty=${difficulty}&exclude=${puzzle.id}`,
      );
      const next = await excluded.json();
      // Medium 11x11 initially has one puzzle, where repeat is the intended fallback.
      const count = await db
        .prepare(
          "SELECT count(*) AS n FROM puzzles WHERE size=?1 AND difficulty=?2",
        )
        .bind(size, difficulty)
        .first();
      if (count.n > 1) assert.notEqual(next.id, puzzle.id);
    }
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROME_PATH,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(address.toString());
  const requests = [];
  page.on("response", (response) => {
    if (response.url().includes("/api/puzzles"))
      requests.push(response.status());
  });
  for (const size of [11, 15, 7]) {
    await page
      .getByRole("button", { name: `${size} × ${size}`, exact: false })
      .click();
    await page
      .getByRole("group", { name: `${size} by ${size} crossword` })
      .waitFor();
    for (const difficulty of ["Steady", "Thoughtful", "Gentle"]) {
      await page.getByRole("button", { name: difficulty, exact: true }).click();
      await page.waitForFunction(
        (d) =>
          document
            .querySelector('.difficulty button[aria-pressed="true"]')
            ?.textContent?.includes(d),
        difficulty,
      );
    }
  }
  assert.ok(requests.length >= 9);
  assert.ok(requests.every((status) => status === 200));
  assert.deepEqual(errors, []);
  console.log(
    "Verified all nine modes through browser → bundled Worker → local D1 → response, including unseen selection.",
  );
} finally {
  await browser?.close();
  await mf.dispose();
}
