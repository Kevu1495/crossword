import { describe, expect, it, vi } from "vitest";
import handler, { selectPuzzle } from "./index";
import type { Env } from "./index";
import puzzles from "../../frontend/src/puzzles.json";
function mockDb(responses: ({ body_json: string } | null)[]) {
  const first = vi.fn();
  responses.forEach((r) => first.mockResolvedValueOnce(r));
  const bind = vi.fn((..._values: unknown[]) => ({ first }));
  const prepare = vi.fn((_sql: string) => ({ bind }));
  return { db: { prepare } as unknown as D1Database, prepare, bind, first };
}
describe("Worker API", () => {
  it("validates modes and malformed exclusions before querying", async () => {
    const { db, prepare } = mockDb([]);
    const env = { DB: db } as Env;
    for (const query of [
      "size=8&difficulty=easy",
      "size=7&difficulty=unknown",
      "size=7&difficulty=easy&exclude=bad",
    ]) {
      const response = await handler.fetch(
        new Request(`https://example.test/api/puzzles?${query}`),
        env,
      );
      expect(response.status).toBe(400);
    }
    expect(prepare).not.toHaveBeenCalled();
  });
  it("uses bound JSON for seen IDs and wraps around the indexed inventory", async () => {
    const { db, prepare, bind } = mockDb([
      null,
      { body_json: JSON.stringify(puzzles[0]) },
    ]);
    const excluded = ["aaaaaaaaaaaaaaaaaaaa"];
    expect(await selectPuzzle(db, 7, "easy", excluded)).toEqual(puzzles[0]);
    expect(prepare.mock.calls[0][0]).toContain("json_each(?4)");
    expect(bind.mock.calls[0]).toEqual([
      7,
      "easy",
      expect.any(String),
      JSON.stringify(excluded),
    ]);
    expect(bind.mock.calls[1][2]).toBe("");
  });
  it("only permits repeats after unseen inventory is exhausted", async () => {
    const { db, bind } = mockDb([
      null,
      null,
      { body_json: JSON.stringify(puzzles[0]) },
    ]);
    expect(await selectPuzzle(db, 7, "easy", ["aaaaaaaaaaaaaaaaaaaa"])).toEqual(
      puzzles[0],
    );
    expect(bind.mock.calls[2]).toHaveLength(3);
  });
  it("returns unavailable status without leaking internal errors", async () => {
    const db = {
      prepare: () => {
        throw new Error("private database detail");
      },
    } as unknown as D1Database;
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await handler.fetch(
      new Request("https://example.test/api/puzzles?size=7&difficulty=easy"),
      { DB: db } as Env,
    );
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private database detail");
    log.mockRestore();
  });
  it("passes static requests to assets and rejects unexpected routes and methods", async () => {
    const fetch = vi.fn(async () => new Response("asset"));
    const env = { ASSETS: { fetch } } as unknown as Env;
    expect(
      await (
        await handler.fetch(new Request("https://example.test/"), env)
      ).text(),
    ).toBe("asset");
    expect(
      (
        await handler.fetch(
          new Request("https://example.test/api/missing"),
          env,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await handler.fetch(
          new Request("https://example.test/api/puzzles", { method: "POST" }),
          env,
        )
      ).status,
    ).toBe(405);
  });
});
