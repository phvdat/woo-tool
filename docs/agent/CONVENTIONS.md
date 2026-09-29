# Conventions

House style, and the exact steps for each kind of extension. Read the section you
need; the recipes at the bottom are copy-and-adapt.

---

## 1. General style

- **Path alias `@/` → `src/`.** Every import in the repo uses it. Never relative
  imports that climb out of the current folder's feature.
- **Quotes are mixed.** `services/**` and `app/api/**` use double quotes;
  `components/**` and older files use single. **Match the file you're editing.**
- **2-space indent, semicolons, trailing commas** in newer files. Several older
  files in `src/app/(page)/` and `src/helper/` use 4 spaces. Again, match locally.
- **`default export` for route handlers, pages, and single-purpose helpers.**
  Named exports for anything with more than one export.
- **Comments are sparse.** Doc comments exist where the *why* is non-obvious
  (`revenue_history` design, `buildWebsiteAccessFilter`, `GenericFetchResult`).
  Do not add comments that restate the code.
- **Console logging uses bracketed prefixes**: `[REVENUE]`, `[CRON]`,
  `[AUTO BLOG]`, `[TRENDS]`, `[AI]`, `[AUTH]`, `[WEBSITE CONFIG]`. There is no
  structured logger. New subsystems should pick a prefix and reuse it.

## 2. API routes

Shape of a typical handler:

```ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { SOME_COLLECTION } from "@/constant/collections";
import { NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { db } = await connectToDatabase();
  const _id = new ObjectId(request.nextUrl.searchParams.get("_id")!);
  const docs = await db.collection(SOME_COLLECTION).find({}).sort({ createdAt: -1 }).toArray();
  return NextResponse.json(docs.map(d => ({ ...d, _id: d._id.toString() })));
}
```

Conventions in practice:

- Export named HTTP-method functions (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).
  Multiple methods in one file is normal and encouraged.
- **`_id` is always stringified on the way out.** Use `.map(d => ({...d, _id: d._id.toString()}))`
  or build the object with a string id.
- **Query params** come from `request.nextUrl.searchParams`. DELETE uses `?_id=`.
  POST/PUT/PUT-style bodies use `await request.json()`.
- **Errors:** return `NextResponse.json({ error }, { status })`. Some older routes
  `throw`. Both exist; prefer the explicit return for new code.
- **Runtime:** only add `export const runtime = "nodejs"` when the route needs a
  Node-only API (`fs`, `archiver`, `Readable.toWeb`). Exactly one route declares
  it: `api/product-spy/export-excel`. (`api/video/download-all` uses `fs` and
  `archiver` but relies on the default Node runtime.)
- **Never hardcode a URL path in a component.** Add the route's path to the
  `endpoint` object in `src/constant/endpoint.ts` first, then reference
  `endpoint.someKey` everywhere.

### Adding a new API route — checklist

1. Create `src/app/api/<feature>/<action>/route.ts`.
2. Add the path to the `endpoint` object in `src/constant/endpoint.ts`.
3. `getServerSession(authOptions)` + 401 if the route touches user data.
4. If it reads/writes a new collection, add the constant to
   `src/constant/collections.ts` and document it in `DATA.md`.
5. If it returns per-user multi-tenant data, filter with
   `buildWebsiteAccessFilter(session.user.email)`.
6. Stringify `_id` on the way out.
7. Update `FEATURES.md`.

## 3. Mongo access

There is no ORM. Use the raw driver through `connectToDatabase()`.

```ts
const { db } = await connectToDatabase();
const col = db.collection(WEBSITES_COLLECTION);   // always the constant
```

Patterns used in the repo:

- `.find(filter).sort(...).skip().limit()` — or `.find(filter).toArray()`.
- `$or` for access control, `$in` for list membership, `$regex` for search.
- Upserts for idempotent writes (`updateOne(..., { upsert: true })`), plus
  `bulkWrite` where volume warrants it (see `revenueHistory.ts`).
- **No indexes are declared** except one lazy `createIndex` in
  `revenueHistory.ts`. Add indexes explicitly if you introduce a hot query.
