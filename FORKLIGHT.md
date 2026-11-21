# Forklight

A small decision journal: compare options, stress-test a priority, record why you chose, then reflect on the outcome.

**Status: working calculation engine and locally served browser interface; not deployed.** This environment denied npm registry access with HTTP 403. There was no connected GitHub account. The DeepSpace SDK could not be installed or run. Browser automation could not launch because Chromium's process-singleton socket was denied by the execution sandbox. No live URL or remote repository has been created. Do not submit this as a verified DeepSpace deployment yet.

## Try the interface without dependencies

Requires Node 22 or newer. In this folder:

```sh
npm run preview
```

Open http://127.0.0.1:4173. This is explicitly a **browser demo**: it saves in localStorage on your device, with no sign-in or remote database. The demo adapter is not included in the DeepSpace installation. The view and calculation engine are shared with the production adapter.

Try: change a rating → change an importance slider → inspect sensitivity → save a draft → reopen → choose an option (even a lower-scoring one) → write a rationale → record → add a reflection → duplicate to explore a different choice.

```sh
npm test
```

Ten automated tests pass: eight engine tests (including 100 generated matrices checked against an independent weighted calculation) and two installer tests against a local scaffold-shaped fixture. See `VERIFICATION.md` for exactly what was and was not run.

## Finish on DeepSpace

Use a terminal with npm and DeepSpace network access. The installer deliberately extends the official scaffold; it does not attempt to recreate its worker, OAuth, token handling or sync transport from documentation.

From the parent folder containing this `forklight` folder:

```sh
npm create deepspace@latest forklight-clinton
node forklight/scripts/install.mjs ./forklight-clinton
cd forklight-clinton
npx deepspace auth whoami --json
```

If signed out, run `npx deepspace auth login` and complete browser sign-in. Confirm the intended account **before** running any command that registers the app. App names are globally unique: choose an available lowercase name when scaffolding, and substitute it in both commands above.

The installer copies the engine, view and styles to `src/forklight`, installs the page at `src/pages/(app)/(protected)/decisions.tsx`, registers the private `decisions` schema, and changes the root page to open `/decisions`. It preserves the scaffold's worker, users schema and authentication providers. Review the changes; the scaffold and current installed SDK types are authoritative if they differ from the documentation used to prepare this overlay. The installer has only been tested against a local scaffold-shaped fixture, **not** a downloaded DeepSpace scaffold.

Then:

```sh
npx tsc --noEmit
npm run build
npx deepspace dev start
```

Use `/decisions` and complete the manual checks in `VERIFICATION.md`. In a second terminal in the scaffold:

```sh
npx deepspace test run
npx deepspace test run all
```

The platform tests do not automatically test the custom Forklight workflow. Add the listed two-account and confirmed-write checks using the current `deepspace/testing` fixture, or perform and record them manually before submitting.

Create your submission repository from the **generated scaffold**, including its lockfile and these feature files. Check `git remote -v` before adding a remote. If using GitHub, connect the intended GitHub repository and push `main` before the first deploy. DeepSpace determines source authority permanently at first source use; do not run `deepspace push` first if you intend GitHub source. Avoid committing `.dev.vars`, `.deepspace`, `.wrangler`, or credentials.

After build and important-path checks pass:

```sh
npx deepspace deploy
npx deepspace releases
```

Use the actual URL returned by deploy, verify it from a signed-out browser and two separate accounts, and then complete `SUBMISSION.md`. A successful build or deploy response alone is not an end-to-end check.

## Product scope and technical choices

- **One private journal per user.** DeepSpace's scaffold supplies sign-in and JWT verification. A `decisions` collection uses server-enforced `own` access for members and admins; anonymous and viewer permissions are denied. Caller identity and ownership are never supplied by the view.
- **Confirmed persistence.** DeepSpace's `createConfirmed` and `putConfirmed` gate success feedback and recorded state. Saving is disabled until `ready`. Rejected saves keep edits visible.
- **One JSON document per decision.** The whole matrix changes atomically as one record, avoiding inconsistent child rows and an unnecessary transaction layer. The tradeoff is coarse updates, limited database querying, and last-writer-wins if two tabs save at exactly the same time. Incoming changes pause saving on a dirty tab; this is not server-side compare-and-swap.
- **Transparent calculations.** `score = 100 × sum(weight × rating) / (5 × sum(weight))`. Integer numerators decide rank and exact ties; only the display is rounded. Ratings are 1–5, weights 1–10, and unanswered ratings block rankings. This is a subjective additive model, not a prediction or objective recommendation.
- **Sensitivity with a clear boundary.** Each selected criterion is swept through all ten allowed weights while the others stay fixed. The UI shows changes and ties. This does not claim robustness to simultaneous changes or uncertainty in the ratings.
- **A journal, not an audit log.** Recording makes the matrix read-only in the product and leaves reflection editable. Owners can still change their own JSON through the data API. Server-enforced immutability is not claimed. Duplicate creates a fresh draft with an independent matrix.
- **A narrow framework boundary.** A small React page adapts DeepSpace hooks to a framework-independent DOM view. This lets the same UI run without downloading dependencies in the restricted environment. With a verified SDK runtime, I would consider moving the view into React components for simpler maintenance and focused rerenders.

## Integrations deliberately left out

No third-party integrations are needed. OAuth, record storage, permissions, realtime subscriptions and hosting are the intended DeepSpace primitives. AI-generated recommendations would make subjective judgments harder to inspect; email reminders, payments and calendar access do not improve the core compare → test → decide → reflect loop. No external API keys or app secrets are required. Optional web fonts fall back to system fonts.

## What to do next

First install and typecheck against the real SDK, run the important path and account-isolation checks, and deploy. Those are submission blockers. Afterward, the highest-value improvement is a server-side revision check for concurrent edits. Import/export, sharing, charts for simultaneous sensitivity and reminders are intentionally outside the five-day scope.

## File map

| File | Purpose |
| --- | --- |
| `app/engine.mjs` | Validation, weighted ranking, sensitivity, recording and duplication |
| `app/view.mjs` | Shared interactive UI with a persistence adapter |
| `app/preview.mjs` | Explicit localStorage demo adapter |
| `deepspace/decisions.tsx` | React bridge to live DeepSpace records and confirmed writes |
| `deepspace/decisions-schema.ts` | Private collection permissions |
| `scripts/install.mjs` | Adds the feature to a fresh official scaffold |
| `tests/engine.test.mjs` | Dependency-free calculation tests |
| `tests/browser.mjs` | Browser workflow tests, prepared but not executed successfully here |

## References consulted

[DeepSpace skill](https://github.com/deepdotspace/deepspace-skill/blob/main/skills/deepspace/SKILL.md), [quickstart](https://docs.deep.space/get-started/quickstart), [authentication](https://docs.deep.space/guides/authentication), [permissions](https://docs.deep.space/concepts/permissions), [records API](https://docs.deep.space/sdk-reference/client/records), [schema API](https://docs.deep.space/sdk-reference/worker/schemas), and [source authority](https://docs.deep.space/guides/source-control), accessed November 21, 2026.

Reviewed the [StoryNest](https://github.com/deepdotspace/storynest) and [ThreadHunt](https://github.com/deepdotspace/threadhunt) project descriptions and repository layouts for their focused end-to-end workflows. This project uses its own concept and implementation; no example source code was copied.
