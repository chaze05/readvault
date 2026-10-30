# Phase 2 — Bookmarks, Favorites, and Mobile Reader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add page bookmarks with notes, whole-book/story favorites, a real Bookmarks page, and a readable auto-immersive mobile PDF reader with swipe navigation.

**Architecture:** Add a single `bookmarks` table and `is_favorite` columns, expose user-scoped bookmark/favorite APIs, share bookmark/favorite controls across readers and cards, and upgrade the PDF reader with high-DPI fit-width rendering, immersive mobile layout, pinch zoom, and swipe gestures. Export/deletion are extended through the existing user-scoped paths.

**Tech Stack:** Next.js 15.5 App Router, React 19, TypeScript, Tailwind, PostgreSQL via `pg`, PDF.js, Vercel Blob, Zod, Vitest, Framer Motion.

**Spec:** `docs/superpowers/specs/2026-10-30-phase-2-bookmarks-mobile-reader-design.md`

## Global Constraints

- Public signup stays closed; no email delivery; no new environment variables.
- One bookmark per user per PDF/story page; notes are optional and max 500 characters.
- Favorites apply to whole books and stories.
- Every query and mutation scopes by the authenticated database user id; foreign targets return 404.
- Bookmark pages must be validated against the target's page count when known.
- Mobile PDFs auto-enter immersive mode on phones (coarse pointer and short viewport dimension ≤700px, including landscape).
- Fit-width is the default mobile readability mode; canvas backing size uses device-pixel-ratio scaling capped at 2×.
- Horizontal swipes turn pages only at fit width; when zoom >1.05×, horizontal movement pans instead.
- Vertical scrolling must remain available; two-finger touches must never turn pages.
- On iPhone Safari the in-app overlay fills the viewport, but Safari chrome remains unless installed to the Home Screen.
- PDF/story page query parameters (`?page=<n>`) are validated and clamped.
- No highlights, multiple notes per page, public sharing, or app-wide theme.
- Do not commit `.env.local`, `.local-credentials.txt`, secrets, or temporary test credentials.
- Finish every task with `npm.cmd test`, `npm.cmd run lint`, and `npm.cmd run build`; commit each task.

## Review Focus

- A user cannot read, edit, delete, or favorite another user's bookmark/target; Task 2/3 must test foreign IDs and ownership.
- Duplicate saves are idempotent and page numbers outside a PDF/story are rejected; Task 2 must test both.
- Swipe classification must not page during vertical scroll, pinch, two-finger touch, or zoomed panning; Task 8 must test the pure classifier.
- The immersive reader must not clip the canvas, overflow horizontally at fit, or render blurry text; Task 7 must test viewport detection and canvas metrics.
- Export and deletion must include/remove bookmarks and favorites without exposing another user's data; Task 9 must test the export shape and cascade behavior.

---

## File Structure

- `db/migrations/0004_bookmarks_favorites.sql` — bookmarks table, favorite columns/indexes.
- `src/lib/types.ts` — `isFavorite` on Book/Story; bookmark types.
- `src/lib/validation.ts` — bookmark, note, and favorite schemas.
- `src/lib/bookmark-store.ts` — bookmark/favorite queries and ownership.
- `src/lib/book-store.ts`, `src/lib/story-store.ts` — map/persist `isFavorite`.
- `src/lib/reader-gestures.ts` — pure phone detection, canvas metrics, swipe classifier, zoom clamp.
- `src/app/api/bookmarks/route.ts` — list/save bookmarks.
- `src/app/api/bookmarks/[id]/route.ts` — note update/delete.
- `src/app/api/favorites/route.ts` — favorite toggle.
- `src/components/bookmarks/bookmark-button.tsx` — quick-save/filled menu control.
- `src/components/bookmarks/bookmark-card.tsx` — bookmark card with note editing.
- `src/components/bookmarks/bookmarks-view.tsx` — Pages/Favorites tabs.
- `src/components/favorites/favorite-button.tsx` — heart toggle.
- `src/app/bookmarks/page.tsx` — real server-rendered Bookmarks page.
- `src/components/pdf-reader.tsx` — immersive mobile reader, high-DPI rendering, gestures, bookmark/favorite controls.
- `src/components/story-reader.tsx` — bookmark/favorite controls and initial page support.
- `src/app/reader/[id]/page.tsx`, `src/app/story-time/[id]/page.tsx` — page query params.
- `src/components/library-app.tsx`, `src/components/story-time-app.tsx` — favorite hearts on cards.
- `src/lib/export-shape.ts`, `src/lib/data-export.ts` — export/deletion integration.
- Tests: `src/lib/validation.test.ts`, `src/lib/bookmark-store.test.ts`, `src/lib/reader-gestures.test.ts`, `src/lib/export-shape.test.ts`.
- `README.md`, `AGENTS.md` — Phase 2 behavior and verification notes.

