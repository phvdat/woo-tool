# Architecture

System-level map. For "which files do I open", see `FEATURES.md`. This document
explains **how the thing fits together**.

---

## 1. Process boot

`server.ts` is the entry point for both `npm run dev` and `npm run start`.

```ts
const app = next({ dev, hostname, port })
const handler = app.getRequestHandler()
app.prepare().then(async () => {
  startBlogCron()          // @/lib/blog/startBlogCron
  startYoutubeRetryCron()  // @/services/youtube/youtubeService
  startProductSpyCron()    // @/services/product-spy/scheduler
  startRevenueCron()       // @/services/revenue/scheduler
  const io = new Server(createServer(handler))   // Socket.IO relay
  httpServer.listen(port)
})
```

Two things follow from this:

- **Crons are dynamically imported inside `prepare()`.** Adding a 5th cron means
  editing `server.ts` *and* creating a `start*Cron()` export with an
  idempotency guard (module-level handle + `if (x) return`).
- **The Socket.IO server is a dumb broadcast relay.** No rooms, no per-socket
  filtering. Every inbound event is re-emitted to everyone; clients demultiplex
  by comparing a `socketId` field in the payload themselves.

### The 4 crons

| Cron | Source | Schedule | TZ | Work |
|---|---|---|---|---|
| `startBlogCron` | `src/lib/blog/startBlogCron.ts` | **per website**, from `websites.autoBlog.cron` | Asia/Ho_Chi_Minh | Auto-blog pipeline |
| `startYoutubeRetryCron` | `src/services/youtube/youtubeService.ts` | every 5 min (JS interval) | — | Retry failed YouTube publishes; release scheduled ones |
| `startProductSpyCron` | `src/services/product-spy/scheduler.ts` | `* * * * *` (every min) | Asia/Ho_Chi_Minh | Poll due competitors |
| `startRevenueCron` | `src/services/revenue/scheduler.ts` | `*/30 * * * *` | Asia/Ho_Chi_Minh | Sync WooCommerce orders → `revenue_history` |

Overlap protection is inconsistent. The two `node-cron` schedulers
(`product-spy/scheduler.ts:9`, `revenue/scheduler.ts:6`) use a module-level
`isRunning` guard *and* `noOverlap: true`. `startBlogCron` instead passes
`noOverlap: true` to `node-cron` with no `isRunning`. `startYoutubeRetryCron` is
a plain `setInterval` with an `if (retryInterval) return` idempotency guard and
no overlap protection at all.

`startBlogCron` is per-website and reconciles itself against Mongo via
`syncBlogCrons()`, which is re-invoked from `PUT /api/woo/website-config` so
editing a website hot-reloads its schedule.

## 2. Request lifecycle

```
Browser
  │
  ├─ SWR hook (src/app/hooks/*) ──axios/fetch──┐
  │                                            │
  └─ app/(page)/<tool>/*.tsx  "use client" ────┤
                                               ▼
                          src/app/api/<feature>/route.ts
                            │  optional getServerSession(authOptions)  ← 401
                            │  connectToDatabase()  →  db
                            ▼
                          src/services/<feature>/*.ts   (pure server logic)
                            │  axios → WooCommerce / WordPress / YouTube / Bing / Google
                            │  Puppeteer, sharp, ffmpeg, exiftool
                            ▼
                          MongoDB · /var/www/html/uploads · Telegram · Socket.IO
```

**Server-only vs client-only is a hard split:**

- Any file using `process.env`, `fs`, `sharp`, `mongodb`, `fluent-ffmpeg`, or
  `puppeteer` must live under `app/api/**`, `services/**`, `lib/**`, or
  `helper/**`. It must never be imported from a `"use client"` file.
- 45 files carry `"use client"`. The rest of the components are server components.
- `src/app/hooks/**` is the **only** client data layer. 12 hooks: 10 SWR data
  hooks plus `useDebounce` and `useLocalStorage`, which are local-state only.

## 3. Layering rules

```
src/app/api/**      route handlers — auth, request parsing, response shape
      ↓
src/services/**     business logic — no React, no HTTP concerns
      ↓
src/lib/**          mongodb, auth, encryption, ai clients, blog pipeline
src/helper/**       pure-ish utilities (watermark, csv, encoding, names)
src/constant/**     collections, endpoints, navigation, regex, prompts
src/types/**        domain types
```

