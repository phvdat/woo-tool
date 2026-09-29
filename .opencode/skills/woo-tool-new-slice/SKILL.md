---
name: woo-tool-new-slice
description: Add a new feature slice to the woo-tool repo following house conventions. Use when adding a new page/tool, a new API route, a new Mongo collection, a new SWR hook, a new cron, or a new platform adapter. Triggers - "add a new tool", "new page", "new API route", "new collection", "new hook", "new cron", "new adapter", "add a feature", "scaffold", "wire up a new nav item".
---

# Adding a feature slice to WooTool

Read `AGENTS.md` and `docs/agent/CONVENTIONS.md` first. This skill is the
ordered checklist that turns a "new feature" request into a change that already
matches the house style, and that leaves the context docs correct.

There are 8 slices. Do only the ones your feature needs.

---

## Slice A — A new page/tool (UI + nav)

1. `src/components/<feature>/<Feature>Page.tsx` — `"use client"`, the real UI.
2. `src/app/(page)/<feature>/page.tsx` — the 7-line wrapper:
   ```tsx
   import <Feature>Page from "@/components/<feature>/<Feature>Page";
   export default function Page() { return <Feature>Page />; }
   ```
3. `src/constant/navigation.ts` — add `feature: '/feature'` to the `navigation` object.
4. `src/components/sidebar/Sidebar.tsx` — add the menu item. **The sidebar is the
   source of truth for what's user-visible**; a page that isn't there is unreachable.
5. Wrap the page in `<Container title subtitle extra>` from
   `src/components/commons/Container.tsx`. Every page does this.
6. If the page needs session data: `useSession()` (provider is already mounted in
   `MainLayout`).

## Slice B — A new API route

1. Create `src/app/api/<feature>/<action>/route.ts`, exporting named
   `GET`/`POST`/`PUT`/`PATCH`/`DELETE` functions.
2. Add the path to the `endpoint` object in `src/constant/endpoint.ts`. **Never
   hardcode the path in a component.**
3. `getServerSession(authOptions)` from `@/lib/auth` + a 401 return if the route
   reads or writes user data. This is the stronger pattern; don't rely on
   `middleware.ts` alone.
4. `connectToDatabase()` from `@/lib/mongodb`.
5. If it returns per-user multi-tenant data, filter with
   `buildWebsiteAccessFilter(session.user.email)` (from
   `src/services/revenue/websiteAccess.ts`) against `websites`.
6. Stringify `_id` on the way out: `.map(d => ({ ...d, _id: d._id.toString() }))`.
7. `export const runtime = "nodejs"` only if the route needs `fs`, `archiver`, or `Readable.toWeb`.
8. Add a doc comment if the "why" is non-obvious (matching neighboring routes).

**Reference shapes:** `src/app/api/product-spy/competitors/route.ts` (multi-method CRUD),
`src/app/api/revenue/route.ts` (session-guarded POST), `src/app/api/video/audio/route.ts`
(multipart upload), `src/app/api/product-spy/export-excel/route.ts` (streaming + Telegram).

## Slice C — A new Mongo collection

1. Add an `ALL_CAPS_COLLECTION = 'snake_case_name'` constant to
   `src/constant/collections.ts`. Never hardcode the name.
2. Add a doc `interface` to the matching `src/types/<domain>.ts`, with `_id?: string`.
3. Decide and document the timestamp convention. **Default to ISO strings**
   (`createdAt: new Date().toISOString()`), matching most collections. Six
   write real `Date`s (`revenue_history`, `blog_history`, `global_config`,
   `videoJobs`, `audioFiles`, `youtubeChannels`) — check `DATA.md` §2 before
   copying a convention, and be aware `revenue_history.date` is a string even
   though its `createdAt` is a `Date`.
4. If it's a hot query, add an index explicitly — the repo declares almost none.
5. Add the collection + its fields to `docs/agent/DATA.md` §2.

## Slice D — A new SWR hook

Add to `src/app/hooks/`. Match the existing shape:

```ts
"use client";
import useSWR from "swr";
import axios from "axios";
import { endpoint } from "@/constant/endpoint";

const fetcher = (url: string) => axios.get(url).then(r => r.data);

export function useThing(id: string) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? [endpoint.thing, id] : null,   // null key disables the request
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: true }
  );
  return { thing: data, isLoading, isError: !!error, mutate };
}
```

