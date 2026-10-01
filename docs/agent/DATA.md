# Data & Integrations

Collections, environment variables, external APIs, and on-disk paths.
Read this before writing a query or touching an integration.

---

## 1. MongoDB connection

```ts
import { connectToDatabase } from '@/lib/mongodb'
const { db } = await connectToDatabase()
```

- `MONGODB_URI` and `MONGODB_DB` are required; **the module throws at import time**
  if either is missing.
- The client is cached on `global._mongo` so it survives dev HMR.
- Atlas. One `Db` handle, used directly with the raw driver.
- **No indexes are declared anywhere except one**, see §2.

## 2. Collections

All names are constants in `src/constant/collections.ts`. Never hardcode a
string. Two exceptions: `blog_history` (§2.9) has no constant at all, and the
two `api/global-config/*` routes pass the literal `'global_config'` to
`.collection()` while importing the constant only for the document `_id` — a
wart, not a pattern to copy.

| Constant | Collection | Type | Written by | Read by |
|---|---|---|---|---|
| `WEBSITES_COLLECTION` | `websites` | `WebsiteConfig` | `api/woo/website-config`, `upload-music` | almost everything |
| `USERS_COLLECTION` | `users` | — | `api/users`, `api/users/detail` | auth allowlist (`lib/auth.ts`), product pipeline, auto-blog, video `jobManager`, product-spy export, `youtubeService` |
| `CATEGORIES_COLLECTION` | `categories` | `WooFixedOption` + `shopID` | `api/woo/categories-config(/bulk)` | pipeline, convert-file, settings |
| `PRODUCT_DATA_COLLECTION` | `product-data` | `Product` + `email` | `api/woo/product-data` (POST) | convert-file `ExistChecker`, original-product |
| `SELECTOR_COLLECTION` | `selector-webs` | `SelectorFormValues` | `api/crawl/add-selector` | crawl tool |
| `CATE_KEYWORD_CONFIG_COLLECTION` | `global_config` | `{_id, data, updatedAt}` | `api/global-config/cate-keyword` | convert-file `CateKeywordConfig`, `detectCategory` |
| `SIZE_CHART_LINKS_CONFIG_COLLECTION` | *(not a collection — it is the document `_id` inside `global_config`)* | `{_id, data, updatedAt}` | `api/global-config/size-chart-links` | convert-file `ExcludeSizeChartLink` |
| `VIDEO_JOBS_COLLECTION` | `videoJobs` | `VideoJob` | `api/video/generate`, `jobManager` | video UI, `youtubeService` |
| `AUDIO_FILES_COLLECTION` | `audioFiles` | `AudioFile` | `api/video/audio` | video UI, job creation |
| `YOUTUBE_CHANNELS_COLLECTION` | `youtubeChannels` | `YoutubeChannel` | `youtubeService` (`upsertChannel`, `saveOauthConfig`); deleted by `api/youtube/disconnect` | `youtubeService`, settings UI |
| `SPY_COMPETITORS_COLLECTION` | `spy_competitors` | `SpyCompetitor` | `api/product-spy/competitors`, `checker` | spy UI, scheduler |
| `SPY_PRODUCTS_COLLECTION` | `spy_products` | `SpyProduct` | `checker` only | `api/product-spy/products` |
| `REVENUE_HISTORY_COLLECTION` | `revenue_history` | `RevenueHistoryRecord` | `revenueHistory.save*` | revenue UI |
| `RESEARCH_TOPICS_COLLECTION` | `research_topics` | `ResearchTopic` | `services/research/repository.saveTopic` | `findFreshTopic` (product pipeline), `api/research/topics`, `ResearchPanel` |

### 2.1 `websites` — the hub

Every other feature keys off this. Shape is `WebsiteConfig` in
`src/types/woo.ts`; defaults are in `UpdateWebsiteListModal.tsx`.
- Identity: `url`, `shopName`, `members[]`, `owner`.
- Woo creds: `wpUsername`, `wpAppPassword` (plaintext at rest).
- Branding: `logoUrl`, `logoWidth`, `logoHeight`, `logoPosition` (a
  `CanvasPosition`), `imageWidth`, `imageHeight`, `quality`.
