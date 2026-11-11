# Deployment to the intended Cloudflare account

This project targets Workers Static Assets and D1 in the owner's Cloudflare account. It does not depend on Sites hosting. `cloudflare.config.ts` is the configuration source; `frontend/cloudflare.config.ts` re-exports it for the frontend-rooted Vite integration.

Use Node **22.23.0+** (`.nvmrc`) for the current Cloudflare CLI. The local browser app also works with Node 20.19+, but the CLI's newer runtime requirement is stricter. `cf` and its Vite plugin are pinned beta releases; rerun all checks before upgrading them.

## First launch

1. The repository is `Kevu1495/crossword`. Push source updates there, including the lockfile. The initial source upload uses the connected GitHub app.
2. For future CLI deployments, authenticate with `npx cf auth login`, or set a scoped `CLOUDFLARE_API_TOKEN` in the shell. The initial deployment used the connected Cloudflare app and temporary upload grants, so CLI authentication was unnecessary. Do not commit credentials.
3. Use `npx cf cli search "create D1 database"`, inspect the returned command with `cf schema`, and create a database named `crossword`. Set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_DATABASE_ID` in the deployment environment. Check for an existing database before creating another.
4. Apply `worker/migrations/0001_initial.sql` to the new database through the D1 console. Generate the reviewed seed with `python3 generator/export_sql.py`, then import `worker/seed.sql`. For repeatable seed uploads, `python3 scripts/publish_batch.py worker/seed.sql` uses scoped D1 credentials.
5. Run `npm test`, `npm run lint`, `npm run build:cloudflare`, then `npx cf deploy --prebuilt --provision=false`. The explicit database ID prevents accidental provisioning of a second database. Inspect any existing Worker or domain binding before replacement.
6. The configuration requests the custom domain `crossword.kevinp.dev`. Confirm the zone belongs to the selected account, that the hostname has no conflicting service, and verify HTTPS, `/api/health` and `/api/puzzles?size=7&difficulty=easy` after deployment.
7. Configure repository secrets `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_DATABASE_ID` and a scoped `CLOUDFLARE_API_TOKEN`. The `production` GitHub environment can enforce deployment review. Dispatch the deployment workflow for launch; scheduled replenishment runs daily at 04:23 UTC (09:53 India time).

`npm run build` creates the credential-free static development collection in `dist/`. `npm run build:cloudflare` builds the API-enabled client plus Worker, then prepares `.cloudflare/output/v0/`. These are distinct build targets: deploying the static build alone does not connect D1.

## Verification and operations

- Use a browser to load all nine modes from the hosted API, fill and reveal answers, refresh a saved puzzle and complete it.
- Confirm new batch IDs appear in D1 after the scheduled workflow, and check an exclusion list returns unseen inventory first.
- Inspect sampled Worker logs/traces and D1 usage. Keep query strings redacted because they include a player's recent puzzle IDs.
- Check current platform quotas and billing configuration in Cloudflare and GitHub; use free plans and leave paid upgrades disabled unless explicitly chosen.
- Publication uses `INSERT OR IGNORE`, so existing puzzle bodies remain stable for saved browser progress. Correcting published content requires a new puzzle ID or a deliberate migration.
- Back up D1 before schema changes. Retain GitHub batch artifacts so generation problems can be reproduced by seed.
- When a mode cannot be filled, leave existing inventory live and expand the reviewed bank or templates. Never publish structurally invalid grids to meet a quota.

## Current remote state

- Site: https://crossword.kevinp.dev
- Repository: https://github.com/Kevu1495/crossword
- Cloudflare Worker: `crossword`
- D1 database: `crossword` (`437b453e-741f-4fc7-b486-ad5caf6ac66d`), APAC region.
- Initial D1 import: 17 puzzles spanning all nine modes, with reviewed clues and provenance.
- The custom domain is attached to this Worker; the existing portfolio at `kevinp.dev` is unchanged.

Initial deployment uses the connected Cloudflare app: register the static asset manifest, transfer assets using its temporary upload grant, upload SQL through the D1 import's signed URL, then deploy the exact built Worker and attach the domain. No general account credential is extracted or stored in this repository.

GitHub Actions verification runs on pushes. Automatic remote deployments and D1 replenishment need the three repository secrets listed above; until those are configured, generation saves artifacts and deployment remains manually dispatched.
