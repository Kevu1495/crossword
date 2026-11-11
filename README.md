# Little Crossword

A cozy English crossword game for `crossword.kevinp.dev`. Cream, blush, sage and coral; no timers, scores or competitive mechanics.

## Run locally

Node 22.23.0+ (see `.nvmrc`) and Python 3.12+.

```sh
npm ci
npm run dev
```

Open the printed local URL. All nine modes work with the bundled reviewed collection, without credentials. Browser saves stay on the same origin and device.

```sh
npm run build
npm test
npm run lint
npm run test:e2e
npm run build:cloudflare
npm run test:cloudflare
```

Browser tests use Chrome from `PLAYWRIGHT_CHROME_PATH` when supplied, otherwise Playwright's installed Chromium. Run `npx playwright install chromium` if needed. `npm run format` formats source and documentation.

## Generate and publish

```sh
python3 generator/batch.py --count 1 --seed 20261111
python3 generator/export_sql.py
```

`batch.py` generates new puzzles using the reviewed bank. The exporter independently validates puzzles and rejects altered or unapproved clues. Generated batches preserve the existing pool if a mode cannot be filled. `generate.py` is the broader candidate prototype; it needs the separately imported dataset and does not publish.

Apply `worker/migrations/0001_initial.sql` once to a fresh D1 database, then import `worker/seed.sql`. For scheduled batches, configure GitHub Actions secrets `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_DATABASE_ID` and a scoped `CLOUDFLARE_API_TOKEN` with D1 write access. Never put tokens in `VITE_*` variables.

```sh
python3 scripts/publish_batch.py generator/datasets/batch.sql
```

D1 publication is idempotent. No remote resources or domain records are created merely by running the app.

## Project

- `frontend/`: responsive React game, local progress and reviewed initial collection.
- `worker/`: Workers API, D1 migration and reproducible seed SQL.
- `generator/`: ingestion, constraint solver, validation and replenishment.
- `tests/`: desktop/mobile interaction checks.
- `docs/`: agreed rules, architecture, deployment and implementation status.

Start with [the specification](docs/requirements.md), [deployment](docs/deployment.md) and [current status](docs/roadmap.md). Vocabulary provenance and the CC0 dedication are in [generator/datasets](generator/datasets/README.md).