- **Timestamps:** most collections write `createdAt: new Date().toISOString()`
  (a string). Six write real `Date`s — `revenue_history`, `blog_history`,
  `global_config`, `videoJobs`, `audioFiles`, `youtubeChannels`. And
  `revenue_history.date` is a *string* even though its `createdAt` is a `Date`.
  Match the target collection; see `DATA.md` §2.

## 4. Types

- Domain types live in `src/types/` — one file per domain:
  `woo.ts`, `video.ts`, `youtube.ts`, `revenue.ts`, `product-spy.ts`.
- Collection documents declare `_id?: string` even though Mongo returns an
  `ObjectId`, because they cross the wire stringified.
- Some client types are declared in hook files and imported by API routes
  (`UsersPayload` in `useUsers.ts`, `Product` in `ConvertFile.tsx`,
  `SelectorFormValues` in `SelectorSetup.tsx`). That's intentional in this repo;
  follow the existing pattern for the same domain rather than relocating.
- `strict: true` — no implicit `any`. Existing code uses `as any` sparingly at
  the Mongo boundary; that's acceptable there, not elsewhere.

## 5. SWR hooks (the only client data layer)

All client data fetching goes through `src/app/hooks/`. Shape:

```ts
"use client";
import useSWR from "swr";
import axios from "axios";
import { endpoint } from "@/constant/endpoint";

const fetcher = (url: string) => axios.get(url).then(r => r.data);

export function useSomething(id: string) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? [endpoint.something, id] : null,          // null key = disabled
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: true }
  );
  return { something: data, isLoading, isError: !!error, mutate };
}
```

Conventions:

- Return `{ data, isLoading, isError, mutate }`. Names vary slightly per hook
  (`competitors` vs `websiteConfigList`); stay local to the hook.
- `refreshInterval` values in use: 30 s (`useSpyProducts`), 2 s
  (`useVideoJobs`), none (write-then-`mutate` for settings/categories/users).
- A `null` key disables the request (see `useYouTubeChannel` when `siteId` is
  null).
- Non-GET mutations are usually plain `axios.*` calls inside the component,
  followed by `mutate()`. The exception is the two global-config hooks, which
  wrap `save()` in an optimistic `mutate(payload, false)`.
- `useDebounce` and `useLocalStorage` are the only non-network hooks.

## 6. Components & pages

- `(page)/<tool>/page.tsx` is a **7-line wrapper**: import the client component
  from `src/components/<tool>/`, default-export it. Keep it that way.
- Feature UI lives in `src/components/<feature>/`, not in the page folder. The
  only files living under `(page)/` are the wrapper plus the main tool component
  (for the larger tools like `convert-file`, `revenue`, `settings`).
- Shared primitives: `src/components/commons/` —
  `Container` (every page uses it: `<Container title subtitle extra>`),
  `PageHeader`, `ErrorBoundary`, `EmptyState`, `PageSkeleton`, `SkeletonCard`.
- Use antd 5 throughout. Do not introduce a second component library.
- Charts: `@ant-design/charts` (see `RevenueChart.tsx`).
- Drag-and-drop: `@dnd-kit/core` + `@dnd-kit/sortable`.
- Icons: `@ant-design/icons`.
- Forms: `antd Form` + `react-hook-form` is present as a dependency but the
  codebase overwhelmingly uses antd `Form` + `Form.useForm`. Prefer antd `Form`.
- Day/date: `dayjs` (UI) and `moment` (a few legacy spots: both
  `api/crawl/detail-*` routes, `excel-splitter/ProductSorter`, `helper/woo.ts`,
  `helper/add-metadata-image.ts`, `product-pipeline/exportExcel`). Prefer `dayjs`
  in new code. `src/helper/common.ts` is dayjs-only.

## 7. AI providers

There is **no unified provider interface**. Each wrapper takes a prompt and
returns text, but they are not interchangeable:

