# Little Crossword — agreed specification

The game is a cute, quiet place to enjoy crosswords. There are **no timers, scores, competitive mechanics, rankings, hint penalties or leaderboards**. Launch domain: `crossword.kevinp.dev`.

## Play

- English general knowledge and vocabulary, for a broad international audience.
- Nine modes: 7×7, 11×11 and 15×15, each Easy, Medium and Hard.
- Every grid is connected. Each open square belongs to one Across and one Down answer. Answers have at least three letters. Initial templates have 180-degree rotational symmetry. Repeated answers in one puzzle are forbidden.
- Answers use A–Z; spaces, accents, apostrophes and hyphens are normalized. Clues must signal abbreviations, foreign words, contractions and regional spellings when needed. No arbitrary personal-name fill-in-the-blanks or stretched spellings.
- Select a clue or cell; type to fill and advance. Click the selected cell again or use Space to switch direction. Arrow keys move; Backspace erases; Enter selects the next clue. Tab moves between the board and controls.
- Check the selected word, reveal the selected letter, or reveal the selected word. Hints are unlimited; revealed cells receive a discreet marker. Incorrect letters are only marked when the player asks to check.
- Finish when all open squares match the solution. Show a gentle inline celebration, without interrupting play or comparing performance.
- Progress saves per puzzle in the current browser when local storage is available. Storage failure must be communicated without preventing play. No accounts or cross-device sync.
- Prefer unseen puzzles in each mode; when all are seen, allow revisiting. Keep progress when switching modes or puzzles. Confirm before clearing a puzzle.

## Visual direction

Warm Café & Cherry Blossom: cream `#FFF8F0`, blush `#FDE2E4`, espresso `#3D3436`, sage `#CDEAC0` for the active word, coral `#FF758F` for the selected cell and primary buttons. Airy layout, rounded panels, small floral touches and readable typography. Mobile and desktop layouts, visible keyboard focus, reduced-motion support and accessible labels. A separate dark theme is deferred so the approved palette remains consistent.

## Data and infrastructure

React + TypeScript + Vite frontend; Cloudflare Worker with static assets and D1; offline Python ingestion and bounded seeded constraint solving; GitHub Actions for verification and generation. No paid AI or permanently running generation server. Answers may be delivered to the browser for local checking: this is an intentional choice for a noncompetitive game.

Source records retain URL, revision, license, clue difficulty, kind and frequency tier. Imported records remain candidates until editorial approval. Structural validation alone does not certify clue quality. Only reviewed clues and validated puzzles can be published. Difficulty labels are provisional until playtested.

Open Crossword Bank CC0 data is the initial source. WordNet supplementation is deferred until additional coverage is demonstrably needed and its attribution is implemented.

## Acceptance

All nine modes contain reviewed, structurally valid puzzles. A player can navigate, enter and erase letters, select clues, use hints, complete a puzzle, refresh and recover progress, and change modes without losing work. Build, type checks, generator integrity checks and interaction tests pass. Public launch additionally requires a live D1-backed API, automated replenishment, deployment and working custom domain.