Violations to avoid in new code:

- `services/**` must not import from `app/**` or `components/**`.
  (The only cross-service edge is `video/jobManager → youtube/youtubeService`,
  which is intentional and documented at the call site.)
- A route handler should be thin: validate → call a service → return. The
  existing exception is the Puppeteer crawl routes, which inline their logic
  because they are one-shot scripts.
- Shared logic that two features need goes in `src/helper/`, not duplicated
  into either feature.

## 4. Route groups

| Group | Purpose |
|---|---|
| `src/app/(auth)/login` | Only public page. `"use client"`, Google OAuth button. |
| `src/app/(page)/**` | Authenticated shell. `layout.tsx` → `MainLayout` (SessionProvider + Sidebar) + `ErrorBoundary`. |
| `src/app/api/**` | 36 route handlers. |

Most `(page)/<tool>/page.tsx` files are **7-line wrappers** that default-export a
`"use client"` component of the same name — keep that shape. Three are
legitimately different: `revenue/page.tsx` is a 131-line client component, and
`management-users/page.tsx` (15) and `settings/page.tsx` (12) are server
components that check the session/admin *before* rendering.

`/` (`src/app/page.tsx`) redirects to `/crawl-tool` via `navigation.crawlTool`.

## 5. Auth model

Two independent layers:

1. **`src/middleware.ts`** — re-exports `next-auth/middleware` with matcher
   `['/((?!api/auth|login|uploads|_next|favicon.ico|api/youtube/callback).*)']`.
   Everything not excluded requires a session. Note it does **not** exclude
   `/uploads` as a prefix match on the negative lookahead beyond the literal,
   and `api/youtube/callback` is excluded because Google redirects there.

2. **`getServerSession(authOptions)` inside the handler** — only 19 of 36 routes
   do this. It is the stronger, intended pattern; add it to new routes.

`authOptions` (`src/lib/auth.ts`) is unusual: the `signIn` callback fetches
**every email in the `users` collection**, appends `NEXT_PUBLIC_ADMIN_EMAIL`,
and only allows a Google sign-in whose verified email is in that list. So the
`users` collection *is* the allowlist. There is no password path.

`NEXT_PUBLIC_ADMIN_EMAIL` is the super-admin and is always allowed to sign in
(`lib/auth.ts` pushes it into the allowlist). It **only** gates
`/management-users` — `management-users/page.tsx:8-10` returns `Unauthorized`
for anyone else. `/settings` computes `isAdmin` in `settings/page.tsx:8` and
passes it to `Setting.tsx`, which **ignores it**; any signed-in user can load
`/settings`.

## 6. Data access

There is no ODM and no repository layer. Every service calls
`connectToDatabase()` from `src/lib/mongodb.ts` and uses the raw driver:

```ts
import { connectToDatabase } from '@/lib/mongodb'
const { db } = await connectToDatabase()
const docs = await db.collection(WEBSITES_COLLECTION).find({...}).toArray()
```

- The client is memoized on `global._mongo` so it survives dev HMR.
- Missing `MONGODB_URI` / `MONGODB_DB` **throws at import time**.
- Collection names are constants in `src/constant/collections.ts`. Details and
  field shapes: `DATA.md`.
- **No indexes are defined** anywhere except one lazy unique index in
  `revenue_history` on `{ websiteId, orderId }`. Do not assume a query is fast.

### Multi-tenant access control

User → websites is "owner OR member":

```ts
{ $or: [{ owner: email }, { members: email }] }   // lowercased
```

The canonical helper is `buildWebsiteAccessFilter(userEmail)` in
`src/services/revenue/websiteAccess.ts`. The same `$or` is hand-duplicated in
`src/app/api/woo/website-config/route.ts`. If you add a route that returns
per-user data, filter by website access first.

## 7. Realtime

`src/config/socket.ts` exports a singleton `getSocket()` (`socket.io-client`,
`autoConnect: false`, URL from `NEXT_PUBLIC_APP_URL`). Several call sites connect
independently, so there are multiple client sockets per page load; this is known
and harmless.

