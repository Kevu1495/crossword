import type { Puzzle } from "../../frontend/src/puzzle";
import type { InferEnv, UnwrapConfig } from "cf/config";
import type config from "../../cloudflare.config";
export type Env = InferEnv<UnwrapConfig<typeof config.worker>>;
const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
export async function selectPuzzle(
  db: D1Database,
  size: number,
  difficulty: string,
  exclude: string[],
) {
  const excluded = " AND id NOT IN (SELECT value FROM json_each(?4))";
  const pivot = crypto.randomUUID().replaceAll("-", "").slice(0, 20);
  async function query(after: string, exclusions: string[]) {
    const clause = exclusions.length ? excluded : "";
    const statement = db.prepare(
      `SELECT body_json FROM puzzles WHERE size=?1 AND difficulty=?2 AND published=1 AND id>=?3${clause} ORDER BY id LIMIT 1`,
    );
    return statement
      .bind(
        size,
        difficulty,
        after,
        ...(exclusions.length ? [JSON.stringify(exclusions)] : []),
      )
      .first<{ body_json: string }>();
  }
  let row = (await query(pivot, exclude)) ?? (await query("", exclude));
  if (!row && exclude.length)
    row = (await query(pivot, [])) ?? (await query("", []));
  return row ? (JSON.parse(row.body_json) as Puzzle) : null;
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    if (request.method !== "GET")
      return new Response(null, { status: 405, headers: { Allow: "GET" } });
    if (url.pathname === "/api/health") return json({ status: "ok" });
    if (url.pathname !== "/api/puzzles")
      return json({ error: "Not found" }, 404);
    const size = Number(url.searchParams.get("size"));
    const difficulty = url.searchParams.get("difficulty") ?? "";
    const rawExclude = url.searchParams.get("exclude") ?? "";
    if (
      ![7, 11, 15].includes(size) ||
      !["easy", "medium", "hard"].includes(difficulty) ||
      rawExclude.length > 4200
    )
      return json({ error: "Invalid puzzle mode or exclusion list" }, 400);
    const exclude = rawExclude ? rawExclude.split(",") : [];
    // Bind the exclusion list once as JSON, staying below D1's variable limit.
    if (exclude.some((id) => !/^[a-f0-9]{20}$/.test(id)))
      return json({ error: "Invalid puzzle identifier" }, 400);
    try {
      const puzzle = await selectPuzzle(
        env.DB,
        size,
        difficulty,
        [...new Set(exclude)].slice(-200),
      );
      return puzzle
        ? json(puzzle)
        : json({ error: "No puzzles available in this mode" }, 404);
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "puzzle_load_failed",
          error: error instanceof Error ? error.message : "Unknown error",
        }),
      );
      return json(
        { error: "Puzzles are taking a little break. Please try again." },
        503,
      );
    }
  },
};
