import { describe, expect, it, vi } from "vitest";
import {
  cells,
  choosePuzzle,
  contains,
  isComplete,
  key,
  readProgress,
} from "./puzzle";
import type { Puzzle } from "./puzzle";
import data from "./puzzles.json";
const pool = data as Puzzle[];
const p = pool[0];
describe("browser puzzle behavior", () => {
  it("extracts perpendicular entries and detects complete solutions", () => {
    const letters: Record<string, string> = {};
    expect(isComplete(p, letters)).toBe(false);
    p.solution.forEach((line, r) =>
      Array.from(line).forEach((ch, c) => {
        if (ch !== "#") letters[key(r, c)] = ch;
      }),
    );
    expect(isComplete(p, letters)).toBe(true);
    const first = cells(p.entries[0])[0];
    letters[key(first.row, first.col)] = "?";
    expect(isComplete(p, letters)).toBe(false);
    expect(contains(p.entries[0], first.row, first.col)).toBe(true);
    expect(cells(p.entries[0])).toHaveLength(p.entries[0].answer.length);
  });
  it("prefers unseen puzzles and handles exhaustion without inventing puzzles", () => {
    const easy = pool.filter((x) => x.size === 7 && x.difficulty === "easy");
    expect(choosePuzzle(pool, 7, "easy", [easy[0].id], easy[0].id)?.id).toBe(
      easy[1].id,
    );
    expect(
      choosePuzzle(
        pool,
        7,
        "easy",
        easy.map((x) => x.id),
        easy[0].id,
      )?.id,
    ).toBe(easy[1].id);
    expect(choosePuzzle([], 7, "easy", [])).toBeUndefined();
  });
  it("recovers from missing, corrupt or unavailable browser storage", () => {
    vi.stubGlobal("localStorage", { getItem: () => "{broken" });
    expect(readProgress(p)).toEqual({ letters: {}, revealed: [] });
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
    });
    expect(readProgress(p)).toEqual({ letters: {}, revealed: [] });
    const cell = cells(p.entries[0])[0];
    const k = key(cell.row, cell.col);
    vi.stubGlobal("localStorage", {
      getItem: () =>
        JSON.stringify({
          letters: { [k]: "A", bad: "<script>" },
          revealed: [k, 123, "bad"],
        }),
    });
    expect(readProgress(p)).toEqual({ letters: { [k]: "A" }, revealed: [k] });
    vi.unstubAllGlobals();
  });
});