---

### Task 1: Migration, Types, and Validation

**Files:**
- Create: `db/migrations/0004_bookmarks_favorites.sql`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/validation.ts`
- Modify: `src/lib/validation.test.ts`

**Interfaces:**
- Produces: `BookmarkKind = "book" | "story"`, `BookmarkTarget { kind; id; pageNumber }`, and `BookmarkItem { id; kind; targetId; title; pageNumber; note; pageCount; author; coverColor; coverImageUrl; createdAt; updatedAt }` from `types.ts`.
- Produces: `bookmarkTargetSchema`, `bookmarkNoteSchema`, `favoriteInputSchema` from `validation.ts`.

- [ ] **Step 1: Add failing validation tests**

Add tests proving:
- `bookmarkTargetSchema` accepts exactly one of `bookId`/`storyId` and a positive integer `pageNumber`; rejects both or neither.
- `bookmarkNoteSchema` accepts empty/500 characters and rejects 501.
- `favoriteInputSchema` accepts `{ kind: "book"|"story", id: uuid, isFavorite: boolean }` and rejects other kinds.

```ts
expect(
  bookmarkTargetSchema.safeParse({ bookId: crypto.randomUUID(), pageNumber: 3 }).success
).toBe(true);
expect(
  bookmarkTargetSchema.safeParse({
    bookId: crypto.randomUUID(),
    storyId: crypto.randomUUID(),
    pageNumber: 3,
  }).success
).toBe(false);
expect(bookmarkNoteSchema.safeParse({ note: "x".repeat(501) }).success).toBe(false);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm.cmd test -- src/lib/validation.test.ts`  
Expected: FAIL because the schemas/types are not exported.

- [ ] **Step 3: Add types and schemas**

Add `isFavorite: boolean` to `Book` and `Story`. Add the bookmark interfaces and the three Zod schemas with exact constraints. Use `.refine((value) => Boolean(value.bookId) !== Boolean(value.storyId))`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm.cmd test -- src/lib/validation.test.ts`  
Expected: PASS.

- [ ] **Step 5: Create the migration**

Create `db/migrations/0004_bookmarks_favorites.sql`:

```sql
alter table public.books
  add column if not exists is_favorite boolean not null default false;
alter table public.stories
  add column if not exists is_favorite boolean not null default false;

create index if not exists books_user_favorite_idx
  on public.books (user_id, updated_at desc) where is_favorite;
create index if not exists stories_user_favorite_idx
  on public.stories (user_id, updated_at desc) where is_favorite;

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  book_id uuid references public.books(id) on delete cascade,
  story_id uuid references public.stories(id) on delete cascade,
  page_number integer not null check (page_number >= 1),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(book_id, story_id) = 1),
  check (note is null or char_length(note) <= 500)
);

create index if not exists bookmarks_user_created_idx
  on public.bookmarks (user_id, created_at desc);
create unique index if not exists bookmarks_user_book_page_idx
  on public.bookmarks (user_id, book_id, page_number)
  where book_id is not null;
create unique index if not exists bookmarks_user_story_page_idx
  on public.bookmarks (user_id, story_id, page_number)
  where story_id is not null;
```

- [ ] **Step 6: Apply and verify the migration**

Run: `npm.cmd run db:migrate`  
Expected: `0004_bookmarks_favorites.sql` applied (or skipped if already applied). Verify the `bookmarks` table and `is_favorite` columns exist.

- [ ] **Step 7: Commit**

