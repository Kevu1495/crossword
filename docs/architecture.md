# Architecture

Browser → static React application → `/api/puzzles` Worker → indexed D1 inventory.

Offline Python ingestion → editorially reviewed clue bank → seeded bounded backtracking → independent validation → idempotent SQL → D1.

The browser includes a small reviewed collection so local development needs no credentials. For hosted API use, build with `VITE_USE_API=true`. Solutions are intentionally available to the client for unlimited local checks and reveals, without server calls on every keystroke.

The solver extracts all slots, indexes words by length/position/letter, selects the minimum remaining domain, propagates intersection constraints and prohibits duplicate answers. It has wall-time and node budgets. Validation independently re-extracts slots and checks connectedness, three-letter minimum, fully checked cells, clue numbering and complete answer consistency.

The Worker validates mode and exclusion parameters, binds values to prepared queries and uses the `(size,difficulty,published,id)` index. It searches from a random pivot, wraps once, and only permits repeats after unseen inventory is exhausted. Seen IDs are a bounded browser history of the latest 200 puzzles, not a lifetime account record. JSON exclusion binding avoids exceeding D1's parameter budget. No database write occurs while playing.

Every puzzle and clue retains provenance. SQL publication rejects unapproved puzzles, missing approved clue IDs and altered clue texts. Seed and publication SQL are idempotent, permitting safe retries. Scheduled generation uses reviewed words and clues only; source imports do not silently become playable content.

Static assets are served directly. Only `/api/*` requests invoke the Worker. Enable sampled Worker logs and traces; inspect D1 row reads/writes and storage periodically. Batch sizes are configurable. A ₹0 target depends on actual Cloudflare and GitHub allowances and usage; no fixed quota is hardcoded into the application.
