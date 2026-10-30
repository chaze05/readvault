# Phase 2 — Bookmarks, Favorites, and Mobile Reader

**Date:** 2026-10-30  
**Status:** Design approved; awaiting written-spec review  
**Branch:** `feat/bookmarks-mobile-reader`

## Context

Pass 1 added account security, Settings, encrypted AI configuration, and an invitation-only family workflow. The `/bookmarks` route is still a placeholder. The PDF reader’s fullscreen control relies on the browser Fullscreen API, which does not provide reliable full-viewport behavior on iPhone Safari. Mobile pages can also render too small or blurry to read comfortably.

Phase 2 makes returning to saved pages easy and makes PDFs readable and navigable on phones.

## Goals

1. Save one bookmark per PDF/story page with an optional note.
2. Favorite whole books and stories and show them in a dedicated view.
3. Replace the Bookmarks placeholder with Pages and Favorites tabs.
4. Open PDFs in an immersive, full-viewport mobile reader by default.
5. Make PDF text readable through fit-width layout, high-DPI rendering, zoom, and pinch gestures.
6. Support horizontal swipe page navigation while preserving vertical scrolling and horizontal pan when zoomed.

## Non-goals

- Text highlights, annotations, or multiple notes per page.
- Public sharing, comments, or social favorites.
- App-wide themes.
- Changes to AI generation, account security, or public signup.
- Native iOS Safari browser-chrome hiding. In-app immersive mode fills the viewport; Safari chrome may remain unless installed to the Home Screen.
- A full PDF text layer or text selection.

## Approved decisions

- Bookmark UX: quick-save the current page, add/edit the note later on the Bookmarks page.
- One bookmark per user/page.
- Favorites cover whole books and stories.
- Favorites appear on cards and in readers, with a Favorites tab on `/bookmarks`.
- PDFs auto-open immersive on phones.
- Fit-width is the default readability mode; zoom and pinch are available.
- No highlights.

## Architecture

### Database migration

Add `db/migrations/0004_bookmarks_favorites.sql`.

**`books` and `stories`**

- Add `is_favorite boolean not null default false`.
- Add partial indexes for `(user_id, updated_at desc) where is_favorite` on each table.

**`bookmarks`**

| Column | Type | Rules |
| --- | --- | --- |
| `id` | uuid | primary key |
| `user_id` | uuid | references `users(id)` on delete cascade |
| `book_id` | uuid nullable | references `books(id)` on delete cascade |
| `story_id` | uuid nullable | references `stories(id)` on delete cascade |
| `page_number` | integer | >= 1 |
| `note` | text nullable | max 500 chars at validation |
| `created_at` | timestamptz | default now |
| `updated_at` | timestamptz | default now |

Constraints:
- Exactly one of `book_id` or `story_id` is non-null.
- Unique partial indexes:
  - `(user_id, book_id, page_number)` where `book_id is not null`.
  - `(user_id, story_id, page_number)` where `story_id is not null`.
- Index `(user_id, created_at desc)`.

### Types and stores

Add `isFavorite: boolean` to `Book` and `Story`.

Create `src/lib/bookmark-store.ts`:
- `listBookmarks(userId, target?)` returns bookmark + target title/type/page count, newest first.
- `saveBookmark(userId, target)` validates ownership and page bounds, inserts or returns the existing bookmark.
- `updateBookmarkNote(userId, bookmarkId, note)`.
- `deleteBookmark(userId, bookmarkId)`.
- `listFavoriteBooks(userId)` and `listFavoriteStories(userId)` (or a combined `listFavorites`).
- `setFavorite(userId, target, isFavorite)` returns the updated target or null.

All writes own-scope by the database user id. Page bounds:
- PDF: `page_number` between 1 and `total_pages` when `total_pages > 0`.
- Story: `page_number` between 1 and the story's page count.

### APIs

**Bookmarks**
- `GET /api/bookmarks` — all bookmarks for the user, with target metadata.
- `GET /api/bookmarks?bookId=<id>` / `?storyId=<id>` — bookmarks for one reader.
- `POST /api/bookmarks` — `{ bookId? , storyId?, pageNumber }`; exactly one target; idempotent save.
- `PATCH /api/bookmarks/<id>` — `{ note }`; empty string clears; max 500.
- `DELETE /api/bookmarks/<id>` — own bookmark only.

**Favorites**
- `PATCH /api/favorites` — `{ kind: "book" | "story", id, isFavorite: boolean }`.
- Existing book/story GET responses include `isFavorite`.
- Own-scoped ownership checks on every request.

All routes require an active authenticated user, return safe errors, and use the existing no-store headers for authenticated responses.

### Bookmarks page

Replace `src/app/bookmarks/page.tsx`.

Tabs:
- **Pages** — bookmark cards show target title, type, page number, note, date; actions Open, Edit note, Remove.
- **Favorites** — book/story cards with cover/metadata and an Unfavorite action.

Empty states explain how to save a page or favorite an item. Notes are edited inline or in a small dialog and saved through the API. Opening a bookmark navigates to `/reader/<id>?page=<n>` or `/story-time/<id>?page=<n>`.

Reader pages accept an optional validated `page` query parameter and clamp it to the document/page count. Without it, existing saved progress is used.

### Reader controls