```bash
git add db/migrations/0004_bookmarks_favorites.sql src/lib/types.ts src/lib/validation.ts src/lib/validation.test.ts
git commit -m "feat: add bookmark and favorite schema"
```

---

### Task 2: Bookmark and Favorite Store

**Files:**
- Create: `src/lib/bookmark-store.ts`
- Create: `src/lib/bookmark-store.test.ts`
- Modify: `src/lib/book-store.ts`
- Modify: `src/lib/story-store.ts`

**Interfaces:**
- Produces:
  - `listBookmarks(userId: string, target?: { kind: BookmarkKind; id: string }): Promise<BookmarkItem[]>`
  - `saveBookmark(userId: string, target: BookmarkTarget): Promise<BookmarkItem>`
  - `updateBookmarkNote(userId: string, bookmarkId: string, note: string): Promise<BookmarkItem | null>`
  - `deleteBookmark(userId: string, bookmarkId: string): Promise<boolean>`
  - `setFavorite(userId: string, kind: BookmarkKind, id: string, isFavorite: boolean): Promise<boolean>`
- Consumes: `query`, `withTransaction`, `BookmarkTarget`, `BookmarkItem`, `Book`, `Story`.
- Produces `isFavorite` from `listBooks`, `getBook`, `listStories`, `getStory`.

- [ ] **Step 1: Add failing store tests with mocked `query`**

Cover:
- `saveBookmark` rejects a target owned by another user or an out-of-range page (PDF `total_pages > 0`, story page count).
- Quick-save is idempotent for the same user/target/page.
- `updateBookmarkNote` enforces ownership and 500-char max.
- `deleteBookmark` scopes by user.
- `setFavorite` returns false when no owned row is updated.
- `listBookmarks` maps book/story titles, page count, and target kind.

Use `vi.mock("./db", ...)` and assert the SQL parameters include `userId`; tests must not hit PostgreSQL.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm.cmd test -- src/lib/bookmark-store.test.ts`  
Expected: FAIL because the module and functions are missing.

- [ ] **Step 3: Implement the store**

Implement:
- `saveBookmark`: validate target existence and page bounds, then `insert ... on conflict ... do update set updated_at = now() returning id`; fetch/map the bookmark.
- `listBookmarks`: join books/stories and story page counts; filter by optional target; newest first.
- `updateBookmarkNote`: update scoped by `user_id` and bookmark id; return mapped item or null.
- `deleteBookmark`: delete scoped by user.
- `setFavorite`: update the owned book/story row and return `rowCount === 1`.

Update `book-store.ts` and `story-store.ts` row interfaces, `toBook`/`toStory`, and `select *`/`STORY_SELECT` mappings to include `is_favorite` as `isFavorite`. Existing list/get APIs must now return the boolean. Update any Book/Story fixtures or test objects that now require the field; the full build must remain clean.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm.cmd test -- src/lib/bookmark-store.test.ts`  
Expected: PASS.

- [ ] **Step 5: Run the full suite and commit**

Run: `npm.cmd test`  
Expected: 194+ tests passing, including the new store tests.

```bash
git add src/lib/bookmark-store.ts src/lib/bookmark-store.test.ts src/lib/book-store.ts src/lib/story-store.ts src/lib/types.ts
git commit -m "feat: add bookmark and favorite store"
```

---

### Task 3: Bookmark/Favorite APIs and Page Query Support

**Files:**
- Create: `src/app/api/bookmarks/route.ts`
- Create: `src/app/api/bookmarks/[id]/route.ts`
- Create: `src/app/api/favorites/route.ts`
- Modify: `src/app/reader/[id]/page.tsx`
- Modify: `src/app/story-time/[id]/page.tsx`
- Modify: `src/components/story-reader.tsx`

