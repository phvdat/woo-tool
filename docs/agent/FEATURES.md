# Feature & File Index

**This is the router.** Find your task in §1, then open the listed files in order.
Stop as soon as you have what you need. Do not read a feature end-to-end unless
the task actually spans all of it.

For cross-cutting concepts read `ARCHITECTURE.md`. For style, `CONVENTIONS.md`.
For schemas, `DATA.md`. For traps, `GOTCHAS.md`.

---

## 1. Task keyword → feature

| Task keyword | Section |
|---|---|
| "pipeline", "Excel to Woo", "upload products", "AI description", "AI tags" | [§3 Product Pipeline](#3-product-pipeline) |
| "research", "research a product title", "grounded search", "verified facts", "story brief", "sources" | [§3.1 Product Research](#31-product-research-opt-in-sub-pipeline) |
| "spy", "competitor", "crawl a store", "add a platform adapter", "TeeChip/Shopify/ShopBase" | [§4 Product Spy](#4-product-spy) |
| "video", "render", "Ken Burns", "ffmpeg", "video job" | [§5 Video Generator](#5-video-generator) |
| "YouTube", "channel connect", "OAuth", "publish video", "comment template" | [§6 YouTube](#6-youtube) |
| "revenue", "orders", "analytics", "chart", "refund", "fees" | [§7 Revenue](#7-revenue) |
| "blog", "Google Trends", "auto-post", "WordPress post" | [§8 Auto Blog](#8-auto-blog) |
| "crawl", "scraper", "selector", "Puppeteer", "XLSX of products" | [§9 Crawl Tool](#9-crawl-tool) |
| "convert-file", "clean Excel", "duplicate row", "size chart" | [§10 Convert File](#10-convert-file) |
| "excel-splitter", "split columns", "drag rows" | [§11 Excel Splitter](#11-excel-splitter) |
| "format-image", "zip images", "watermark" | [§12 Format Image](#12-format-image) |
| "original-product", "search saved products" | [§13 Original Product](#13-original-product) |
| "settings", "website config", "category preset", "profile", "API key" | [§14 Settings](#14-settings) |
| "users", "admin", "telegram id" | [§15 Management Users](#15-management-users) |
| "auth", "login", "session", "middleware", "guard" | [§16 Auth & Shell](#16-auth--shell) |
| "WooCommerce API", "wp-json", "create product", "attributes", "variations" | [§17 WooCommerce Layer](#17-woocommerce-layer) |
| "endpoint", "API path", "collection name", "add a route" | `CONVENTIONS.md` §2–3 |
| "test", "verify", "did it work" | skill `woo-tool-verify` |

## 2. Fast lookup — every feature at a glance

| Feature | Route | Page entry | Main service dir | API routes | Hooks |
|---|---|---|---|---|---|
| Product Pipeline | `/product-pipeline` | `src/app/(page)/product-pipeline/ProductPipeline.tsx` | `src/services/product-pipeline/` | `api/product-pipeline` | — |
| ↳ Product Research | *(panel on `/product-pipeline`)* | `src/components/product-pipeline/ResearchPanel.tsx` | `src/services/research/` | `api/research/preview`, `api/research/topics` | `useResearchPreview` |
| Product Spy | `/product-spy` | `src/components/product-spy/ProductSpyPage.tsx` | `src/services/product-spy/` | `api/product-spy/*` (4) | `useSpyProducts`, `useSpyCompetitors` |
| Video | `/video-generator` | `src/components/video-generator/VideoGeneratorPage.tsx` | `src/services/video/` | `api/video/*` (8) | `useVideoJobs` |
| YouTube | — | `src/components/settings/website/YouTubeConfig.tsx` | `src/services/youtube/` | `api/youtube/*` (5) | `useYouTubeChannel` |
| Revenue | `/revenue` | `src/app/(page)/revenue/page.tsx` | `src/services/revenue/` | `api/revenue`, `api/revenue/refresh` | — |
| Auto Blog | *(no page — `src/app/(page)/auto-post/` is an empty, untracked dir; absent in a fresh clone)* | *(none: cron/ops only)* | `src/lib/blog/` | `api/blog/run` | — |
| Crawl Tool | `/crawl-tool` | `src/app/(page)/crawl-tool/CrawlTool.tsx` | *(inline in routes)* | `api/crawl/*` (4) | — |
| Convert File | `/convert-file` | `src/app/(page)/convert-file/ConvertFile.tsx` | *(client-side)* | `api/woo/product-data` | `useCategories`, `useConfigWebsite`, `useGlobalCateKeywordConfig`, `useDebounce`, `useLocalStorage` |
| Excel Splitter | `/excel-splitter` | `src/app/(page)/excel-splitter/ExcelSplitter.tsx` | *(client-side)* | none | `useDebounce` |
| Format Image | `/format-image` | `src/app/(page)/format-image/FormatImage.tsx` | `src/helper/format-image.ts` | `api/format-image` | `useConfigWebsite`, `useUser` |
| Original Product | `/original-product` | `src/app/(page)/original-product/OriginalProduct.tsx` | — | `api/woo/product-data` | — |
| Settings | `/settings/*` | `src/app/(page)/settings/Setting.tsx` | — | `api/woo/*`, `api/users/*`, `api/global-config/*` | `useConfigWebsite`, `useCategories`, `useUser` |
| Users | `/management-users` | `src/components/management-users/UserList.tsx` | — | `api/users`, `api/users/detail` | `useUsers` |

---

## 3. Product Pipeline

**What it does:** an uploaded XLSX of products becomes AI-enriched,
watermarked, scheduled, WooCommerce-import-ready products uploaded to a
selected site — with an optional auto-video step afterwards.

**Read in this order:**

1. `src/services/product-pipeline/index.ts` — **the orchestrator, read this first.**
   `runProductPipeline(context)` fixes the stage order:
   `load user + website + categories` → `buildProducts` → `enrichProducts` →
   `publishedTimeHelper` → `exportExcel` (Telegram CSV) → `uploadProducts` →
   optional `createVideoJobsFromPipeline`.
2. `src/services/product-pipeline/types.ts` — `ProductPipelineContext`
   `{ file, websiteId, userEmail, socketId }`. 5 lines.
3. `src/services/product-pipeline/buildProducts.ts` — XLSX parse, `Choose Your
   Style` index parsing, watermarking, `createWooRecord` per row.
4. `src/services/product-pipeline/enrichProducts.ts` — long description, SEO meta,
   batched tags. Sequential per product; `mixed` shuffles output order. When
   `website.product.researchEnabled` is true it first calls `researchBatch()` and
   hands the result to `buildDescriptionPrompt()` — see §3.1.
5. `src/services/product-pipeline/uploadProducts.ts` — Woo client, per-product
   error isolation, progress emit.
6. `src/services/product-pipeline/createProduct.ts` — simple vs variable,
   attribute term resolution, variations.
7. `src/services/product-pipeline/loadCategories.ts` — `"Parent > Child"` map.
8. `src/services/product-pipeline/socket.ts` — `emitPipeline*` helpers,
   `PipelineStep` enum.

**UI:** `src/app/(page)/product-pipeline/page.tsx` (wrapper) →
`ProductPipeline.tsx` → `src/components/product-pipeline/ProductPipelineForm.tsx`
(socket subscription, filters by `socketId` which is set to the `websiteId`),
plus `ResearchPanel.tsx` — an admin-only debug card, not part of the run.

**API:** `src/app/api/product-pipeline/route.ts` — `POST` multipart
`{ file, websiteId }`, session-guarded.

**Shared:** `src/helper/woo.ts` (`createWooRecord`), `src/helper/website.ts`
(`addWatermark`), `src/helper/common.ts` (`publishedTimeHelper`, `upscaleImage`),
`src/constant/commons.ts` (default prompts), `src/types/woo.ts`.

### 3.1 Product Research (opt-in sub-pipeline)

**What it does:** before a description is written, finds out what the product
title actually *references*, verifies it against independent web sources, and
passes only corroborated facts to the writer. Purely a description input — it
changes nothing else about the product.

**Opt-in:** `website.product.researchEnabled` (Switch in
`ProductConfigForm.tsx`, default `false`). Absent on every existing document, so
leaving it off reproduces the previous behaviour exactly.

**Read in this order:**

1. `src/services/research/index.ts` — `researchProduct()` / `researchBatch()`.
   Entity extraction runs per product (cheap, no search); everything after runs
   once per distinct provisional topic key, so a whole batch of merch for one
   event costs one grounded search. An in-process `Set` guards re-entry, mirroring
   `lib/blog/runAutoBlog.ts`.
2. `extractEntities.ts` → `generateQueries.ts` — plain Gemini, no search. A
   generic title (`searchWorthy: false`) short-circuits to `insufficient` and
   **never searches**, which is why most rows cost nothing.
3. `searchSources.ts` — `geminiGrounded()` (in `services/ai/gemini.ts`). Uses
   `ai.models.generateContent()` with a Google Search tool because
   `interactions.create()` returns no real `groundingMetadata`; only that call
   path yields real source URLs.
4. `sourceTiers.ts` — Tier 1 official / Tier 2 news / Tier 3 community+social,
   resolved **from the domain** and re-resolved after the real trend type is
   known. `independentConfirmations()` implements the corroboration rule: distinct
   registrable domains only, syndication detected by normalized title, Tier 3 and
   snippet-only carry zero weight.
5. `extractClaims.ts` → `verifyClaims.ts` → `buildStoryBrief.ts` — claims are
   typed (`fact` / `interpretation` / `social_signal`) on the way in so the writer
   cannot blur them.
6. `assessQuality.ts` — deterministic score from observable evidence.
   `llmConfidence` is stored but never scored.
7. `buildDescriptionPrompt.ts` — three paths: research off (prompt untouched),
   research unusable (short "do not guess" header), research usable (verified
   block prepended and `{product-story}` filled). A store prompt with no
   placeholder still gets the block as a header, so no prompt needs editing.
8. `validateDescription.ts` — cheap gate before write-back: title restatement,
   leaked research internals, URLs, fabricated fabric/fit/shipping claims.
9. `repository.ts` — the `research_topics` cache (see `DATA.md` §2.12).

**Prompt constants:** `src/constant/researchPrompts.ts`, limits and outlet lists
in `src/constant/research.ts`.

**Tests** (`npm test`): topic keys, query generation, source
tiers/corroboration, quality scoring, prompt assembly and description validation in
`src/services/research/__tests__/`, plus `enrichProducts` in
`src/services/product-pipeline/__tests__/` with AI and socket mocked — the latter
pins the rule that a store with research off keeps its existing description.

**Debug:** `ResearchPanel.tsx` on `/product-pipeline` →
`api/research/preview` (runs one pass) and `api/research/topics` (reads the
cache). Both session-guarded, admin-facing, and write no product data.

**Known limits:** topic keys can collide between two events that share a title
year, which reuses a stale-but-fresh record until `expiresAt`; grounding quality
depends on Gemini's search index, so a topic that reads as `insufficient` is
usually worth one manual re-research via the panel before assuming a bug.

**Operational prerequisites:** research always runs on the user's `geminiApiKey`
regardless of `aiProvider`, and the grounded call consumes **web-search** quota,
which is metered separately from plain generation. A key that is fine for
`gemini()` can return `429` on `geminiGrounded()`, and because all five models
share one cooldown map the whole batch then falls back to the conservative
description. A Mongo outage also degrades to "no cache" rather than failing the
run (`resolveTopic` swallows lookup errors), so research is never load-bearing.

---

## 4. Product Spy

**What it does:** tracks competitor stores on a schedule, fetches their product
list through a platform-specific adapter, and stores newly-seen products.

**Two entry paths, pick by intent:**
- *Add/change a platform adapter* → read §4.1
- *Change the UI, filters, or scheduling* → read §4.2

### 4.1 Adapter chain (adding or debugging a scraper)

Read in this order:

1. `src/services/product-spy/detector.ts` — **the router.** `detectPlatform(url)`
   is a sequential `if` chain over `is<X>Store`; `fetchProducts(url, platform)`
   is a parallel chain over `fetch<X>Products` with `generic` → `facebook-ads`
   fallback. There is **no registry and no base class**.
2. `src/services/product-spy/generic.ts` (832 lines) — the universal fallback
   crawler: robots/sitemap discovery → listing pages → JSON-LD → HTML →
   images. Read this before writing a new adapter; several adapters should
   have just called it.
3. `src/types/product-spy.ts` — `RawSpyProduct` (the adapter output contract),
   `SpyCompetitor`, `SpyProduct`, `SpyTelegramConfig`. The `Platform` union is
   **not** in this file — it lives in `src/services/product-spy/detector.ts:12`.
4. `src/services/product-spy/woocommerce.ts` — the only adapter that supports
   incremental fetching via `isKnown`.
5. `src/services/product-spy/facebook-ads.ts` — last-resort Puppeteer fallback.

**To add a platform you must touch 4 places, all in `detector.ts` except the
first:** the `Platform` union (also in `detector.ts:12`), the import list, the
`detectPlatform` chain, and the `fetchProducts` chain.

Adapter contract: export `is<Platform>Store(url)` and `fetch<Platform>Products(url)`
and return `RawSpyProduct[]` with `source` set to the platform name.

### 4.2 Storage, scheduling, UI

1. `src/services/product-spy/checker.ts` — **the only writer of `spy_products`.**
   `checkCompetitor(competitor)` dedupes by `externalId` OR `normalizedUrl`;
   existing products are skipped, never updated. `checkAllEnabledCompetitors()`
   uses a hand-rolled `MAX_CONCURRENT = 3` queue.
2. `src/services/product-spy/scheduler.ts` — `* * * * *` tick; selects competitors
   due by `checkIntervalMinutes` (no `lastCheckAt` = always due).
3. `src/services/product-spy/validator.ts` — SSRF guard used by the competitors route.
4. `src/app/api/product-spy/competitors/route.ts` — `GET`/`POST`/`PUT`/`DELETE`/`PATCH`.
   `PATCH` re-detects the platform of every competitor.
5. `src/app/api/product-spy/products/route.ts` — filter/sort/paginate; the
   `apparelOnly` filter uses `APPAREL_TITLE_REGEX` from `src/constant/apparel.ts`.
6. `src/app/api/product-spy/check-now/route.ts` — fire-and-forget trigger.
7. `src/app/api/product-spy/export-excel/route.ts` — builds the workbook
   client-side *and* posts it to Telegram; the route itself only handles the
   Telegram leg.
8. UI: `src/components/product-spy/ProductSpyPage.tsx` (tabs) →
   `ProductList.tsx` (grouped by day, localStorage selection, export) and
   `CompetitorTable.tsx` (CRUD) → `CompetitorForm.tsx` (create takes one URL
   per line, edit takes one URL).
9. `src/components/product-spy/productSelectionHelper.ts` — localStorage layer
   that survives pagination.

---

## 5. Video Generator

**What it does:** selects WooCommerce products, queues render jobs, composites
images into 1080×1920 vertical MP4s with Ken Burns + xfade transitions and
background music, then hands the result to YouTube.

**Read in this order:**

1. `src/services/video/jobManager.ts` — **the queue and the lifecycle.**
   `enqueueJob(jobId)` → `processJob(job)`:
   `preparing` → `prepImages` → `rendering` → `renderVideo` → `completed` →
   fire-and-forget `publishToYoutube` → on error, Telegram notify →
   `finally` cleanup + `tryProcessNext()`.
2. `src/services/video/config.ts` — `VIDEO_CONFIG` and `VIDEO_PATHS`. 20 lines.
3. `src/services/video/imagePrep.ts` — download → sharp → `frame-0000.jpg`.
4. `src/services/video/renderVideo.ts` — the only ffmpeg call site in the repo.
   Read the `complexFilter` construction carefully; it is the hardest code here.
5. `src/services/video/createVideoJobsFromPipeline.ts` — job creation from the
   product pipeline (duplicates logic in `api/video/generate/route.ts`).
6. `src/types/video.ts` — `VideoJob`, `VideoJobStatus`, `YoutubePublishStatus`.

**UI:** `src/app/(page)/video-generator/page.tsx` →
`src/components/video-generator/VideoGeneratorPage.tsx` (owns the socket
listener, triggers `useVideoJobs` mutate) → `ProductSelector.tsx`,
`VideoSettings.tsx`, `AudioLibrary.tsx`, `JobList.tsx`.
`useVideoJobs` polls every 2 s.

**API:** `src/app/api/video/*` — `products`, `generate`, `jobs`,
`jobs/[id]`, `audio`, `audio/[id]`, `download/[id]`, `download-all`. All
session-guarded. There is no `api/video/download/route.ts` — only `[id]`.

---

## 6. YouTube

**What it does:** per-website OAuth channel connection, video upload,
scheduled publication, comment templating, and a retry/release cron.

1. `src/services/youtube/youtubeService.ts` (778 lines) — read in sections:
   - top: constants, `MAX_YOUTUBE_RETRIES = 3`
   - OAuth: `getOAuth2ClientForSite`, `saveOauthConfig`, `getAuthUrl`,
     `exchangeCode`, `getChannelInfo`, `upsertChannel`, `removeChannel`
   - publish: `publishToYoutube(jobId, siteId)` — the main entry point, with
     `resolvePublishAt`, `buildVideoStatus`, `insertYoutubeVideo`,
     `applyScheduleToVideo`
   - comment rules + `describeYoutubeCommentError`
   - cron: `retryFailedPublishes`, `releaseScheduledPublishes`,
     `startYoutubeRetryCron`
2. `src/types/youtube.ts` — `YoutubeChannel` document shape.
3. `src/lib/encryption.ts` — AES-256-GCM for `clientSecretEncrypted` and
   `refreshTokenEncrypted`. Wire format `ivHex:authTagHex:cipherHex`.
4. `src/app/api/youtube/*` — `oauth-config` (GET/PUT), `connect` (GET, 302),
   `callback` (GET, posts to `window.opener`), `status` (GET), `disconnect` (DELETE).
5. UI: `src/components/settings/website/YouTubeConfig.tsx`,
   `YouTubeDescriptionTemplate.tsx`, `YouTubeCommentTemplate.tsx`.
   Hook: `src/app/hooks/useYouTubeChannel.ts`.

**Template placeholders** (shared by description and comment):
`{productName} {shortDescription} {productUrl} {shopName} {siteUrl} {tags} {tagsHashtags}`

---

## 7. Revenue

**What it does:** syncs WooCommerce orders into a durable `revenue_history`
ledger, then serves a dashboard from that ledger (never re-calls WooCommerce
for reads).

**Read in this order:**

1. `src/services/revenue/syncRevenue.ts` — the single shared entry point for
   both the cron and the manual Refresh, so the two can't drift.
2. `src/services/revenue/loadOrders.ts` — Woo pull. Per-website try/catch so one
   bad store doesn't kill the sync. Stamps `websiteId`/`ownerEmail` onto rows.
3. `src/services/revenue/buildOrders.ts` — normalization + fee extraction
   (`_cs_stripe_fee` → `_cs_paypal_fee` → 0).
4. `src/services/revenue/orderStatus.ts` — pure. `EXCLUDED_REVENUE_STATUSES`,
   refund clamping, revenue = `max(total - refund, 0)`.
5. `src/services/revenue/revenueHistory.ts` — the ledger. Lazy unique index on
   `{ websiteId, orderId }`; `saveRevenueHistory` is an unordered bulkWrite
   upsert; `findRevenueHistory` takes pre-resolved `websiteIds` because
   access control lives in `websites`, not here.
6. `src/services/revenue/websiteAccess.ts` — `buildWebsiteAccessFilter`,
   `getAccessibleWebsiteIds`. **The canonical multi-tenant helper.**
7. `src/services/revenue/loadRevenue.ts` — read path; reuses the same
   aggregation helpers as write time.
8. `src/services/revenue/{calculateSummary,groupRevenue,groupWebsiteRevenue}.ts`
   — pure, shared by both paths.
9. `src/services/revenue/scheduler.ts` — `*/30 * * * *`, no args, syncs all sites.
10. `src/services/revenue/index.ts` — the only public barrel
    (`loadRevenueHistory`, `syncRevenue`).

**UI:** `src/app/(page)/revenue/page.tsx` owns `useState` + axios directly (no
SWR here). Two distinct actions: **Search** (POST `/api/revenue`, reads the
ledger) and **Refresh** (POST `/api/revenue/refresh`, hits WooCommerce).
Children: `RevenueFilter.tsx`, `RevenueChart.tsx`, `RevenueSummary.tsx`,
`RevenueWebsiteTable.tsx`, `RevenueLatestOrders.tsx`.

**Types:** `src/types/revenue.ts` — the `revenue_history` record shape, which
deliberately mirrors `buildOrders`' output.

---

## 8. Auto Blog

**What it does:** picks a trending keyword, writes a post with Gemini, formats
and watermarks images, and publishes to the site's WordPress — on a
per-website cron.

**Read in this order:**

1. `src/lib/blog/runAutoBlog.ts` — **the pipeline, read this first.**
   `runAllWebBlogs()` iterates websites with `autoBlog.enabled`; `runAutoBlog(website)`
   does trends → select → per-keyword: news → write → image search → format →
   upload to WP → inject images → publish → save keyword → Telegram.
   Guarded by a module-level `runningWebsites` Set keyed on `shopName`.
2. `src/lib/blog/startBlogCron.ts` — per-website `node-cron` jobs in a Map keyed
   by `shopName`; `syncBlogCrons()` reconciles the map against Mongo and is
   re-invoked from `PUT /api/woo/website-config`.
3. `src/lib/blog/selectTrends.ts.ts` — **note the doubled extension, that is the
   real filename.** Holds the 5-minute in-memory trends cache
   (`getCachedTrends`) and the Gemini-based topic selection + the ~270-line
   content-strategy prompt.
4. `src/lib/blog/getTrends.ts` — the **only** `child_process` use in the repo:
   `execFile("python/.venv/bin/python3", ["python/google_trends.py"])`.
5. `src/lib/blog/filterTrends.ts` — `traffic >= 20000`, blacklist, top 100.
6. `src/lib/blog/getNewsContext.ts` — Google News RSS, top 5.
7. `src/lib/blog/writer.ts` — `writeBlog` (Gemini, 500–700 words, strict JSON
   output) and `insertImages` (string surgery on `</p>` positions).
8. `src/lib/blog/searchImages.ts` — Puppeteer Bing scrape. `headless: false`, so
   it needs `DISPLAY` / Xvfb in production.
9. `src/lib/blog/wordpress.ts` — `publishWordpress`, `uploadImagesToWordpress`.
10. `src/lib/blog/history.ts` — `blog_history` keyword dedupe, 7-day expiry.
11. `src/lib/blog/types.ts` — `Trend`, `SelectedTrend`, `BlogArticle`.
12. `src/lib/ai/extractJson.ts` — the JSON-fence parser used by the blog AI calls
    (`selectTrends.ts.ts`, `writer.ts`). The product pipeline does *not* use it.

**API:** `src/app/api/blog/run/route.ts` — 6 lines, `POST` only, calls
`runAllWebBlogs()`. Synchronous and unbounded. It has **no UI at all** — it is
triggered by the in-app cron, or manually via the "Create Post Manual" button in
`src/app/(page)/settings/config-website/ConfigWebsite.tsx` (which POSTs
`endpoint.autoBlogs`). `README.md` also documents an OS crontab `curl` at
09:00 UTC. `src/app/(page)/auto-post/` exists but is **empty** — dead directory,
not a page.

`src/lib/blog/uploadImageToWordPress.ts` is a **dead duplicate** of the function
inside `wordpress.ts`. Do not import it; do not delete it as a drive-by.

---

## 9. Crawl Tool

**What it does:** scrapes product name + image URLs from arbitrary competitor
product pages using user-defined CSS selectors, and exports an XLSX.

**Read in this order:**

1. `src/app/api/crawl/detail-mixed-product/route.ts` — **the main crawler.**
   `headless: false`, viewport 1920×1200. Per URL: match a stored selector by
   domain → goto → extract name + images (lazy-loading attribute fallbacks) →
   emit `crawl-progress`/`crawl-error`. No matching selector ⇒ an `{ error: url }`
   row, never a throw.
2. `src/components/crawl-tool/SelectorSetup.tsx` — defines
   `SelectorFormValues { _id, domain, nameSelector, imagesSelector }`, which is
   the **shared contract** imported by the API routes too.
3. `src/app/api/crawl/add-selector/route.ts` — CRUD on `selector-webs`.
4. `src/app/api/crawl/detail-product/route.ts` — the older single-selector
   variant; comma-separated URLs, Telegram XLSX.
5. `src/app/api/crawl/list-url/route.ts` — harvest links matching a selector.
6. `src/components/crawl-tool/CrawlMixedProductDetail.tsx` — client
   counterpart; generates the `socketId` used for correlation, ignores
   502/503/504/522/524 from the proxy.
7. `src/components/crawl-tool/CrawlListProductUrl.tsx` — links-only variant.

`src/app/(page)/crawl-tool/CrawlTool.tsx` switches between the three via an antd
`Segmented` driving a `Carousel`.

---

## 10. Convert File

**What it does:** the richest client-side tool. Cleans a product XLSX, edits
rows, splits/duplicates/merges products, detects categories from keywords, and
exports a WooCommerce CSV. Optionally persists rows to Mongo.

**Read in this order:**

1. `src/app/(page)/convert-file/ConvertFile.tsx` (519 lines) — the whole tool.
   Exports `CONVERT_DATA` (localStorage key) and `interface Product`, which is
   **imported by 1 API route** (`api/woo/product-data`), **1 other page**
   (`original-product/OriginalProduct.tsx`), **4 components under
   `components/convert-file/`** (`ProductItem`, `ExistChecker`,
   `SearchProductDialog`, `ExcludeSizeChartLink`), **and
   `src/helper/common.ts`** — treat it as a contract. (That last one is a
   `helper/**` → `"use client"` page import; it is type-position only so it is
   elided at build, but the direction is backwards. Don't add more.)
2. `src/components/convert-file/ProductItem.tsx` — the row editor.
3. `src/helper/detect-category.ts` + `src/constant/apparel.ts` — category
   inference, including the `*` / `**` / `***` priority prefixes.
4. `src/helper/common.ts` — `upscaleImage`, `fixEncoding`, `toCapitalizedCase`,
   `normFile`.
5. `src/helper/woo.ts` — `handleDownloadFile` / `generateCSVBlob`.
6. `src/components/convert-file/CateKeywordConfig.tsx` — edits the global
   category→keywords map (`global_config`).
7. `src/components/convert-file/ExistChecker.tsx` — fuzzy-matches against saved
   `product-data` using `string-similarity`.
8. `src/components/convert-file/ExcludeSizeChartLink.tsx` — global size-chart
   URL list.
9. `src/app/api/woo/product-data/route.ts` — `GET` uses an Atlas `$search`
   aggregation against a text index named `"product"` on path `Name`.

---

## 11. Excel Splitter

Fully client-side. Zero API calls.

1. `src/app/(page)/excel-splitter/ExcelSplitter.tsx` — read the file, chunk rows
   evenly across shop-name columns, remember names in localStorage `"splitName"`.
2. `src/app/(page)/excel-splitter/ProductSorter.tsx` — dnd-kit `DndContext`,
   cross-column moves on `handleDragOver`, `arrayMove` within a column.
3. `src/app/(page)/excel-splitter/DroppableColumn.tsx` — `SortableItem` +
   column container.
4. Exports via `generateCSVBlob` from `src/helper/woo.ts`.

---

## 12. Format Image

1. `src/app/(page)/format-image/FormatImage.tsx` — form; posts the **entire
   website object** as `websiteObject` plus `name`, `images`, `telegramId`.
2. `src/app/api/format-image/route.ts` — multipart handler; instantiates its own
   `TelegramBot` (not the shared singleton) to send the download link.
3. `src/helper/format-image.ts` — `formatImages()`: download logo → `addWatermark`
   → collect public URLs → `archiver` zip into `/var/www/html/uploads/zips`.

Shared watermark core: `src/helper/website.ts` → `addWatermark`.

---

## 13. Original Product

Three files, no service layer:

1. `src/app/(page)/original-product/OriginalProduct.tsx` — debounced (500 ms)
   keyword search against `/api/woo/product-data?name=…&email=…`, capped at 100.
2. `src/app/api/woo/product-data/route.ts` — GET + POST only.
3. `interface Result extends Product { createdAt: string }` is local to the page.

---

## 14. Settings

Three routes, all under `(page)/settings/`:

| Route | Page | Component |
|---|---|---|
| `/settings` | `page.tsx` (RSC, computes `isAdmin`) | `Setting.tsx` — profile: `telegramId`, `apiKey`, `geminiApiKey` |
| `/settings/config-website` | `config-website/page.tsx` | `ConfigWebsite.tsx` → `WebsiteItem.tsx` → `UpdateWebsiteListModal.tsx` |
| `/settings/config-categories` | `config-categories/page.tsx` | `ConfigCategories.tsx` → `CategoryItem.tsx` → `UpdateCategoryModal.tsx` |

**`UpdateWebsiteListModal.tsx` is the important file** — it composes the
`websites` document from nested sub-forms in
`src/components/settings/website/`:

| Component | Writes |
|---|---|
| `WebsiteForm.tsx` | `url`, `shopName`, `logoUrl`, `logoWidth`, `logoHeight`, `logoPosition`, `imageWidth`, `imageHeight`, `quality`, `members[]`, `wpUsername`, `wpAppPassword` |
| `ProductConfigForm.tsx` | `product.*` — `aiProvider`, `publicTime`, `gapFrom/gapTo`, `promptDescriptionProduct`, `promptTagsProduct` |
| `BlogConfigForm.tsx` | `autoBlog.{enabled,status,postsPerRun,cron}` |
| `AutoVideoConfig.tsx` | `autoVideo.enabled` |
| `MusicUploader.tsx` | *(no field of its own — it sets the form's `backgroundMusicUrl`; the value is persisted by `api/woo/website-config` on save, after `upload-music` returns it)* |
| `YouTubeConfig.tsx` | channel connection (not a document field) |
| `YouTubeDescriptionTemplate.tsx` / `YouTubeCommentTemplate.tsx` | `youtubeDescriptionTemplate` / `youtubeCommentTemplate` |

`defaultFormValue` at the top of `UpdateWebsiteListModal.tsx` is the canonical
defaults for the whole document. Also read
`src/components/settings/DuplicateAllCate.tsx` (bulk category copy) and
`Instruction.tsx` (the Excel-column help modal — also documents the required
XLSX column format for the pipeline).

**API:** `src/app/api/woo/website-config/route.ts` (GET is session-guarded and
applies the owner/members filter; PUT calls `syncBlogCrons()`),
`categories-config/`, `categories-config/bulk/`, `product-data/`,
`website-config/upload-music/`, `api/users/detail/`, `api/global-config/*`.

---

## 15. Management Users

1. `src/app/(page)/management-users/page.tsx` — RSC, `isAdmin` check.
2. `src/components/management-users/UserList.tsx` — table of `users`.
3. `src/components/management-users/ManagementUsersForm.tsx` — create user.
4. `src/app/api/users/route.ts` — `GET` / `POST` / `DELETE ?_id=`.
5. `src/app/api/users/detail/route.ts` — `GET ?email=`, `PUT`. **`email` is the
   primary key here, not `_id`.**
6. `src/app/hooks/useUsers.ts` — also exports `interface UsersPayload`, which the
   API routes import as their type.

## 16. Auth & Shell

1. `server.ts` — the runtime (see `ARCHITECTURE.md` §1).
2. `src/middleware.ts` — 5 lines, the matcher.
3. `src/lib/auth.ts` — `authOptions`; the `users` collection is the allowlist.
4. `src/app/api/auth/[...nextauth]/route.ts` — 6 lines.
5. `src/app/(auth)/login/page.tsx` — Google sign-in button only.
6. `src/app/layout.tsx` — `AntdRegistry` + `ConfigProvider(theme)`.
7. `src/app/(page)/layout.tsx` → `MainLayout.tsx` — `SessionProvider`, `Sidebar`,
   responsive content width, footer.
8. `src/components/sidebar/Sidebar.tsx` (526 lines) — the nav; the single source
   of truth for which features are user-visible.
9. `src/components/header/Header.tsx` — user menu, sign-out.
10. `src/theme/themeConfig.ts` — all antd tokens and component overrides.
11. `src/constant/navigation.ts` — the route map. **If you add a page, add it
    here and to `Sidebar.tsx`.**

## 17. WooCommerce Layer

Everything that talks to WooCommerce or WordPress.

1. `src/types/woo.ts` — `WooCommerce` (the flat CSV-record shape),
   `WebsiteConfig`, `ProductConfig`, `AutoBlogConfig`, `CanvasPosition`.
2. `src/helper/woo.ts` — `createWooRecord` (builds the ~40-key CSV record),
   `generateCSVBlob`, `handleDownloadFile`, plus a module-private `generateSKU`.
3. `src/app/api/woo/**` — the Mongo-side config CRUD (see §14).
4. Product writes: `uploadProducts.ts` → `loadCategories.ts` → `createProduct.ts`.
5. Order reads: `src/services/revenue/loadOrders.ts`.
6. Product listing for video: `src/app/api/video/products/route.ts`.
7. Post/media writes: `src/lib/blog/wordpress.ts`.
8. Public product reads (no auth): `src/services/product-spy/woocommerce.ts`.

**Auth pattern** — there are no `ck_`/`cs_` consumer keys anywhere. Two shapes:

```ts
// WooCommerce REST v3 — axios instance
axios.create({ baseURL: `${website.url}/wp-json/wc/v3`,
               auth: { username: website.wpUsername, password: website.wpAppPassword } })

// WordPress REST — manual header
{ headers: { Authorization: `Basic ${base64(user:pass)}` } }
```