Create a shared `BookmarkButton` client component:
- Unbookmarked page: one click saves; show “Bookmarked page X. Add a note in Bookmarks.”
- Bookmarked page: filled state; clicking opens a compact menu with “Open bookmarks” and “Remove bookmark.”
- No note editing inside the reader; notes live on the Bookmarks page.

PDF reader:
- Bookmark button in the normal toolbar and immersive overlay.
- Favorite heart for the book.
- Bookmark state loaded for the current book; current page state updates as the user moves.

Story reader:
- Bookmark button in the header; favorite heart for the story.
- Favorites and bookmarks use the same APIs.

### Mobile immersive PDF reader

Add immersive state to `PdfReader`:
- On mount, if the device is phone-sized (coarse pointer and a short viewport dimension of 700px or less, including landscape), enter immersive mode automatically after the reader is ready. Tablets/desktop stay in normal mode until the Full screen button is used.
- Immersive mode renders a fixed overlay at `inset: 0`, `height: 100dvh`, with safe-area padding, dark background, and a high z-index covering site chrome.
- Lock body scrolling while immersive; restore it on close and unmount.
- Provide close/back, page controls, bookmark, favorite, zoom, fit-width, and fullscreen controls in a compact overlay.
- Use native Fullscreen API where available; the overlay remains the fallback where it is unsupported.
- Recalculate the page width with `ResizeObserver` on open/close and orientation changes.

Readability and gestures:
- Default fit width: CSS canvas width fits the available viewport width without horizontal overflow.
- Render the canvas at device-pixel-ratio resolution and set CSS width/height separately, so text is crisp on Retina screens.
- Allow vertical scrolling for pages taller than the viewport.
- Pinch-to-zoom changes the reader zoom between 0.5× and 3×; ignore page-swipe while two touches are active.
- Zoom controls and Fit reset remain available.
- When zoom is greater than 1.05×, horizontal gestures pan the page instead of turning pages.
- When fitted, a single-finger horizontal swipe of at least 50 px, with horizontal movement at least 1.5× vertical movement, turns one page. Ignore swipes that begin on controls.
- Page changes reset the scroll position to the top of the new page; show a short page-turn transition.
- Keep keyboard arrows and existing progress saving behavior.
- On close, return to the normal reader position and page.

### Export and deletion

- JSON export includes bookmarks (target, page, note, dates) and favorites.
- Account/content deletion removes bookmarks and favorites via database cascades.
- Blob ownership rules are unchanged.

## Error handling

- Bookmarking a page outside the document returns 400.
- Duplicate quick-save is idempotent (returns the existing bookmark).
- Missing or foreign target returns 404.
- Note over 500 characters returns a validation error.
- Favorite/unfavorite is idempotent.
- Reader API failures show an inline, non-blocking error; the page remains readable.
- Immersive mode must remain usable during loading/error states, with a close control.

## Testing

Automated:
- Validation schemas for bookmark target, page number, note length, favorite payload.
- Bookmark uniqueness/idempotent save and ownership checks with mocked query.
- Page-bound checks for PDFs and stories.
- Favorite toggling and `isFavorite` mapping.
- Export document contains bookmark/favorite data and no sensitive fields.
- Pure swipe classifier: horizontal threshold, vertical dominance, zoom suppression, two-touch suppression.

Manual/mobile:
- 390×844 and 430×932 viewports.
- PDF auto-enters immersive mode; overlay fills the viewport; close returns to normal.
- Canvas CSS width does not overflow the viewport at fit; text is crisp (canvas backing size reflects device pixel ratio).
- Tall pages scroll vertically; horizontal swipe changes page; vertical swipe does not.
- Pinch changes zoom; zoomed pages pan horizontally instead of paging; Fit restores page swipe.
- Bookmark save, remove, note edit, and open-at-page work from both readers and the Bookmarks page.
- Favorite/unfavorite works from book cards, story cards, and readers.
- Export/account deletion include/remove the new data correctly.
- Existing PDF progress, offline cache, session, and AI flows still work.

## Rollout

1. Create/apply `0004_bookmarks_favorites.sql` to the shared database.
2. Implement and test locally with temporary users/content; do not modify owner data.
3. Deploy after review, then smoke-test on desktop and mobile.
4. No new environment variables are required.

## Acceptance criteria

- Users can save one bookmark per PDF/story page, add/edit a note, open it at the saved page, and remove it.
- Favorites work for books and stories from cards and readers and appear on `/bookmarks`.
- `/bookmarks` replaces the placeholder with Pages and Favorites tabs.
- Phone PDFs auto-open in a viewport-filling immersive reader.
- Fit-width text is readable and crisp, tall pages scroll, and horizontal swipes turn pages.
- Zoomed pages pan rather than page; pinch, zoom buttons, and Fit behave consistently.
- Export and deletion include the new personalization data.
- No cross-user bookmark/favorite access is possible.
- All tests, lint, build, and mobile smoke checks pass.

## Risks and tradeoffs

- iPhone Safari cannot hide its own browser chrome; Add to Home Screen is needed for a fully chrome-free view.
- Pinch and swipe gestures need careful conflict handling; the plan isolates the classifier and tests it.
- Authenticated pages are not service-worker cached, so offline reader reloads use `/offline`; PDF bytes remain in the reader cache.
- High-DPI canvas rendering increases memory use on large pages; cap device-pixel ratio if needed while preserving readability.
- Bookmarks are page-number based. Reordering or deleting story pages can shift what a saved page number points to; v1 does not re-anchor bookmarks to page content.
