# Agent context — maintenance

This directory is a **cache of the codebase**, written for AI coding sessions.
The source of truth is the code. When they disagree, the code wins and this
cache is wrong and must be fixed in the same change.

## Layout

| File | Read it when | Size discipline |
|---|---|---|
| `ARCHITECTURE.md` | You need the system shape: runtime, layering, request lifecycle, crons, external systems, filesystem. | Coarse. Don't add per-file detail. |
| `FEATURES.md` | **You need to find files.** Task keyword → ordered file list, per feature. | Keep the ordered lists tight and accurate. This is the highest-value file. |
| `CONVENTIONS.md` | You're writing code or adding a slice: style, API-route shape, SWR hooks, layers, AI providers, sockets, asset paths. | Only stable, repeatable patterns. |
| `DATA.md` | You're writing a Mongo query, reading a collection, adding an env var, touching an integration or disk path. | Schemas + env vars + paths. No prose. |
| `GOTCHAS.md` | Something looks broken/duplicated/inconsistent and you might "fix" it wrongly. | Short bullets. Prune aggressively. |

Skills live in `.opencode/skills/` and encode *procedures* (how to find things,
how to verify, how to add a slice) rather than reference facts — those belong
in the docs above.

## Rules for keeping this honest

1. **Never duplicate.** A fact lives in exactly one doc. If you find yourself
   copy-pasting a table into two files, link instead.
2. **Cite paths, not prose.** `src/services/revenue/syncRevenue.ts` is useful;
   a paragraph paraphrasing it is not — the agent can read 40 lines.
3. **Delete stale entries.** If a file moved, remove the old pointer rather
   than adding a second one.
4. **Don't grow `AGENTS.md`.** It is loaded every session. It is an index plus
   hard rules and nothing else. Push detail down.
5. **Prefer omission over hedging.** "This is what the code does" beats "this
   might do X depending on Y".

## When to update

Update the docs **in the same change** as the code, not later:

| You changed | Update |
|---|---|
| Added a feature / page / route | `FEATURES.md` (§2 table + a section) |
| Added a collection or changed a schema | `DATA.md` §2 + `CONVENTIONS.md` if a new pattern |
| Added / renamed an env var | `DATA.md` §3 + `.env.example` |
| Added a cron | `ARCHITECTURE.md` §1 cron table + `FEATURES.md` |
| Added a socket event | `ARCHITECTURE.md` §7 + `CONVENTIONS.md` §9 |
| Added a new page to the nav | `FEATURES.md` + `Sidebar.tsx` |
| Found a trap / dead code / duplication | `GOTCHAS.md` |
| Changed a convention others must follow | `CONVENTIONS.md` |

If you find a doc is **wrong**, fix it in the same change even if it's not part
of your task — that is the whole point of a maintained cache.

## Anti-goals

- Do not mirror the file tree here. Use `FEATURES.md` as an index, not a dump.
- Do not paste large code blocks. Reference `file:line` instead.
- Do not duplicate what a skill already does procedurally.
- Do not document the obvious (`npm run dev` runs the dev server).
- Do not add aspirational architecture. This is a record of the code as it is.