**Interfaces:**
- Consumes: `requireActiveUser`, `AUTHENTICATED_CACHE_HEADERS`, `listBookmarks`, `saveBookmark`, `updateBookmarkNote`, `deleteBookmark`, `setFavorite`, `bookmarkTargetSchema`, `bookmarkNoteSchema`, `favoriteInputSchema`.
- Produces: `POST /api/bookmarks` returns `BookmarkItem`; `GET /api/bookmarks` returns `BookmarkItem[]`; `PATCH /api/bookmarks/<id>` returns `BookmarkItem`; `DELETE /api/bookmarks/<id>` returns `{ success: true }`; `PATCH /api/favorites` returns `{ kind, id, isFavorite }`.
- Produces: `StoryReader` accepts `initialPage?: number`.

- [ ] **Step 1: Implement the APIs**

Use `requireActiveUser` on every handler. Parse JSON and Zod schemas. Validate UUID query/route parameters with `isUuid`. Return 400 for invalid input, 404 for foreign/missing targets, 401 for no active session, and no-store authenticated headers. `GET /api/bookmarks` accepts optional `bookId`/`storyId` and rejects both at once.

- [ ] **Step 2: Add page query support**

In `reader/[id]/page.tsx`, accept `searchParams: Promise<{ page?: string }>`, parse an integer, clamp between 1 and `book.totalPages` when known, and pass it as `initialPage`. In `story-time/[id]/page.tsx`, accept the same query and pass a clamped `initialPage` to `StoryReader`; update `StoryReader` to prefer `initialPage` for its starting index while preserving saved progress when absent.

- [ ] **Step 3: Run tests, lint, and build**

Run: `npm.cmd test`  
Run: `npm.cmd run lint`  
Run: `npm.cmd run build`  
Expected: all pass.

- [ ] **Step 4: Manual API/query verification**

With a temporary authenticated user and a temporary page/book row:
- Save, list, update-note, and delete a bookmark.
- Confirm a foreign bookmark id returns 404.
- Open `/reader/<id>?page=3` and `/story-time/<id>?page=2`; confirm the requested page loads and an out-of-range page clamps.
- Toggle a favorite and confirm `isFavorite` appears in the existing list/detail response.

