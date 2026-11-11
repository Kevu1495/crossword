# Implementation status

1. Rules and requirements — written in `requirements.md`, including the confirmed absence of timers and scores.
2. Project foundation — React/TypeScript/Vite, Python generator, dependency lock, formatting, linting, unit and browser tests.
3. Database — D1-compatible schema, provenance, indexed mode inventory, idempotent seed exporter and SQLite checks.
4. Dataset — pinned Open Crossword Bank importer, quarantine, reviewed initial bank; WordNet deferred.
5. Generator — seeded MRV backtracking, checked connected symmetric templates, independent validation and bounded failures.
6. Nine modes — initial reviewed puzzles exist for every combination; difficulty calibration needs real playtesting.
7. Generation pipeline — reviewed-bank replenishment, SQL exporter and D1 publisher. Scheduled workflow prepared; requires GitHub repository and CI secrets.
8. Frontend — responsive Warm Café & Cherry Blossom game, keyboard play, clues, optional hints, local saves and gentle completion.
9. API and progress — Worker endpoints and browser persistence; all nine modes verified through the built client, Worker and local D1. Hosted D1 integration requires deployment.
10. Quality — 8 TypeScript tests, 9 Python checks, 3 desktop/mobile browser flows and a full nine-mode Worker/D1 browser check pass. Both build targets and lint pass; the dependency audit reports zero advisories. See README for commands.
11. Hosting and CI/CD — initial Worker and D1 deployment completed through connected Cloudflare tools. GitHub source and verification workflows are connected; automated deployments require scoped CI credentials.
12. Domain — `crossword.kevinp.dev` attached to the crossword Worker.
13. Operations — monitoring and content-review instructions prepared; ongoing inventory and difficulty improvement remain operational tasks.

The initial collection is a launch foundation, not proof of unlimited variety. Keep adding reviewed vocabulary and templates, and playtest the difficulty labels. Do not describe remote deployment or scheduled replenishment as active until confirmed in the account.