| Module | Signature | Key source | Used by |
|---|---|---|---|
| `src/services/ai/gemini.ts` | `gemini(prompt, apiKey?)` | arg → `GEMINI_API_KEY` | blog pipeline (default) |
| `src/services/ai/chatgpt.ts` | `chatgpt(prompt, apiKey)` | **required arg** | product pipeline (alternative) |
| `src/services/ai/deepseek.ts` | `deepSeek(msg, apiKey)` | required arg | unused |
| `src/services/ai/pawanAI.ts` | `pawanAI(messages)` | `PAWAN_API_KEY` | unused |
| `src/lib/ai/client.ts` | `askAI(prompt)` | `OPENAI_API_KEY` | legacy; `writer.ts` imports it without using it |

Rules for AI call sites:

- Parse the reply with `extractJson<T>()` from `src/lib/ai/extractJson.ts` — the
  blog pipeline is JSON-driven (only 2 call sites: `selectTrends.ts.ts`, `writer.ts`).
  The **product pipeline is not**: `enrichProducts.ts` post-processes raw text
  with `.replace(/```/g,"")` and `split("|")`. Don't assume extractJson is the
  house pattern for new AI calls.
- `gemini()` already strips `**bold**`. Don't double-strip.
- The per-user key lives on the `users` document (`apiKey`, `geminiApiKey`) and
  is passed down from the route → service → provider. Env keys are fallbacks.
- `aiProvider: "gemini" | "chatgpt"` on `ProductConfig` selects the *product
  pipeline* provider only. The blog pipeline is hardcoded to Gemini.

## 8. Background jobs

New cron checklist:

1. Create `start<X>Cron()` in the feature's service dir with a module-level
   handle and an `if (mainJob) return` guard, `cron.schedule(expr, tick, { timezone: "Asia/Ho_Chi_Minh", noOverlap: true })`, and an `isRunning` re-entrancy guard inside `tick`.
2. Register it in `server.ts` inside `app.prepare()`.
3. Document it in `ARCHITECTURE.md` §1 and `FEATURES.md`.
4. The job is invisible unless the process runs via `server.ts`. Don't design
   around `next start`.

## 9. Socket events

Adding a realtime event:

1. Server side: `io.on("connection")` in `server.ts` — add the relay line.
2. Emit via `getSocket()` from `@/config/socket` (server callers connect first;
   `jobManager` uses a lazy `require` to avoid a cycle).
3. Payload must carry a `socketId` (or a `jobId`) — the relay has no routing, so
   the **client** filters.
4. Client side: subscribe in the owning component and clean up in `useEffect`.

Existing events: `pipeline-progress`, `pipeline-error`, `pipeline-finished`,
`crawl-progress`, `crawl-error`, `video-progress`, `video-completed`,
`video-error`.

## 10. Filesystem & asset paths

- Never write to `public/`. Writes go to `/var/www/html/uploads/...`.
- Public URLs are `${process.env.NEXTAUTH_URL}/uploads/<rest>`.
- Per-shop image dir is the shop name with `.com` removed —
  `helper/website.ts` does `shopName.replace('.com','')`; the conversion from a
  stored URL back to a path replaces `NEXTAUTH_URL/uploads/` with
  `/var/www/html/uploads/`.
- Temp dirs: `/tmp/video-gen/...`, `/tmp/media-temp/...`. Clean up in `finally`.
- Crawl/pipeline exports write into `process.cwd()` and then `unlinkSync`.
- Always clean up temp files, ideally in a `finally`.

## 11. Config

- A website's full configuration is one `websites` document (`WebsiteConfig` in
  `src/types/woo.ts`) — URL, branding, Woo creds, AI prompts, blog cron, video
  toggle, YouTube templates. The defaults live in
  `UpdateWebsiteListModal.tsx` (`defaultFormValue`).
- Global (non-per-site) config is singleton docs in the `global_config`
  collection, keyed by a string `_id` (`cate_keyword_config` /
  `size_chart_links`), with the payload in a `data` field. Note the two
  `api/global-config/*` routes pass the literal `'global_config'` to
  `.collection()` and use the constant only for the `_id` — a wart, not a pattern
  to copy.
- AI prompt templates live in `src/constant/commons.ts` (defaults) and are
  overridden per website in the `websites` document.
- Constants that are effectively config live in `src/services/video/config.ts`
  (`VIDEO_CONFIG`, `VIDEO_PATHS`).
