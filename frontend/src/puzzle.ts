export type Difficulty = "easy" | "medium" | "hard";
export type Direction = "across" | "down";
export interface Entry {
  number: number;
  direction: Direction;
  row: number;
  col: number;
  answer: string;
  clue: string;
  clueId: string;
  source: string;
  license: string;
}
export interface Puzzle {
  id: string;
  size: number;
  difficulty: Difficulty;
  seed: number;
  solution: string[];
  entries: Entry[];
  review: string;
}
export interface Progress {
  letters: Record<string, string>;
  revealed: string[];
}
export const key = (row: number, col: number) => `${row},${col}`;
export const cells = (e: Entry) =>
  Array.from(e.answer, (_, i) => ({
    row: e.row + (e.direction === "down" ? i : 0),
    col: e.col + (e.direction === "across" ? i : 0),
  }));
export const contains = (e: Entry, row: number, col: number) =>
  cells(e).some((c) => c.row === row && c.col === col);
export const isComplete = (p: Puzzle, letters: Progress["letters"]) =>
  p.solution.every((line, r) =>
    Array.from(line).every((ch, c) => ch === "#" || letters[key(r, c)] === ch),
  );
export function readProgress(p: Puzzle): Progress {
  try {
    const value = JSON.parse(
      localStorage.getItem(`crossword:v1:${p.id}`) || "null",
    );
    if (
      !value ||
      typeof value.letters !== "object" ||
      !Array.isArray(value.revealed)
    )
      return { letters: {}, revealed: [] };
    const letters: Record<string, string> = {};
    for (let r = 0; r < p.size; r++)
      for (let c = 0; c < p.size; c++) {
        const k = key(r, c),
          v = value.letters[k];
        if (
          p.solution[r][c] !== "#" &&
          typeof v === "string" &&
          /^[A-Z]$/.test(v)
        )
          letters[k] = v;
      }
    return {
      letters,
      revealed: value.revealed.filter(
        (k: unknown): k is string => typeof k === "string" && k in letters,
      ),
    };
  } catch {
    return { letters: {}, revealed: [] };
  }
}
export function choosePuzzle(
  pool: Puzzle[],
  size: number,
  difficulty: Difficulty,
  seen: string[],
  current?: string,
) {
  const matching = pool.filter(
    (p) => p.size === size && p.difficulty === difficulty,
  );
  const unseen = matching.filter((p) => !seen.includes(p.id));
  const candidates = unseen.length
    ? unseen
    : matching.filter((p) => p.id !== current);
  return candidates.length
    ? candidates[Math.floor(Math.random() * candidates.length)]
    : matching[0];
}

export function isPuzzle(value: unknown): value is Puzzle {
  if (!value || typeof value !== "object") return false;
  const p = value as Partial<Puzzle>;
  if (
    typeof p.id !== "string" ||
    !/^[a-f0-9]{20}$/.test(p.id) ||
    !p.size ||
    ![7, 11, 15].includes(p.size) ||
    !["easy", "medium", "hard"].includes(p.difficulty ?? "") ||
    !Array.isArray(p.solution) ||
    p.solution.length !== p.size ||
    !Array.isArray(p.entries) ||
    !p.entries.length
  )
    return false;
  const size = p.size;
  if (
    p.solution.some(
      (row) =>
        typeof row !== "string" ||
        row.length !== size ||
        !/^[A-Z#]+$/.test(row),
    )
  )
    return false;
  return p.entries.every(
    (e) =>
      e &&
      Number.isInteger(e.number) &&
      e.number > 0 &&
      ["across", "down"].includes(e.direction) &&
      Number.isInteger(e.row) &&
      Number.isInteger(e.col) &&
      e.row >= 0 &&
      e.col >= 0 &&
      typeof e.answer === "string" &&
      /^[A-Z]{3,15}$/.test(e.answer) &&
      typeof e.clue === "string" &&
      e.clue.length > 0 &&
      cells(e).every(
        (c) =>
          c.row < size &&
          c.col < size &&
          p.solution![c.row][c.col] ===
            e.answer[
              cells(e).findIndex((x) => x.row === c.row && x.col === c.col)
            ],
      ),
  );
}
