---
name: woo-tool-scout
description: Find the right files in the woo-tool repo without scanning everything. Use when you need to locate where a feature, route, hook, collection, cron, or integration lives, or when starting a task in an unfamiliar area of WooTool. Triggers - "where is", "find the file", "which files", "how does X work", "add a feature", "trace", "scout", "locate", "before I edit".
---

# Scouting WooTool

Goal: open **3–6 files**, not 213. The repo has a router for this — use it
before you search.

> **Tooling note:** `rg` is **not installed** in this environment. Use the
> `grep` and `glob` tools, not `rg`. `find`, `wc`, `git`, and `node` are fine.

## Step 0 — Read the router, not the code

`AGENTS.md` is a router. `docs/agent/FEATURES.md` maps a **task keyword** to
the **exact ordered list of files** to open. Find your keyword in
`FEATURES.md` §1 and jump to the section. Most of the time this ends the search.

Only fall through to real searching when:
- your task spans features (§1 has no keyword for it), or
- the docs disagree with the code (then fix the doc — see
  `docs/agent/README.md`).

## Step 1 — Anchor the feature

Pick the smallest set that identifies the area. Read in this order; stop when
you have the answer.

| Question | Open |
|---|---|
| What does this entry point do? | `server.ts` (51 lines) |
| Which feature owns this page? | `src/constant/navigation.ts` + `src/components/sidebar/Sidebar.tsx` |
| What's the file order for feature X? | `docs/agent/FEATURES.md` § feature |
| What data does X read/write? | `docs/agent/DATA.md` § 2 |
| What conventions apply? | `docs/agent/CONVENTIONS.md` |
| Is this a known trap? | `docs/agent/GOTCHAS.md` |

## Step 2 — Trace one path, not the whole feature

The wiring is always the same shape. Pick a single request/flow and follow it
inward, using `grep` for the symbol rather than reading directories.

**Component → API → service → Mongo.** To find who calls a page, grep for its
default export name. To find what a route does, read the `route.ts` and follow
its service imports:

```
grep(pattern: "endpoint\\.productPipeline", path: "src")     # who calls the API?
grep(pattern: "runProductPipeline",       path: "src")       # the orchestrator
grep(pattern: "CATEGORIES_COLLECTION",    path: "src")       # every collection touch
```

**The 6 grep queries that answer most questions:**

1. `endpoint\.` — every client → API call site (misses hardcoded URLs; those are bugs).
2. `COLLECTION` / the constant name — every place a collection is read/written.
3. `getServerSession` — which routes self-guard vs relying on middleware.
4. `getSocket|\.emit\(|\.on\(` — every realtime producer and consumer.
5. `"use client"` — the client/server boundary; anything else is a server component.
6. `process\.env\.` — every external dependency and its env var.

**For a symbol, find both ends at once:**

```
grep(pattern: "^export (async )?function myThing|^export const myThing", path: "src")
```
then grep `myThing` across `src` to see definition + every call site in one hit.

## Step 3 — Read the orchestrator, not the leaves

Every feature has one file that reveals the whole flow. Read that first:

| Feature | Orchestrator to read first |
|---|---|
| Product pipeline | `src/services/product-pipeline/index.ts` |
| Product spy | `src/services/product-spy/detector.ts` |
| Video | `src/services/video/jobManager.ts` |
| YouTube | `src/services/youtube/youtubeService.ts` (`publishToYoutube`) |
| Revenue | `src/services/revenue/syncRevenue.ts` + `loadRevenue.ts` |
| Auto blog | `src/lib/blog/runAutoBlog.ts` |
| Crawl | `src/app/api/crawl/detail-mixed-product/route.ts` |
| Convert file | `src/app/(page)/convert-file/ConvertFile.tsx` |

`FEATURES.md` gives the full ordered list per feature; §1 tells you which one
your task maps to.

## Step 4 — Know the sizes so you budget your reads

The repo is 213 TS files / ~20k lines. The files that actually matter:

| File | Lines | Why |
|---|---|---|
| `src/services/product-spy/generic.ts` | 832 | biggest file; universal scraper |
| `src/services/youtube/youtubeService.ts` | 778 | all OAuth + publish + cron |
| `src/services/product-spy/shopbase.ts` | 525 | self-contained adapter |
| `src/components/sidebar/Sidebar.tsx` | 526 | nav + which features exist |
| `src/app/(page)/convert-file/ConvertFile.tsx` | 519 | biggest tool |
| `src/services/product-pipeline/index.ts` | 91 | pipeline order (read this, it's short) |
| `server.ts` | 51 | the runtime |

Big files are **sectioned**. Don't read one end-to-end. E.g. `youtubeService.ts`:
OAuth block → `publishToYoutube` → comment rules → cron, in that order, using
`grep` to jump between them.

## Step 5 — Delegate wide sweeps

If your question genuinely spans 3+ features, use the `task` tool with
`subagent_type: "explore"` rather than reading across the tree yourself. Ask it
for: entry points, the ordered flow, the import graph, and collection
touches — explicitly *not* file dumps. Ask for `file_path:line` references so
you can jump straight there.

## Anti-patterns

- `ls -R src` then reading everything. Use `docs/agent/FEATURES.md`.
- Reading a 500-line component when the `page.tsx` wrapper plus the hook would
  answer the question. `(page)/<tool>/page.tsx` is a 7-line re-export.
- `grep` for a string when you could read the 20-line file that defines it
  (`src/services/revenue/index.ts`, `src/constant/collections.ts`,
  `src/services/video/config.ts`, `src/middleware.ts`).
- Grepping for a hardcoded `'/api/...'` string to find a caller — components
  use `endpoint.*`, so grep `endpoint\.` instead.
- "Fixing" duplication you happen to notice. It is catalogued in
  `GOTCHAS.md` §2 and is out of scope unless the task is about it.