- `product`: `{ aiProvider, publicTime, gapFrom, gapTo, promptDescriptionProduct, promptTagsProduct, researchEnabled }`. `researchEnabled` is opt-in and absent/false on every pre-existing document, which is why turning it off is a no-op for stored stores.
- `autoBlog`: `{ enabled, cron, status, postsPerRun }`.
- `autoVideo`: `{ enabled }`.
- `backgroundMusicUrl`, `youtubeDescriptionTemplate`, `youtubeCommentTemplate`.
- Access: `owner OR members` (both lowercased). Canonical filter:
  `buildWebsiteAccessFilter` in `src/services/revenue/websiteAccess.ts`.

### 2.2 `users`

Allowlist for NextAuth sign-in, plus per-user keys.
`email` (primary key for `/api/users/detail`), `telegramId`, `apiKey`,
`geminiApiKey`, `mixed` (shuffle product order in the pipeline).

### 2.3 `categories`

Product category presets. `SKUPrefix`, `salePrice`, `regularPrice`, `shopID`
(= a website `_id` as a string), `category`, `description`, `createdAt`.
Read by the pipeline joined on `category`.

### 2.4 `product-data`

Persisted product rows for later reuse. `Product` (exported from
`ConvertFile.tsx`) + `email` + `createdAt`. Read via an Atlas `$search`
aggregation against a text index named `"product"` on path `Name`.

### 2.5 `selector-webs`

Crawl CSS selectors. `domain`, `nameSelector`, `imagesSelector`, `createdAt`.
`GET /api/crawl/add-selector` filters by regex on `domain` (empty ⇒ all) and
sorts by `createdAt` (but `POST` does not set `createdAt` — known gap).

### 2.6–2.8 Global config, video jobs, audio files, channels

- Global config: singleton docs keyed by a string `_id`
  (`cate_keyword_config` / `size_chart_links`), payload in a `data` field.
- `videoJobs`: `VideoJob` in `src/types/video.ts`. Carries render fields
  (`images[]`, `status`, `progress`, `outputPath`, `config`) **and** the YouTube
  publish fields (`youtubeStatus`, `youtubeVideoId`, `youtubePublishAt`,
  `youtubeError`, `youtubeCommentError`, `youtubeCommentedAt`,
  `youtubeRetryCount`, `youtubePublishedAt`).
- `audioFiles`: `{ filename, originalName, url, size, createdAt }`.
- `youtubeChannels`: keyed by `siteId`. `clientId`,
  `clientSecretEncrypted`, `refreshTokenEncrypted` (AES-256-GCM via
  `src/lib/encryption.ts`), `channelId`, `channelTitle`, `connectedByEmail`.

### 2.9 `blog_history` — the exception

Auto-blog keyword dedupe, with a hardcoded collection name (no constant).
`{ keyword, createdAt }`; a keyword is "used" for **7 days** from first
insert. `saveKeyword` uses `upsert` + `$setOnInsert` so `createdAt` never
refreshes.

### 2.10 `spy_competitors` / `spy_products`

- `spy_competitors`: `name`, `url`, `platform` (detected), `enabled`,
  `checkIntervalMinutes`, `lastCheckAt`, `lastStatus`, `lastError`, `createdAt`.
  `createdAt`/`lastCheckAt` are ISO **strings**.
- `spy_products`: `competitorId`, `externalId`, `normalizedUrl`, `title`, `url`,
  `slug`, `price`, `image`, `images[]`, `dateCreated`, `source` (platform),
  `firstSeenAt` (ISO string). Written only by `checker.ts`; dedupe on
  `externalId` OR `normalizedUrl`.

### 2.11 `revenue_history` — the durable ledger

Six collections store real `Date` values: `revenue_history` (`createdAt`,
`updatedAt`), `blog_history`, `global_config`, `videoJobs`, `audioFiles`, and
`youtubeChannels`. Everything else uses ISO strings.

`revenue_history.date` is the exception *within* that set — it is a **string**
(the raw WooCommerce `date_created`). This is safe to range-query because
fixed-width ISO-8601 sorts lexicographically in chronological order; see the
comment in `revenueHistory.ts` and the date-range filter at `revenueHistory.ts:152-156`.

Field shape (`RevenueHistoryRecord` in `src/types/revenue.ts`) deliberately
mirrors `buildOrders` output so `calculateSummary` / `groupRevenue` /
`groupWebsiteRevenue` can re-aggregate it without transformation.

`{ websiteId, ownerEmail, orderId, website, customer, total, refunded, revenue,
   fee, net, status, date, paymentMethod, createdAt, updatedAt }`.

- **The one index in the repo**: a lazy unique index on `{ websiteId, orderId }`
  created by `ensureUniqueIndex()` (idempotent upserts, history survives website
  deletion).