Clean up temporary data. Do not modify owner content.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/bookmarks src/app/api/favorites src/app/reader/[id]/page.tsx src/app/story-time/[id]/page.tsx src/components/story-reader.tsx
git commit -m "feat: add bookmark and favorite APIs"
```

---

### Task 4: Reader Bookmark and Favorite Controls

**Files:**
- Create: `src/components/bookmarks/bookmark-button.tsx`
- Create: `src/components/favorites/favorite-button.tsx`
- Modify: `src/components/pdf-reader.tsx`
- Modify: `src/components/story-reader.tsx`
- Modify: `src/app/reader/[id]/page.tsx`
- Modify: `src/app/story-time/[id]/page.tsx`

**Interfaces:**
- Consumes: bookmark/favorite APIs, `isFavorite` on Book/Story.
- Produces: `BookmarkButton` and `FavoriteButton` used by both readers.
- Produces: `PdfReader` accepts `isFavorite`; `StoryReader` accepts `isFavorite`.

- [ ] **Step 1: Implement the shared controls**

`BookmarkButton` receives `kind`, `targetId`, `pageNumber`, `initialBookmarked`, and optional `onChange`. It:
- Saves immediately when unbookmarked and exposes a “Bookmarked page X” notice.
- Shows a filled state when bookmarked.
- Opens a compact menu with “Open bookmarks” and “Remove bookmark” when filled.
- Never edits notes in the reader.

`FavoriteButton` receives `kind`, `targetId`, and `initialFavorite`; toggles the favorite API with optimistic UI and reverts on failure. Use accessible `aria-label`, `aria-pressed`, and tooltips.

- [ ] **Step 2: Integrate into readers**

Load bookmark state for the current book/story from `/api/bookmarks?bookId=` or `?storyId=`. In `PdfReader`, add controls to both normal and immersive toolbars. In `StoryReader`, add controls to the header. Pass initial favorite state from the server pages.

- [ ] **Step 3: Run tests, lint, and build**

Run: `npm.cmd test`  
Run: `npm.cmd run lint`  
Run: `npm.cmd run build`  
Expected: all pass.

- [ ] **Step 4: Manual verification**

On desktop:
- Bookmark a PDF page; confirm the filled state and that the bookmark appears in `/api/bookmarks`/the Bookmarks page.
- Remove it from the filled menu.
- Favorite/unfavorite a book and story from the reader header.
- Confirm the note is edited only on the Bookmarks page.

- [ ] **Step 5: Commit**

```bash
git add src/components/bookmarks/bookmark-button.tsx src/components/favorites/favorite-button.tsx src/components/pdf-reader.tsx src/components/story-reader.tsx src/app/reader/[id]/page.tsx src/app/story-time/[id]/page.tsx
git commit -m "feat: add reader bookmark and favorite controls"
```

---

### Task 5: Real Bookmarks Page

**Files:**
- Replace: `src/app/bookmarks/page.tsx`
- Create: `src/components/bookmarks/bookmarks-view.tsx`
- Create: `src/components/bookmarks/bookmark-card.tsx`
- Modify: `src/components/bookmarks/bookmark-button.tsx`

**Interfaces:**
- Consumes: `getCurrentUser`, `listBookmarks`, `listBooks`, `listStories`, `BookmarkItem`, `Book`, `Story`.
- Produces: `/bookmarks` with Pages and Favorites tabs, note editing, open-at-page links, remove, and unfavorite actions.

- [ ] **Step 1: Build the server page and client view**

`/bookmarks` redirects unauthenticated users to `/login`, loads bookmarks plus books/stories, filters favorites, and renders a client view with initial data. Keep the existing sidebar link and page styling.

- [ ] **Step 2: Build the Pages tab**

Each card shows target title/type, page number, note textarea, dates, Open, Save note, and Remove. Empty state explains quick-save from the reader. Open links use `/reader/<id>?page=<n>` or `/story-time/<id>?page=<n>`.

- [ ] **Step 3: Build the Favorites tab**

Show favorite books and stories with cover/metadata and Unfavorite. Use the existing `BookCover` for books and story cover image/fallback for stories. Empty state links to Library/Story Time.

- [ ] **Step 4: Run tests, lint, and build**

Run: `npm.cmd test`  
Run: `npm.cmd run lint`  
Run: `npm.cmd run build`  
Expected: all pass.

- [ ] **Step 5: Manual verification**

Open `/bookmarks`; confirm tabs, empty states, note save/clear (500-char max), open-at-page, remove, favorite/unfavorite, and mobile layout. Confirm a foreign user cannot see or mutate the data.

- [ ] **Step 6: Commit**

```bash
git add src/app/bookmarks/page.tsx src/components/bookmarks/bookmarks-view.tsx src/components/bookmarks/bookmark-card.tsx src/components/bookmarks/bookmark-button.tsx
git commit -m "feat: add bookmarks page"
```

---

### Task 6: Favorite Hearts on Library and Story Cards

**Files:**
- Modify: `src/components/library-app.tsx`
- Modify: `src/components/story-time-app.tsx`
- Modify: `src/components/bookmarks/bookmark-card.tsx` if shared cover styling is needed

**Interfaces:**
- Consumes: `FavoriteButton`, `Book.isFavorite`, `Story.isFavorite`.
- Produces: favorite hearts on book cards and story cards with optimistic local updates.

- [ ] **Step 1: Add heart controls**

Place a heart button in each book/story card without nesting it inside a clickable `<Link>` (avoid invalid/accidental navigation). Add `aria-pressed`, accessible labels, and a filled/unfilled state. On toggle, update the local list item; on failure, revert and show the existing inline error or a small card-level error.

- [ ] **Step 2: Run tests, lint, and build**

Run: `npm.cmd test`  
Run: `npm.cmd run lint`  
Run: `npm.cmd run build`  
Expected: all pass.

- [ ] **Step 3: Manual verification**

Favorite books from Library and stories from Story Time; confirm hearts persist after reload, appear in `/bookmarks` Favorites, and can be removed from either place. Confirm clicking the heart never opens the reader.

- [ ] **Step 4: Commit**

```bash
git add src/components/library-app.tsx src/components/story-time-app.tsx
git commit -m "feat: add favorite controls to library cards"
```

---

### Task 7: Immersive Mobile PDF Shell and High-DPI Rendering

**Files:**
- Create: `src/lib/reader-gestures.ts`
- Create: `src/lib/reader-gestures.test.ts`
- Modify: `src/components/pdf-reader.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces: `isPhoneReader(width: number, height: number, coarsePointer: boolean): boolean`
- Produces: `getCanvasMetrics(cssWidth: number, devicePixelRatio: number): { cssWidth; backingWidth; pixelRatio }`
- Produces: `clampReaderZoom(value: number): number` (0.5–3).
- Produces: `PdfReader` auto-immersive shell and high-DPI canvas sizing.