Events: `pipeline-progress`, `pipeline-error`, `pipeline-finished`,
`crawl-progress`, `crawl-error`, `video-progress`, `video-completed`,
`video-error`. All are relayed by `server.ts`. `pipeline-image-failed` is emitted
but never relayed or consumed (dead).

Correlation is **client-side only**: payloads carry a `socketId` and the client
compares it. Do not expect the server to route these per-socket.

## 8. External systems

| System | Where | Notes |
|---|---|---|
| MongoDB | `src/lib/mongodb.ts` | Atlas, `MONGODB_URI` |
| WooCommerce REST v3 | `uploadProducts`, `loadOrders`, `api/video/*` | HTTP Basic with per-site `wpUsername` / `wpAppPassword` |
| WordPress REST | `src/lib/blog/wordpress.ts` | Manual `Authorization: Basic base64(user:pass)` |
| WooCommerce Store API | `src/services/product-spy/woocommerce.ts` | **Unauthenticated** public product list |
| YouTube Data API v3 | `src/services/youtube/youtubeService.ts` | OAuth per website; tokens AES-256-GCM encrypted at rest |
| Google OAuth | `src/lib/auth.ts` | NextAuth provider |
| Google Trends | `python/google_trends.py` | `execFile` subprocess, `trendspy`, 5-min in-memory cache |
| Google News RSS | `src/lib/blog/getNewsContext.ts` | `rss-parser` |
| Bing Images | `src/lib/blog/searchImages.ts` | Puppeteer scrape, `headless: false` (needs Xvfb) |
| Gemini / OpenAI / DeepSeek / PawanAI | `src/services/ai/*` | See `CONVENTIONS.md` § AI providers |
| Telegram Bot API | `src/services/telegram/*` | Result files + notifications |
| ffmpeg | `src/services/video/renderVideo.ts` | `fluent-ffmpeg`, binary from `PATH` |
| exiftool | `src/helper/add-metadata-image.ts` | `exiftool-vendored` |
| sharp | `src/helper/website.ts`, `src/services/video/imagePrep.ts` | Watermarking, format conversion |
| Firebase | `src/lib/firebase.ts` | Config exists, currently **unused** by any flow |

## 9. Filesystem layout

Not repo-relative. The app writes to absolute host paths served by nginx:

```
/var/www/html/uploads/            ← nginx `location /uploads/` alias
  <shopName minus .com>/          watermarked product images
  videos/<jobId>/product-<id>.mp4
  music/<websiteId>/bg.mp3
  music/global/<uuid>.<ext>      uploaded audio library
  blogs/<jobId>/                  composited blog images
  zips/images-<jobId>.zip
```

Temp/scratch:

```
/tmp/video-gen/<jobId>/frame-0000.jpg
/tmp/media-temp/<shopName>/<ts>/
```

Public asset URLs are built as `${process.env.NEXTAUTH_URL}/uploads/...` — see
`src/helper/website.ts`, `src/helper/format-image.ts`,
`api/video/audio/route.ts`, `api/woo/website-config/upload-music/route.ts`.

The product pipeline's `exportExcel` is a misnomer: it writes a **CSV into
`process.cwd()`** and sends it to Telegram. Same for the crawl routes, which
write XLSX into CWD then `unlinkSync`.

## 10. TypeScript & build

- `@/*` → `./src/*` (tsconfig `paths`). Every import in the repo uses this alias.
- `strict: true`, `noEmit: true`, `moduleResolution: node`, `jsx: preserve`.
- `npm run lint` = `next lint`, extends `next`, with
  `react-hooks/exhaustive-deps` **off** (so missing deps will not be flagged —
  you must reason about them yourself).
- `tsconfig.server.json` + `nodemon.json` exist for a `ts-node server.ts` path
  that is not the default; the default dev script uses `tsx watch`.
- No test runner, no test files, no test config.

## 11. The one "read once" file

If you read nothing else in `src/`, read `server.ts`. It is 51 lines and it
tells you: the runtime, the crons, the socket events, the port, and dev/prod
switching. Most architectural confusion in this repo dissolves after that file.