- **Access control is not here** — it's resolved against `websites` first, then
  the caller passes `websiteIds` in. The `ownerEmail` field exists so rows stay
  readable after a website is deleted.

### 2.12 `research_topics` — the research cache

One document per *topic*, not per product, so a tee/hoodie/sweatshirt about the
same subject share a single grounded search. Type is `ResearchTopic` in
`src/types/research.ts`; written only by `services/research/repository.ts`.

- Two keys: `provisionalTopicKey` (entities + stated year, known before
  searching) and `topicKey` (adds the verified event/season). Provisional keys
  that later resolve are kept in `aliases`, and `findFreshTopic()` matches
  `$or: [{topicKey}, {aliases}]`. A topic whose event never resolves stays
  provisional — that is the intended terminal state, not a bug.
- All dates are **ISO strings** (`createdAt`, `updatedAt`, `researchedAt`,
  `expiresAt`). `expiresAt` drives freshness: a stale record is treated as a
  miss and re-researched in place by the unique `{topicKey: 1}` index.
- `quality.score` / `quality.band` are computed by `assessQuality()` from
  observable evidence only. `llmConfidence` is stored for debugging but is
  deliberately **not** a scoring input.
- Not user-scoped: research is about public subjects, so any authenticated user
  can read any cached topic. The debug UI is the only reader.
- `aliases` is indexed but **not** unique, so two topics can in principle claim
  the same provisional key; the last write wins on lookup. Acceptable because a
  collision means both products describe the same subject anyway.

## 3. Environment variables

Defined in `.env`. **Never commit secrets**; `.env` is gitignored.

| Var | Required | Used by | Purpose |
|---|---|---|---|
| `MONGODB_URI` | yes | `src/lib/mongodb.ts` | Atlas connection string |
| `MONGODB_DB` | yes | `src/lib/mongodb.ts` | DB name |
| `NEXTAUTH_SECRET` | yes | `src/lib/auth.ts` | JWT signing |
| `NEXTAUTH_URL` | yes | asset URL builders (`helper/website.ts`, `helper/format-image.ts`, `api/video/audio`, `api/woo/website-config/upload-music`); NextAuth reads it implicitly — `src/lib/auth.ts` never names it | public origin for `/uploads/...` |
| `GOOGLE_CLIENT_ID` | yes | `src/lib/auth.ts` | NextAuth Google provider |
| `GOOGLE_CLIENT_SECRET` | yes | `src/lib/auth.ts` | NextAuth Google provider |
| `NEXT_PUBLIC_ADMIN_EMAIL` | yes | `auth`, `/settings`, `/management-users`, sidebar/header | super-admin email; auto-allowed sign-in |
| `NEXT_PUBLIC_APP_URL` | yes | `src/config/socket.ts` | Socket.IO client URL |
| `YOUTUBE_REDIRECT_URI` | for YouTube | `youtubeService` | OAuth redirect → `/api/youtube/callback` |
| `YOUTUBE_TOKEN_ENC_KEY` | for YouTube | `src/lib/encryption.ts` | 32-byte hex AES-256-GCM key |
| `TELEGRAM_BOT_TOKEN` | for Telegram | `telegram.ts`, `api/format-image` | result files + notifications |
| `GEMINI_API_KEY` | for AI | `services/ai/gemini.ts` | fallback when a per-user key is absent |
| `OPENAI_API_KEY` | for AI | `lib/ai/client.ts` | legacy OpenAI client |
| `PAWAN_API_KEY` | — | `services/ai/pawanAI.ts` | third-party AI (unused) |
| `NEXT_PUBLIC_FIREBASE_*` (6 vars) | — | `src/lib/firebase.ts` | Firebase config; **currently unused by any flow** |

Notes:
- There are **no WooCommerce env vars.** Woo creds are per-website in Mongo.
- A live `.env` may contain `TELEGRAM_BOT_URL` and `SUPABASE_*` vars that are
  **not** in `.env.example` and are **not referenced in `src/`** — legacy.
- `NEXT_PUBLIC_*` vars are exposed to the browser. Do not put secrets there.

## 4. External integrations

### WooCommerce REST v3 — `https://<website>/wp-json/wc/v3`
- Auth: HTTP Basic with `websites.wpUsername` / `websites.wpAppPassword`.
- Consumers: `uploadProducts`, `createProduct` (variations), `loadOrders`,
  `api/video/products`, `api/video/generate`, `createVideoJobsFromPipeline`.