- [ ] **Step 1: Add failing pure tests**

```ts
expect(isPhoneReader(390, 844, true)).toBe(true);
expect(isPhoneReader(844, 390, true)).toBe(true);
expect(isPhoneReader(1440, 900, false)).toBe(false);
expect(getCanvasMetrics(390, 3)).toEqual({ cssWidth: 390, backingWidth: 780, pixelRatio: 2 });
expect(clampReaderZoom(10)).toBe(3);
```

- [ ] **Step 2: Implement the helpers and run tests**

Use coarse pointer plus `Math.min(width, height) <= 700` for phone detection. Cap pixel ratio at 2. Run `npm.cmd test -- src/lib/reader-gestures.test.ts`; expect PASS.

- [ ] **Step 3: Add auto-immersive shell**

In `PdfReader`:
- Detect phone on mount and set immersive mode after the PDF is ready.
- Render a fixed overlay (`inset-0`, `h-[100dvh]`, safe-area padding, dark background) covering the site header.
- Add close/back, page, bookmark, favorite, zoom, Fit, and native-fullscreen controls.
- Lock body scrolling while immersive; restore on close/unmount.
- Use native Fullscreen API when available; otherwise keep the overlay. Closing returns to the normal reader.
- Recalculate `containerWidth` when entering/exiting immersive or rotating.

- [ ] **Step 4: Apply high-DPI rendering**

In the render effect, get the page at fit scale, compute `getCanvasMetrics(viewport.width, window.devicePixelRatio)`, set the backing canvas size and CSS size separately, and render with the pixel-ratio transform. Ensure fit-width CSS width never exceeds the container and tall pages scroll vertically.

- [ ] **Step 5: Run tests, lint, and build**

Run: `npm.cmd test`  
Run: `npm.cmd run lint`  
Run: `npm.cmd run build`  
Expected: all pass.

- [ ] **Step 6: Mobile visual verification**

At 390×844 and 430×932:
- Open a PDF and confirm auto-immersive covers the viewport with no page-header overlap.
- Confirm canvas fits width, text is crisp, and tall pages scroll.
- Confirm close returns to the normal reader and preserves the page.
- Confirm desktop remains normal until Full screen is clicked.

- [ ] **Step 7: Commit**

```bash
git add src/lib/reader-gestures.ts src/lib/reader-gestures.test.ts src/components/pdf-reader.tsx src/app/globals.css
git commit -m "feat: add immersive mobile PDF shell"
```

---

### Task 8: Mobile Swipe and Pinch Gestures

**Files:**
- Modify: `src/lib/reader-gestures.ts`
- Modify: `src/lib/reader-gestures.test.ts`
- Modify: `src/components/pdf-reader.tsx`

**Interfaces:**
- Produces: `getPageSwipeDirection(input: { deltaX; deltaY; zoom; fingers }): "next" | "previous" | null`
- Consumes: `PdfReader` immersive page container and zoom state.

- [ ] **Step 1: Add failing swipe tests**

```ts
expect(getPageSwipeDirection({ deltaX: -80, deltaY: 20, zoom: 1, fingers: 1 })).toBe("next");
expect(getPageSwipeDirection({ deltaX: 80, deltaY: 20, zoom: 1, fingers: 1 })).toBe("previous");
expect(getPageSwipeDirection({ deltaX: -80, deltaY: 20, zoom: 1.2, fingers: 1 })).toBeNull();
expect(getPageSwipeDirection({ deltaX: 0, deltaY: 100, zoom: 1, fingers: 1 })).toBeNull();
expect(getPageSwipeDirection({ deltaX: -80, deltaY: 20, zoom: 1, fingers: 2 })).toBeNull();
```

