# Gotchas & Known Issues

**Read this before "fixing" something that looks wrong.** Much of what looks
like a bug here is a deliberate design decision, a documented limitation, or
known-duplicated code that is out of scope for your task.

House rule: do not rename, restructure, or de-duplicate existing code as a side
effect of an unrelated change. Open a separate task for that.

---

## 1. Things that will trip you up

### The runtime is not `next dev` / `next start`
`npm run dev` = `tsx watch server.ts`. If you reason as if this were a stock
Next app you will mis-predict: no crons, no socket relay, no custom server
behaviour. See `ARCHITECTURE.md` §1.

### Crons only exist under `server.ts`
There is no `instrumentation.ts`. If the app is ever run through a plain
`next start`, all background work silently stops. The 5-minute trends cache,
the in-memory video queue, and the in-memory `Set` dedupe guards are all
module-scope and die with the process.

### `selectTrends.ts.ts` really is named that
A doubled `.ts` extension in `src/lib/blog/`. Don't "fix" the filename as a
drive-by; fix the import at the same time or not at all.

### Timestamp types differ per collection, and `revenue_history.date` is a string
Six collections write real `Date`s (`revenue_history`, `blog_history`,
`global_config`, `videoJobs`, `audioFiles`, `youtubeChannels`); the rest write
ISO **strings**. Within `revenue_history`, `createdAt`/`updatedAt` are `Date`s
but `date` is a **string** — the raw WooCommerce `date_created`. That is
intentional: fixed-width ISO-8601 sorts lexicographically in chronological
order, so the `$gte`/`$lte` range filter at `revenueHistory.ts:152-156` is
correct. **Check the target collection before writing a range query** — see
`DATA.md` §2.

### Mongo `_id` is an ObjectId on the wire as a string
Server stringifies on read (`{...d, _id: d._id.toString()}`); client types
declare `_id?: string`; writes use `new ObjectId(...)`. Mixing these up yields
`{}` queries that silently match nothing.

### No `ck_`/`cs_` Woo keys
Woo auth is HTTP Basic with per-website `wpUsername`/`wpAppPassword` stored in
the `websites` Mongo document. There are no consumer-key env vars. Don't add
them.

### Files go to `/var/www/html/uploads`, not `public/`
Nginx serves `/uploads/` from that path. Public URLs are built from
`NEXTAUTH_URL`. Writing to `public/` won't be served in production.

### The socket relay does no routing
`server.ts` rebroadcasts every inbound event to every client. Correlation is
done client-side by comparing a `socketId`/`jobId` in the payload. If you add a
socket consumer, you must filter client-side.

### `middleware.ts` is the only auth most routes get
It protects everything except `api/auth`, `login`, `uploads`, `_next`,
`favicon.ico`, `api/youtube/callback`. Only 19 of 36 route handlers add their
own `getServerSession`. The intended-but-incomplete pattern is to add the
explicit check in the handler; do that for new routes.

### `api/youtube/callback` is middleware-exempt but still session-guarded
Google redirects the browser there, so `src/middleware.ts` excludes it from the
matcher. The route *does* call `getServerSession(authOptions)`
(`route.ts:13-16`) and returns an `Unauthorized` HTML page without a session.
But the base64 `state` is **not signed** and is never cross-checked against
`session.user.email` — treat it as untrusted input.

---

## 2. Known duplication (don't clean up unasked)

- **`merchize.ts` / `merchking.ts` / `lattex.ts`** (product-spy) are largely
  duplicated — ~95% identical once identifiers are normalized, though a raw diff
  shows ~93 changed lines. Beyond the detection strings and the `source` value,
  the *detection* logic itself differs: `merchize.ts` has a `*.merchize.store`
  subdomain check, `merchking.ts` has a `window.merchking` JS-globals check.
- **`shopbase.ts`** re-implements JSON-LD + sitemap crawling that
  `generic.ts` already provides.
- **Two `MAX_CONCURRENT = 3` queues** — `product-spy/checker.ts` and
  `product-spy/scheduler.ts` implement the same hand-rolled promise queue.
- **Video job creation is duplicated** — `services/video/createVideoJobsFromPipeline.ts`
  and `api/video/generate/route.ts` contain near-identical ~60-line job builders
  (they differ only in config override + when `enqueueJob` is called).
- **`lib/blog/uploadImageToWordPress.ts`** is a dead duplicate of the
  `uploadImagesToWordpress` function inside `lib/blog/wordpress.ts`. Nothing
  imports it. Don't import it; don't delete it as a drive-by.

## 3. Dead / unused code (safe to leave alone)

- `src/lib/blog/uploadImageToWordPress.ts` — dead duplicate (above).
- `src/services/ai/deepseek.ts`, `src/services/ai/pawanAI.ts` — no importers.
- `src/lib/ai/client.ts` (`askAI`) — `writer.ts` imports it but never calls it
  (leftover from a provider migration).
- `src/lib/firebase.ts` + all six `NEXT_PUBLIC_FIREBASE_*` vars — configured but
  unused; the app uses local disk + Telegram instead.
- `src/services/video/jobManager.ts` `recoverPendingJobs()` — exported, never
  called. Jobs stuck in `preparing`/`rendering` are **not** auto-recovered on
  restart.
- `PipelineStep.COMPLETED` and `emitPipelineImageFailed` — defined, never used.
  `pipeline-image-failed` is not even relayed by the server.