- Product create always uses `status: "future"` with a scheduled
  `date_created` / `date_created_gmt` (UTC+7 vs UTC via dayjs).

### WordPress REST — `https://<website>/wp-json/wp/v2`
- Auth: `Authorization: Basic base64(user:pass)`.
- `POST /posts` (blog publish), `POST /media` (image upload).
- `src/lib/blog/wordpress.ts`.

### WooCommerce Store API — `https://<website>/wp-json/wc/store/v1/products`
- **Unauthenticated** public product feed.
- Only `src/services/product-spy/woocommerce.ts` consumes this endpoint (it is
  the only adapter supporting incremental fetching via `isKnown`). The custom UA
  `WooTool-ProductSpy/1.0` is shared by all 8 product-spy adapters.

### YouTube Data API v3
- OAuth per website; refresh token + client secret encrypted at rest.
- Upload, schedule (`privacyStatus: private` + `publishAt`, flipped to public at
  release), comments (retried 3× on schedule release, 1× on fresh upload).
- `src/services/youtube/youtubeService.ts`.

### Google Trends
- `python/google_trends.py` via `execFile("python/.venv/bin/python3", …)`.
  Requires the Python venv at `python/.venv` and the process CWD = repo root.
- Results cached 5 minutes in memory (`selectTrends.ts.ts`).

### Google News RSS
- `news.google.com/rss/search?q=…&hl=en-US&gl=US&ceid=US:en`, parsed with
  `rss-parser`. Top 5 items.

### Bing Images
- Puppeteer scrape of `bing.com/images/search`. **Not an official API.**
  `headless: false` → needs `DISPLAY`/Xvfb in production.
- A blocklist filters NSFW results by title/description/url.

### Telegram Bot API
- `src/services/telegram/`. `sendTelegram` streams a document;
  `sendTelegramMessage` sends HTML-formatted text.
- Used by: product pipeline, product spy export, crawl, format-image, revenue
  (notifies on YouTube failures), auto-blog.

### AI providers
- `src/services/ai/gemini.ts` (default), `chatgpt.ts`, `deepseek.ts`,
  `pawanAI.ts`, `lib/ai/client.ts`. See `CONVENTIONS.md` §7.
- Per-user keys live on the `users` document; env keys are fallbacks.
- Blog AI calls are JSON-driven via `lib/ai/extractJson`; the product-pipeline
  calls in `enrichProducts.ts` parse delimited text instead.

### Native binaries
- **ffmpeg** (from `PATH`) — `services/video/renderVideo.ts` via
  `fluent-ffmpeg`. No `setFfmpegPath` is configured.
- **exiftool** — bundled via `exiftool-vendored`. No system install needed.
- **Chromium** — via `puppeteer` / `puppeteer-core`. `puppeteer-core` is
  imported by the crawl routes but is only a transitive dep (known risk).

## 5. On-disk paths

Not repo-relative. Served by nginx `location /uploads/` → `/var/www/html/uploads/`.

```
/var/www/html/uploads/
  <shopName minus .com>/         watermarked product images
  videos/<jobId>/product-<id>.mp4
  music/<websiteId>/bg.mp3       per-website background music
  music/global/<uuid>.<ext>     uploaded audio library
  blogs/<jobId>/                 composited blog images
  zips/images-<jobId>.zip        format-image downloads

/tmp/video-gen/<jobId>/frame-0000.jpg    video render scratch
/tmp/media-temp/<shopName>/<ts>/         watermark scratch (deleted in finally)
```

- Public asset URLs: `${NEXTAUTH_URL}/uploads/<rest>`. Built in
  `helper/website.ts`, `helper/format-image.ts`, `api/video/audio/route.ts`,
  `api/woo/website-config/upload-music/route.ts`.
- Per-shop dir: `shopName.replace('.com','')`.
- URL→path: replace `NEXTAUTH_URL/uploads/` with `/var/www/html/uploads/`.
- The product pipeline and crawl routes write exported XLSX/CSV into
  `process.cwd()` then `unlinkSync` after sending to Telegram.

## 6. External network at runtime

Crawlers and the spy adapters fetch arbitrary third-party sites
(`detectPlatform` issues up to ~7 homepage requests per call). `validator.ts`
blocks private/loopback IPs as an SSRF guard, but only the spy competitors route
uses it. The crawl routes accept arbitrary user-supplied URLs and selectors.