- [ ] **Step 2: Implement swipe classification and run tests**

Require 50px horizontal movement, horizontal ≥1.5× vertical, one finger, and zoom ≤1.05. Run the focused test; expect PASS.

- [ ] **Step 3: Integrate touch gestures**

Add touch handlers to the immersive page container:
- Single-finger horizontal swipe calls `goToPage` next/previous.
- Vertical movement remains native scrolling.
- Ignore touches beginning on controls.
- Pinch changes zoom via `clampReaderZoom`; two-finger touches never page.
- At zoom >1.05, horizontal movement pans instead of paging.
- Reset scroll position to top on page change; keep progress saving.

- [ ] **Step 4: Run tests, lint, and build**

Run: `npm.cmd test`  
Run: `npm.cmd run lint`  
Run: `npm.cmd run build`  
Expected: all pass.

- [ ] **Step 5: Mobile gesture verification**

On a touch emulator/device:
- Swipe left/right at fit width: exactly one page changes.
- Swipe vertically on a tall page: page scrolls, no page change.
- Pinch: zoom changes, no page change, no accidental browser zoom.
- Zoom in, drag horizontally: pan; Fit restores swipe.
- Swipe starting on a button does not navigate.

- [ ] **Step 6: Commit**

```bash
git add src/lib/reader-gestures.ts src/lib/reader-gestures.test.ts src/components/pdf-reader.tsx
git commit -m "feat: add mobile PDF swipe and pinch gestures"
```

---

### Task 9: Export, Documentation, and Rollout

**Files:**
- Modify: `src/lib/export-shape.ts`
- Modify: `src/lib/export-shape.test.ts`
- Modify: `src/lib/data-export.ts`
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `PROJECT_PLAN.md` if its status list still marks bookmarks as pending

**Interfaces:**
- Consumes: `listBookmarks`, `BookmarkItem`, `Book`/`Story.isFavorite`.
- Produces: export schema version 2 with `bookmarks` and favorite flags; docs for Phase 2.

- [ ] **Step 1: Add failing export tests**

Assert:
- `buildExportDocument` includes bookmark target, page, note, dates, and favorite flags.
- The schema version is `2`.
- No password/token/session fields appear.
- Bookmark/favorite data is removed by content/account cascades (store/API/manual verification).

- [ ] **Step 2: Implement export integration**

Add `isFavorite` to exported books/stories, add `bookmarks` to `ExportDocument`/`ExportSource`, have `buildUserExport` load bookmarks, and bump `EXPORT_SCHEMA_VERSION` to 2. Keep Blob URL collection unchanged.

- [ ] **Step 3: Update docs**

Document:
- Bookmark quick-save + note editing on Bookmarks.
- One bookmark per page; favorites on cards/readers.
- Mobile immersive reader, swipe, pinch, zoom, and iPhone Safari chrome caveat.
- Page query links and no new env requirements.
- Phase 2 migration/rollout and verification commands.

- [ ] **Step 4: Run the full verification suite**

Run: `npm.cmd test`  
Run: `npm.cmd run lint`  
Run: `npm.cmd run build`  
Expected: all pass.

- [ ] **Step 5: Apply migration and deploy after review**

Run: `npm.cmd run db:migrate:prod` (expect `0004` applied or skipped), then deploy after the final review. Live-smoke bookmark/favorite/mobile flows with temporary data; do not modify owner content. No new env vars.

- [ ] **Step 6: Commit**

```bash
git add src/lib/export-shape.ts src/lib/export-shape.test.ts src/lib/data-export.ts README.md AGENTS.md PROJECT_PLAN.md
git commit -m "feat: export personalization and document phase 2"
```

---

## Final Verification

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Manual gates:
- One bookmark per PDF/story page; note edit/clear; open-at-page; remove.
- Favorites from cards/readers, visible in the Favorites tab.
- Mobile auto-immersive at 390×844 and 430×932; crisp fit-width canvas; tall-page scroll.
- Horizontal swipe pages only at fit; vertical swipe scrolls; pinch/zoom pans; Fit restores swipe.
- Existing PDF progress, offline cache, session, family/AI settings, and export/deletion still work.
