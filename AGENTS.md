# WooTool — Agent Entry Point

**Read this file first. Then read ONLY the doc(s) your task routes to. Do not scan the repo.**

WooTool is a private Next.js 14 (App Router) admin panel that automates WooCommerce
stores: product pipelines, competitor crawling, video generation + YouTube publishing,
revenue analytics, and auto-blogging. It is a single Node process, MongoDB-backed,
Ant Design UI.

This file is an **index**, not a knowledge dump. Reference material lives in `docs/agent/`
and is loaded on demand.

---

## 1. Runtime model (the #1 thing to get right)

`npm run dev` and `npm run start` **do not run `next dev` / `next start`.** They run
`tsx server.ts` — a custom HTTP server that:

1. boots Next programmatically,
2. dynamically imports and starts **4 in-process crons**,
3. attaches a **Socket.IO** relay,
4. then listens on `PORT` (default 3000).

Consequences:

- **Background work (crons) only runs under `server.ts`.** Anything that assumes
  `next build` + `next start` is wrong for this repo.
- There is no `instrumentation.ts` and no Vercel-style runtime. Crons are Node
  `node-cron` jobs owned by the process.
- 5-minute Google Trends cache, in-memory video queue, and in-memory `Set`
  dedupe guards all live in module scope → **lost on restart**, and there is exactly
  one instance per process. Never assume horizontal scaling.

Boot sequence lives in `server.ts` (51 lines) — read it once, it is worth it.

## 2. Task router — read the doc your task routes to

| Your task touches… | Read this (and nothing else until you need more) |
|---|---|
| Anything not listed below | `docs/agent/ARCHITECTURE.md` |
| A specific feature/page/tool (product pipeline, product spy, video, YouTube, revenue, blog, crawl, convert-file, excel-splitter, format-image, original-product, settings) | `docs/agent/FEATURES.md` → jump to that feature's section |
| Writing new code matching house style, adding a page/route/hook/service/collection | `docs/agent/CONVENTIONS.md` |
| Mongo collections, env vars, external APIs, filesystem paths | `docs/agent/DATA.md` |
| Anything that looks broken/duplicated/inconsistent before you "fix" it | `docs/agent/GOTCHAS.md` |
| Where to find files for a task; search recipes | skill `woo-tool-scout` |
| How to verify a change (tests cover pure helpers only) | skill `woo-tool-verify` |

`docs/agent/FEATURES.md` is the highest-value file: it maps a task keyword to the
**exact ordered list of files** to open. Use it before any search.

## 3. Hard rules

- **Never hardcode an API path in a component.** All client-side URLs come from the
  `endpoint` object in `src/constant/endpoint.ts`. Add there first.
- **Never invent a collection name.** All are constants in
  `src/constant/collections.ts`. (`blog_history` is one legacy exception — see GOTCHAS.)
- **WooCommerce credentials are not env vars.** They live per-website in Mongo
  (`websites.wpUsername` / `websites.wpAppPassword`) and are used for HTTP Basic auth.
  Do not add `ck_`/`cs_` consumer keys.
- **Writes to disk are absolute host paths** (`/var/www/html/uploads/...`), not
  `public/`. Nginx serves `/uploads/` from `/var/www/html/uploads/`. Code that
  returns asset URLs builds them from `NEXTAUTH_URL`.
- **Mongo `_id` is an `ObjectId`** but crosses the wire as a **string**. Routes
  stringify on read; inputs use `new ObjectId(...)` on write. Client types declare
  `_id?: string`.
- **Timestamps are not uniform.** `revenue_history.date` is a *string* (raw
  WooCommerce `date_created`, comparable lexicographically because the format is
  fixed-width ISO-8601). Most other collections write `createdAt` as an ISO
  *string*; six collections (`revenue_history`, `blog_history`, `global_config`,
  `videoJobs`, `audioFiles`, `youtubeChannels`) write real `Date`s. **Check the
  target collection before writing a date-range query** — see `DATA.md` §2.
- **Auth:** `src/middleware.ts` protects everything except `api/auth`, `login`,
  `uploads`, `_next`, `favicon.ico`, `api/youtube/callback`. Only 19 of 36 route
  handlers additionally call `getServerSession`. For any new route that reads or
  writes user data, add the explicit `getServerSession(authOptions)` check —
  that is the stronger, intended pattern.
- **Access control** for multi-tenant data is "user is `owner` OR in `members`"
  against the `websites` collection. Canonical helper:
  `buildWebsiteAccessFilter(userEmail)` in `src/services/revenue/websiteAccess.ts`.
- **Do not add dependencies** without asking. The dep list in `package.json` is
  load-bearing (puppeteer, sharp, exiftool-vendored, fluent-ffmpeg, node-cron…).
- **Do not rename or "tidy" existing code** as a side effect of an unrelated task.
  Known duplication is catalogued in GOTCHAS; leave it unless asked.

## 4. Layout in one screen

```
server.ts                     custom server: Next + 4 crons + Socket.IO   ← read once
src/middleware.ts             next-auth guard + matcher
src/app/
  layout.tsx                  root: AntdRegistry + ConfigProvider(theme)
  page.tsx                    redirects / -> /crawl-tool
  (auth)/login/               public
  (page)/layout.tsx           MainLayout (SessionProvider + Sidebar) + ErrorBoundary
  (page)/<feature>/           one folder per tool; page.tsx is a 7-line wrapper
  api/<feature>/route.ts      36 App Router route handlers
  hooks/                      12 SWR/client hooks (the only client data layer)
src/components/<feature>/     feature UI
src/services/<feature>/       server logic, no React
src/lib/                      mongodb, auth, encryption, ai, blog pipeline
src/helper/                   pure-ish utilities (watermark, csv, encoding, names)
src/constant/                 collections, endpoints, navigation, regex, prompts
src/types/                    5 domain type files
src/theme/themeConfig.ts      antd tokens
python/google_trends.py       the only Python file; called via child_process
```

**Layering (imports flow downward only):**
`app/api/**` → `services/**` → `lib` / `helper` / `constant` / `types`.
`services/**` must not import from `app/**` or `components/**`.

## 5. Verify before you claim done

Run:

```bash
npx tsc --noEmit        # typecheck — the real gate
npm run lint            # next lint
npm test                # Vitest — pure helpers + enrichProducts only
npm run build           # only when you touched app/ routing, auth, or API shape
```

Typecheck first; it is the fastest signal. A green `npm test` says nothing about
UI, routes, crons, sockets, or anything calling an external API. See skill
`woo-tool-verify`.

## 6. Keeping this memory honest

`docs/agent/` is a cache, not a source of truth. If you discover the docs are wrong
or stale, fix the doc in the same change. If you add a feature, route, hook,
collection, or cron, add it to `docs/agent/FEATURES.md` / `DATA.md` — see
`docs/agent/README.md` for the maintenance checklist.