- `navigation.createInitialFile` and `endpoint.wooConfig` / `endpoint.wooCreate`
  / `endpoint.openaiGenerate` — point to routes/pages that don't exist.
- `generic.ts` `isProductUrl` — exported, only used internally.

## 4. Edge-case behaviors that look wrong but aren't

### Product-spy dedupe is insert-only
`checker.ts` skips a product if `externalId` or `normalizedUrl` already exists.
It never updates price/images. So known products never refresh, and a product
that gains images later stays image-less in the UI. This is why `ProductList`
warns about products with no `Images` ("re-select them"). Not a regression —
don't "fix" the dedupe without a deliberate decision.

### `Platform` union omits `"facebook-ads"`
`facebook-ads.ts` writes `source: "facebook-ads"`, but that value isn't in the
`Platform` union, so those products are unreachable through the platform filter.
Only visible when the filter is cleared. Cosmetic, low priority.

### Spy adapters swallow errors
Adapters return `null` / an empty array / push to a `debug[]` string array
rather than throwing (only the WooCommerce adapter lets a page-1 failure
propagate, to trigger the generic fallback). A silent adapter usually means a
scraper that needs its detection strings updated, not a network outage.

### `detectPlatform` is expensive
It sequentially calls each `is<X>Store`, and several of those re-fetch the
homepage. One `detectPlatform` call can fire up to ~7 homepage requests.
`api/product-spy/competitors` `PATCH` re-detects every competitor sequentially
in one request.

### Video job claim is not atomic
`tryProcessNext()` uses a no-op `findOneAndUpdate` to "claim" the next pending
job. It only works because the in-process `isProcessing` flag serializes it.
Don't assume it's safe across processes.

### Blog `excerpt` is always undefined
`writer.ts`'s prompt requests 4 JSON fields but `BlogArticle` requires
`excerpt`; `publishWordpress` sends `article.excerpt` ⇒ `undefined` on every
publish. Known data-shape mismatch.

### `RevenueSummary` ignores `averageOrderValue`
`revenue/page.tsx` spreads `{...data.summary}`, so it passes `totalRefunded` and
`averageOrderValue` — but `RevenueSummaryProps` declares only `averageOrderValue`
of the two (`RevenueSummary.tsx:5-11`); `totalRefunded` is not a prop at all.
`averageOrderValue` is destructured (`:18`) and never rendered; only Revenue,
Fees, Net Revenue, and Orders are. `RevenueFilter` also doesn't expose the
server-supported `"month"` group-by.

### `revenue` has no SWR
The revenue page uses raw `useState` + axios, unlike the rest of the app. This
is deliberate (two distinct actions: Search = read ledger, Refresh = hit
WooCommerce). Don't "migrate it to SWR" unasked.

### `add-selector` POST omits `createdAt`
The GET sorts by `createdAt`, but POST never sets it. New selectors sort
unpredictably. Known gap.

### YouTube comment timing
A comment is only posted on immediate publish or when a scheduled video is
released; it retries 3× on release, 1× on fresh upload, because YouTube
rejects comments on private videos.

---

## 5. External / operational gotchas

- **Bing image scrape runs `headless: false`** (`searchImages.ts`) and
  `crawl/detail-mixed-product` also uses `headless: false`. Production needs
  `Xvfb :99` + `DISPLAY=:99` (see `README.md`) under PM2.
- **`getTrends.ts` uses relative paths** (`python/.venv/bin/python3`,
  `python/google_trends.py`) and hardcodes a POSIX interpreter path. It only
  works when the process CWD is the repo root, and not on Windows. The venv must
  be rebuilt on a fresh machine.
- **`puppeteer-core` is imported by the crawl routes but is not a declared
  dependency** — it's only transitive via `puppeteer`. This could break on a
  clean install. Don't add `puppeteer-core` without asking; mention it if a
  crawl route breaks after `npm ci`.
- **`api/format-image` instantiates its own `TelegramBot`** instead of the
  shared `telegramBot` singleton. Minor duplication.
- **Product pipeline `exportExcel` writes a CSV into `process.cwd()`**, not a
  temp dir, and the crawl routes write XLSX into CWD before `unlinkSync`. If
  the send fails, the file leaks.
- **`api/video/download/[id]` reads the whole MP4 into memory** with
  `readFileSync` before streaming. Fine for short vertical videos, heavy for
  long ones.
- **`syncBlogCrons()` is only called from `PUT /api/woo/website-config`** (plus
  boot). Creating or deleting a website does **not** reconcile the cron map
  until the next PUT or process restart.
- **Woo/WordPress credentials and per-user `apiKey`/`geminiApiKey` are stored in
  Mongo in plaintext.** Only YouTube tokens are encrypted (AES-256-GCM). Don't
  copy the plaintext pattern for a new secret.

## 6. Verification reality

- **Tests are Vitest and cover pure logic only** (`npm test`): the research
  helpers and `enrichProducts`, with the AI and socket modules mocked. Nothing that
  calls an external API, Mongo, a socket, or renders UI is covered, so a green run
  says nothing about those. Everywhere else, use `npx tsc --noEmit` + `npm run lint`
  (+ `npm run build` for routing/auth changes). See skill `woo-tool-verify`.
- `npm run lint` is `next lint` with `react-hooks/exhaustive-deps` **off**, so
  stale hook dependencies are not caught — reason about them manually.
- Features that depend on crons, sockets, Woo, YouTube, Puppeteer, or ffmpeg
  have no cheap automated check; verification for those is manual against a
  running server.
