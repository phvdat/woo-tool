---
name: woo-tool-verify
description: Verify a change in the woo-tool repo before claiming it works. Use before finishing any code task, when asked "does this work", "is it done", or "run the checks". Triggers - "verify", "typecheck", "lint", "build", "did it work", "check my change", "ready to commit", "tests". Vitest covers pure helpers only; everything else relies on typecheck/lint/build.
---

# Verifying changes in WooTool

Typecheck first, then lint, then a scoped build. A green `npm test` says nothing
about anything that calls an external API, Mongo, a socket, or renders UI.

## The ladder

Run in order. Stop at the first failure; fix before continuing.

```bash
# 1. Typecheck — the real gate. Fastest signal, catches most breakage.
npx tsc --noEmit

# 2. Lint — next lint. Note: react-hooks/exhaustive-deps is OFF, so stale
#    hook deps are NOT caught here. Reason about them yourself.
npm run lint

# 3. Tests — pure logic only (research helpers, enrichProducts). Anything
#    calling an external API, Mongo, a socket, or rendering UI is uncovered.
npm test

# 4. Build — ONLY when you touched app/ routing, auth, or API surface.
#    This is the slow one (~1-2 min). Skip for pure service/helper/constant edits.
npm run build
```

`tsconfig.json` has `incremental: true`, so repeat typechecks are fast.

## When to run the build

| Change | Typecheck | Lint | Build |
|---|---|---|---|
| `src/services/**`, `src/helper/**`, `src/lib/**` logic | yes | yes | no |
| A new/changed API route, page, or component | yes | yes | yes |
| `authOptions`, `middleware.ts`, `next.config.mjs`, `server.ts` | yes | yes | yes |
| A new `endpoint.*` entry, collection constant, or type | yes | yes | no |
| `src/services/research/**`, `enrichProducts` | yes | yes | no (add `npm test`) |
| Doc-only change (this is what a docs task does) | no | no | no |

If `npm run build` is needed, it must succeed — the app is deployed via
`pm2 ... run start` → `tsx server.ts`, which serves the built Next app. A
failing build means a broken deploy, not just a failed check.

## Things a clean typecheck + lint will NOT catch

Typecheck and lint are static. These require reading or running the app:

- **Crons.** They only run under `server.ts`. If you touched `startBlogCron`,
  `startYoutubeRetryCron`, `startProductSpyCron`, or `startRevenueCron`,
  verify by starting the app (`npm run dev`) and confirming the
  `[CRON] Schedule …` / `Cron started` / `[REVENUE] Starting cron` log line
  at boot.
- **Socket events.** The relay is a dumb broadcast; nothing type-checks the
  payload shape end to end. If you add/renamed an event, confirm the
  `server.ts` relay line exists *and* the client filters on the correlation
  field (`socketId` / `jobId`) — see `CONVENTIONS.md` §9.
- **Mongo query correctness.** A wrong filter type (e.g. comparing an
  ISO-string timestamp as a `Date`) type-checks fine and returns `{}`. Check
  the collection's timestamp convention in `DATA.md` §2.
- **Woo / WordPress / YouTube / Telegram / Google calls.** All external. No
  mocks exist in the repo.
- **Puppeteer, sharp, ffmpeg, exiftool.** Native/browser deps. Nothing here
  exercises them.
- **Filesystem writes.** They go to `/var/www/html/uploads/…`, not `public/`.
  A missing nginx alias or permission problem is invisible to any check.
- **Auth guard coverage.** If you added a route, confirm you added
  `getServerSession(authOptions)` — a missing check will not fail any of the
  commands above. See `GOTCHAS.md` §1.

## Manual verification recipe (when there's no shortcut)

```bash
npm run dev          # tsx watch server.ts — boots Next + 4 crons + Socket.IO
# then, in another shell, hit the endpoint you changed:
curl -s http://localhost:3000/api/<your-route> | head
# check the server log for the bracketed prefix of the subsystem you touched,
# e.g. [REVENUE], [CRON], [AUTO BLOG], [AUTH], [AI], [WEBSITE CONFIG].
```

Note the app requires a Mongo connection (`MONGODB_URI`/`MONGODB_DB` throw at
import if missing) and a `users` document containing your email to sign in.

## Before you report done

- [ ] `npx tsc --noEmit` clean
- [ ] `npm run lint` clean (and hooks deps reasoned about manually)
- [ ] `npm run build` clean, if routing/auth/API surface changed
- [ ] Any new route has `getServerSession` + a `endpoint.*` entry
- [ ] Any new collection has a constant in `src/constant/collections.ts` **and**
      an entry in `docs/agent/DATA.md`
- [ ] New cron registered in `server.ts`
- [ ] New feature/route/hook added to `docs/agent/FEATURES.md`
- [ ] `git status` shows only intended files — no `.env`, no `node_modules`,
      no `tsconfig.tsbuildinfo`, no `/var/www` artifacts

## Reporting honestly

- Say what you ran and what it output.
- If you could not run something (no DB, no ffmpeg, no Chrome), say so rather
  than implying it passed.
- Quote test scope when you cite it: the suite covers pure logic only, so say so
  rather than implying the feature is verified end to end.
- If you changed only documentation/config (no `src/` edits), say the change is
  docs-only and that no runtime verification was needed.
