import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  cells,
  choosePuzzle,
  contains,
  isComplete,
  isPuzzle,
  key,
  readProgress,
} from "./puzzle";
import type { Difficulty, Entry, Progress, Puzzle } from "./puzzle";
import puzzleData from "./puzzles.json";
const pool = puzzleData as Puzzle[];
const empty: Progress = { letters: {}, revealed: [] };
function stored<T>(name: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(name) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
function Flower({ small = false }: { small?: boolean }) {
  return (
    <img
      className={small ? "flower small" : "flower"}
      src="/flower.svg"
      alt=""
    />
  );
}

export default function App() {
  const [puzzle, setPuzzle] = useState<Puzzle>(() => {
    const saved = stored<unknown>("crossword:active", null);
    const last = stored("crossword:last", "");
    return (
      pool.find((p) => p.id === last) ??
      (isPuzzle(saved) && saved.id === last ? saved : pool[0])
    );
  });
  const [size, setSize] = useState(puzzle?.size ?? 7);
  const [difficulty, setDifficulty] = useState<Difficulty>(
    puzzle?.difficulty ?? "easy",
  );
  const [progress, setProgress] = useState<Progress>(() =>
    puzzle ? readProgress(puzzle) : empty,
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [selected, setSelected] = useState(() =>
    puzzle?.entries[0]
      ? key(puzzle.entries[0].row, puzzle.entries[0].col)
      : "0,0",
  );
  const [message, setMessage] = useState("A little curiosity is all you need.");
  const [wrong, setWrong] = useState<string[]>([]);
  const [help, setHelp] = useState(false);
  const [dialog, setDialog] = useState<"new" | "restart" | "reveal" | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [seen, setSeen] = useState<string[]>(() => {
    const saved = stored<unknown>("crossword:seen", []);
    return Array.isArray(saved)
      ? saved.filter((s): s is string => typeof s === "string")
      : [];
  });
  const pointerWasSelected = useRef(false);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const modal = useRef<HTMLDialogElement>(null);
  const requestNumber = useRef(0);
  const active = puzzle?.entries[activeIndex];
  const complete = puzzle ? isComplete(puzzle, progress.letters) : false;
  const filled = Object.keys(progress.letters).length;
  const total = puzzle?.solution.join("").replaceAll("#", "").length ?? 0;

  useEffect(() => {
    if (!puzzle) return;
    try {
      localStorage.setItem(
        `crossword:v1:${puzzle.id}`,
        JSON.stringify(progress),
      );
      localStorage.setItem("crossword:last", JSON.stringify(puzzle.id));
      localStorage.setItem("crossword:active", JSON.stringify(puzzle));
      const ids = [...new Set([...seen, puzzle.id])].slice(-200);
      localStorage.setItem("crossword:seen", JSON.stringify(ids));
    } catch {
      setStorageAvailable(false);
    }
  }, [puzzle, progress, seen]);
  useEffect(() => {
    if (dialog || help) modal.current?.showModal();
    else modal.current?.close();
  }, [dialog, help]);

  function focusCell(k: string) {
    setSelected(k);
    inputs.current[k]?.focus();
  }
  function selectEntry(entry: Entry) {
    setActiveIndex(puzzle.entries.indexOf(entry));
    const first =
      cells(entry).find((c) => !progress.letters[key(c.row, c.col)]) ??
      cells(entry)[0];
    focusCell(key(first.row, first.col));
  }
  function selectCell(row: number, col: number, toggle = false) {
    const matches = puzzle.entries.filter((e) => contains(e, row, col));
    if (toggle && matches.length === 2)
      setActiveIndex(
        puzzle.entries.indexOf(matches.find((e) => e !== active)!),
      );
    else if (!active || !contains(active, row, col))
      setActiveIndex(
        puzzle.entries.indexOf(
          matches.find((e) => e.direction === active?.direction) ?? matches[0],
        ),
      );
    focusCell(key(row, col));
  }
  function update(k: string, value: string) {
    setProgress((previous) => {
      const letters = { ...previous.letters };
      if (value) letters[k] = value;
      else delete letters[k];
      return { ...previous, letters };
    });
    setWrong((previous) => previous.filter((cell) => cell !== k));
  }
  function moveAlong(delta: number) {
    const wordCells = cells(active);
    const i = wordCells.findIndex((c) => key(c.row, c.col) === selected);
    const next = wordCells[i + delta];
    if (next) focusCell(key(next.row, next.col));
  }
  function typeLetter(k: string, value: string) {
    const letter = value
      .replace(/[^a-z]/gi, "")
      .slice(-1)
      .toUpperCase();
    update(k, letter);
    if (letter) moveAlong(1);
  }
  function onKey(
    event: KeyboardEvent<HTMLInputElement>,
    row: number,
    col: number,
  ) {
    const k = key(row, col);
    if (event.key === "Backspace") {
      event.preventDefault();
      if (progress.letters[k]) update(k, "");
      else {
        moveAlong(-1);
        const wordCells = cells(active);
        const i = wordCells.findIndex((c) => key(c.row, c.col) === k);
        if (i > 0) update(key(wordCells[i - 1].row, wordCells[i - 1].col), "");
      }
    } else if (event.key === "Delete") {
      event.preventDefault();
      update(k, "");
    } else if (event.key === " ") {
      event.preventDefault();
      selectCell(row, col, true);
    } else if (event.key === "Enter") {
      event.preventDefault();
      selectEntry(puzzle.entries[(activeIndex + 1) % puzzle.entries.length]);
    } else if (event.key.startsWith("Arrow")) {
      event.preventDefault();
      const horizontal =
        event.key === "ArrowLeft" || event.key === "ArrowRight";
      const direction = horizontal ? "across" : "down";
      if (active.direction !== direction) {
        const e = puzzle.entries.find(
          (e) => e.direction === direction && contains(e, row, col),
        );
        if (e) setActiveIndex(puzzle.entries.indexOf(e));
      }
      const delta =
        event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
      let r = row + (horizontal ? 0 : delta),
        c = col + (horizontal ? delta : 0);
      while (r >= 0 && r < puzzle.size && c >= 0 && c < puzzle.size) {
        if (puzzle.solution[r][c] !== "#") {
          selectCell(r, c);
          const entry = puzzle.entries.find(
            (e) => e.direction === direction && contains(e, r, c),
          );
          if (entry) setActiveIndex(puzzle.entries.indexOf(entry));
          break;
        }
        r += horizontal ? 0 : delta;
        c += horizontal ? delta : 0;
      }
    }
  }
  async function load(nextSize = size, nextDifficulty = difficulty) {
    const request = ++requestNumber.current;
    setLoading(true);
    setDialog(null);
    const previousIds = [...new Set([...seen, puzzle.id])].slice(-200);
    let next: Puzzle | undefined;
    try {
      if (import.meta.env.VITE_USE_API === "true") {
        const params = new URLSearchParams({
          size: String(nextSize),
          difficulty: nextDifficulty,
          exclude: previousIds.join(","),
        });
        const response = await fetch(`/api/puzzles?${params}`, {
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error("Puzzle service unavailable");
        const payload: unknown = await response.json();
        if (
          !isPuzzle(payload) ||
          payload.size !== nextSize ||
          payload.difficulty !== nextDifficulty
        )
          throw new Error("Invalid puzzle response");
        next = payload;
      } else
        next = choosePuzzle(
          pool,
          nextSize,
          nextDifficulty,
          previousIds,
          puzzle.id,
        );
      if (request !== requestNumber.current) return;
      if (!next) {
        setMessage(
          "This little garden is still growing. Please try another size or difficulty.",
        );
        return;
      }
      if (next.id === puzzle.id) {
        setMessage(
          "You’ve tried every available puzzle in this mode. Your current puzzle is saved.",
        );
        return;
      }
      setPuzzle(next);
      setSize(nextSize);
      setDifficulty(nextDifficulty);
      setProgress(readProgress(next));
      setActiveIndex(0);
      setSelected(key(next.entries[0].row, next.entries[0].col));
      setWrong([]);
      setSeen(previousIds);
      setMessage(
        previousIds.includes(next.id)
          ? "You’ve explored this collection. Here’s an old friend to revisit."
          : "A fresh little puzzle. Make yourself comfortable.",
      );
    } catch {
      if (request === requestNumber.current)
        setMessage(
          "The puzzle couldn’t load. Your current puzzle is safe; please try again.",
        );
    } finally {
      if (request === requestNumber.current) setLoading(false);
    }
  }
  function checkWord() {
    const mistakes = cells(active)
      .filter((c) => {
        const k = key(c.row, c.col);
        return (
          progress.letters[k] &&
          progress.letters[k] !== puzzle.solution[c.row][c.col]
        );
      })
      .map((c) => key(c.row, c.col));
    setWrong(mistakes);
    const wordFilled = cells(active).every(
      (c) => progress.letters[key(c.row, c.col)],
    );
    setMessage(
      mistakes.length
        ? "The dotted letters could use another look. You’ve got this."
        : wordFilled
          ? "That word looks lovely. Nicely done!"
          : "Everything you’ve filled in this word looks good so far.",
    );
  }
  function reveal(word = false) {
    const targets = word
      ? cells(active)
      : cells(active).filter((c) => key(c.row, c.col) === selected);
    setProgress((previous) => {
      const letters = { ...previous.letters };
      const revealed = new Set(previous.revealed);
      for (const c of targets) {
        const k = key(c.row, c.col);
        letters[k] = puzzle.solution[c.row][c.col];
        revealed.add(k);
      }
      return { letters, revealed: [...revealed] };
    });
    setWrong([]);
    setDialog(null);
    setMessage("A little help, with love. Keep going at your own pace.");
  }
  if (!puzzle)
    return (
      <main>
        <h1>The puzzle garden is growing.</h1>
        <p>No reviewed puzzles are available yet.</p>
      </main>
    );
  const closeModal = () => {
    setHelp(false);
    setDialog(null);
  };
  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Little Crossword home">
          <Flower small />
          <span>
            little crossword<span className="brand-dot">.</span>
          </span>
        </a>
        <button className="text-button" onClick={() => setHelp(true)}>
          How to play <span aria-hidden="true">↗</span>
        </button>
      </header>
      <main>
        <section className="intro">
          <span className="eyebrow">
            <span aria-hidden="true">✦</span> A SMALL MOMENT, JUST FOR YOU
          </span>
          <h1>
            A little crossword.
            <br />
            <em>A lovely pause.</em>
          </h1>
          <p>
            Settle in, follow a clue, and see where it takes you.
            <br className="desktop-break" /> No clocks. No scores. Just one word
            at a time.
          </p>
          <div className="intro-flower" aria-hidden="true">
            <Flower />
            <span>take your time</span>
          </div>
        </section>
        <section
          className="game-card"
          aria-label="Crossword game"
          aria-busy={loading}
        >
          <div className="game-settings">
            <div>
              <span className="field-label">YOUR LITTLE GRID</span>
              <div className="segmented" aria-label="Grid size">
                {[7, 11, 15].map((n) => (
                  <button
                    key={n}
                    aria-pressed={size === n}
                    disabled={loading}
                    onClick={() => void load(n, difficulty)}
                  >
                    {n} × {n}
                    <span>
                      {n === 7
                        ? "a little sip"
                        : n === 11
                          ? "a cozy cup"
                          : "a long afternoon"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="field-label">IN THE MOOD FOR</span>
              <div className="difficulty" aria-label="Difficulty">
                {(["easy", "medium", "hard"] as const).map((d) => (
                  <button
                    key={d}
                    aria-pressed={difficulty === d}
                    disabled={loading}
                    onClick={() => void load(size, d)}
                  >
                    <span aria-hidden="true">
                      {d === "easy" ? "☁" : d === "medium" ? "✿" : "✧"}
                    </span>{" "}
                    {d[0].toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="game-body">
            <div className="board-column">
              <div className="board-heading">
                <span>
                  <span className="live-dot" />{" "}
                  {size === 7
                    ? "A pocket-sized escape"
                    : size === 11
                      ? "A cozy little wander"
                      : "Room to get wonderfully lost"}
                </span>
                <span>
                  {filled} / {total} letters
                </span>
              </div>
              <div
                className={`board size-${size}`}
                role="group"
                aria-label={`${size} by ${size} crossword`}
                style={{ gridTemplateColumns: `repeat(${size},1fr)` }}
              >
                {puzzle.solution.flatMap((line, r) =>
                  Array.from(line, (ch, c) => {
                    const k = key(r, c);
                    if (ch === "#")
                      return (
                        <div key={k} className="blocked" aria-hidden="true" />
                      );
                    const start = puzzle.entries.find(
                      (e) => e.row === r && e.col === c,
                    );
                    const highlighted = contains(active, r, c);
                    return (
                      <div
                        key={k}
                        className={`cell ${highlighted ? "active-word" : ""} ${selected === k ? "selected" : ""} ${wrong.includes(k) ? "wrong" : ""} ${progress.revealed.includes(k) ? "revealed" : ""}`}
                      >
                        {start && (
                          <span className="cell-number" aria-hidden="true">
                            {start.number}
                          </span>
                        )}
                        <input
                          ref={(element) => {
                            inputs.current[k] = element;
                          }}
                          aria-label={`Row ${r + 1}, column ${c + 1}${start ? `, ${start.number}` : ""}, ${active.direction}${progress.revealed.includes(k) ? ", revealed" : ""}`}
                          aria-invalid={wrong.includes(k)}
                          tabIndex={selected === k ? 0 : -1}
                          value={progress.letters[k] ?? ""}
                          maxLength={2}
                          inputMode="text"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="characters"
                          spellCheck={false}
                          onFocus={() => {
                            if (selected !== k) selectCell(r, c);
                          }}
                          onPointerDown={() => {
                            pointerWasSelected.current = selected === k;
                          }}
                          onClick={() => {
                            selectCell(r, c, pointerWasSelected.current);
                            pointerWasSelected.current = false;
                          }}
                          onChange={(e) => typeLetter(k, e.target.value)}
                          onKeyDown={(e) => onKey(e, r, c)}
                        />
                      </div>
                    );
                  }),
                )}
              </div>
              <div className="current-clue">
                <span className="clue-tag">
                  {active.number} {active.direction}
                </span>
                <p>
                  {active.clue} <span>({active.answer.length})</span>
                </p>
                <button
                  className="next-clue"
                  onClick={() =>
                    selectEntry(
                      puzzle.entries[(activeIndex + 1) % puzzle.entries.length],
                    )
                  }
                  aria-label="Next clue"
                >
                  →
                </button>
              </div>
              <div className="tools">
                <button onClick={checkWord}>
                  ✓ <span>Check word</span>
                </button>
                <button onClick={() => reveal()}>
                  ✧ <span>Reveal letter</span>
                </button>
                <button onClick={() => setDialog("reveal")}>
                  ♡ <span>Reveal word</span>
                </button>
              </div>
              <p className="keyboard-note">
                A little tip: tap a cell twice to switch direction.
              </p>
            </div>
            <aside className="clue-column" aria-label="Puzzle clues">
              {(["across", "down"] as const).map((direction) => (
                <section key={direction} className="clue-section">
                  <h2>
                    <span aria-hidden="true">
                      {direction === "across" ? "→" : "↓"}
                    </span>{" "}
                    {direction[0].toUpperCase() + direction.slice(1)}
                    <span className="clue-count">
                      {
                        puzzle.entries.filter((e) => e.direction === direction)
                          .length
                      }{" "}
                      clues
                    </span>
                  </h2>
                  <ol>
                    {puzzle.entries
                      .filter((e) => e.direction === direction)
                      .map((entry) => (
                        <li key={entry.number}>
                          <button
                            className={`${entry === active ? "current" : ""} ${cells(entry).every((c) => progress.letters[key(c.row, c.col)] === puzzle.solution[c.row][c.col]) ? "solved" : ""}`}
                            aria-pressed={entry === active}
                            onClick={() => selectEntry(entry)}
                          >
                            <span className="clue-number">{entry.number}</span>
                            <span>
                              {entry.clue}{" "}
                              <span className="answer-length">
                                ({entry.answer.length})
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                  </ol>
                </section>
              ))}
            </aside>
          </div>
          <div className="game-bottom">
            <span className="save-status">
              {storageAvailable
                ? "♡ Your place is saved, right here."
                : "Your browser couldn’t save progress. Keep this tab open."}
            </span>
            <div>
              <button
                className="text-button"
                onClick={() => setDialog("restart")}
              >
                Start over
              </button>
              <button
                className="primary-button"
                disabled={loading}
                onClick={() => setDialog("new")}
              >
                {loading ? "Finding a puzzle…" : "Another little puzzle"}{" "}
                <span aria-hidden="true">↗</span>
              </button>
            </div>
          </div>
        </section>
        <div
          className={`gentle-message ${complete ? "celebration" : ""}`}
          role="status"
          aria-live="polite"
        >
          {complete ? (
            <>
              <Flower small />
              <div>
                <strong>Every little word found its place.</strong>
                <p>
                  What a lovely thing to finish. Stay a while, or try another
                  puzzle.
                </p>
              </div>
            </>
          ) : (
            <>
              <span aria-hidden="true">✿</span> {message}
            </>
          )}
        </div>
        <footer>
          <p>Made for curious minds & quiet moments.</p>
          <details>
            <summary>A note on our words</summary>
            <p>
              Our starting vocabulary comes from{" "}
              <a
                href="https://github.com/tamino-martinius/node-open-crossword-bank"
                target="_blank"
                rel="noreferrer"
              >
                Open Crossword Bank
              </a>{" "}
              (CC0 1.0). The initial puzzles have been reviewed; difficulty
              labels are still being refined. All checking happens in your
              browser.
            </p>
          </details>
          <span className="footer-flower" aria-hidden="true">
            ✦
          </span>
        </footer>
      </main>
      <dialog
        ref={modal}
        onCancel={closeModal}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeModal();
        }}
        aria-labelledby="dialog-title"
      >
        <div className="modal-content">
          <Flower small />
          <h2 id="dialog-title">
            {help
              ? "Make yourself at home."
              : dialog === "restart"
                ? "A fresh start?"
                : dialog === "reveal"
                  ? "A little helping hand?"
                  : "Ready for another little puzzle?"}
          </h2>
          {help ? (
            <>
              <p>
                Choose a size and a difficulty, then tap a clue or an empty cell
                and type your answer. Every letter belongs to an across word and
                a down word.
              </p>
              <p>
                Tap the selected cell again or press Space to switch direction.
                Arrow keys move between cells. Enter moves to the next clue. Tab
                takes you to the other controls.
              </p>
              <p>
                Check a word or reveal a letter whenever you like. There are no
                penalties. Your progress stays in this browser when storage is
                available.
              </p>
              <button className="primary-button" onClick={closeModal}>
                Lovely, let’s play
              </button>
            </>
          ) : (
            <>
              <p>
                {dialog === "restart"
                  ? "This clears the letters in this puzzle so you can enjoy it again."
                  : dialog === "reveal"
                    ? "We’ll fill in the selected word. A hint is always welcome here."
                    : "Your progress will stay saved in this browser. You can come back whenever this puzzle appears again."}
              </p>
              <div className="modal-actions">
                <button className="text-button" onClick={closeModal}>
                  Stay here
                </button>
                <button
                  className="primary-button"
                  onClick={() => {
                    if (dialog === "restart") {
                      setProgress(empty);
                      setWrong([]);
                      setDialog(null);
                      setMessage("A clean page and a fresh little start.");
                    } else if (dialog === "reveal") reveal(true);
                    else void load();
                  }}
                >
                  {dialog === "restart"
                    ? "Start fresh"
                    : dialog === "reveal"
                      ? "Reveal word"
                      : "Find a puzzle"}
                </button>
              </div>
            </>
          )}
        </div>
      </dialog>
    </div>
  );
}