`src/app/hooks/**` is the **only** client data layer — don't fetch in a component
with raw `useEffect`. (Exception already in the codebase: the revenue page uses
`useState` + axios, deliberately, because it has two distinct actions.)

## Slice E — A new cron

1. Create `start<X>Cron()` in the feature's service dir, with:
   - a module-level `ScheduledTask | null` handle and `if (mainJob) return;`
   - `cron.schedule(expr, tick, { timezone: "Asia/Ho_Chi_Minh", noOverlap: true })`
   - an `isRunning` re-entrancy guard inside `tick`, reset in `finally`.
   Reference: `src/services/revenue/scheduler.ts` (cleanest example).
2. Register it in `server.ts` **inside `app.prepare()`** via dynamic `await import`.
   Crons do not run under `next start` — only under `tsx server.ts`.
3. Add a row to the crons table in `docs/agent/ARCHITECTURE.md` §1.

## Slice F — A new product-spy platform adapter

1. Create `src/services/product-spy/<platform>.ts` exporting
   `is<Platform>Store(url)` and `fetch<Platform>Products(url) → RawSpyProduct[]`
   (set `source` to the platform name). Base it on `generic.ts`, which already
   does sitemap/listing/JSON-LD discovery.
2. Add the value to the `Platform` union in `src/types/product-spy.ts`.
3. Import it in `detector.ts` and add it to **both** the `detectPlatform` chain
   and the `fetchProducts` chain. There is no registry — the chains are `if`s.
4. Test against a real store URL manually (`npx tsx` a scratch script, or hit
   the app). Adapters swallow errors into `debug[]`, so a silent scraper usually
   means the detection strings need updating.

## Slice G — A new socket event

1. Add the relay line in `server.ts`'s `io.on("connection")` block.
2. Emit from the server via `getSocket()` (`@/config/socket`); call `.connect()`
   first if not already connected. (`jobManager` uses a lazy `require` to avoid
   an import cycle — follow that pattern there.)
3. Include a correlation field in the payload (`socketId` or `jobId`). **The
   relay broadcasts to everyone; the client must filter.**
4. Subscribe + clean up in the owning component's `useEffect`.
5. If adding a 5th cron, also do Slice E.

## Slice H — A new external integration

1. Add the env var to `.env.example` **and** document it in `docs/agent/DATA.md` §3
   (with `Required?` and the file that reads it).
2. If it holds a secret, it must be a server-side var, not `NEXT_PUBLIC_*`, and
   the only writable secret field pattern is `src/lib/encryption.ts`
   (AES-256-GCM, `ivHex:authTagHex:cipherHex`).
3. **Do not add the dependency without asking** — the `package.json` list is
   load-bearing (`puppeteer`, `sharp`, `exiftool-vendored`, `fluent-ffmpeg`,
   `node-cron`, `node-telegram-bot-api`…). Check `node_modules` first; prefer
   something already there (`axios`, `lodash`, `dayjs`, `form-data`, `fs-extra`).

---

## Finish every slice with

1. `npx tsc --noEmit`, then `npm run lint` (and `npm run build` if you touched
   routing/auth/API shape). See skill `woo-tool-verify`.
2. Update `docs/agent/FEATURES.md` — add the feature row to §2 and a section.
3. Update `docs/agent/DATA.md` if you added a collection, env var, or path.
4. Update `docs/agent/CONVENTIONS.md` only if you established a genuinely new
   pattern (not a one-off).
5. Re-read `AGENTS.md` hard rules (§3) and confirm your change doesn't violate
   any of them.

## Sanity checklist before you finish

- [ ] Component is `"use client"`; it imports no server-only module
      (`fs`, `mongodb`, `sharp`, `process.env` for secrets, `puppeteer`).
- [ ] No hardcoded `/api/...` string in a component — all via `endpoint.*`.
- [ ] No hardcoded collection name — all via `*_COLLECTION` constants.
- [ ] New route has `getServerSession`; new data read is access-filtered.
- [ ] `_id` stringified on the way out; `new ObjectId(...)` on the way in.
- [ ] Multi-tenant data filtered by `buildWebsiteAccessFilter`.
- [ ] Temp files cleaned up in `finally`; disk writes go to
      `/var/www/html/uploads/...` and public URLs are built from `NEXTAUTH_URL`.
- [ ] New cron registered in `server.ts`.
- [ ] New dep? — asked the user first.
- [ ] Docs updated to match the code.
