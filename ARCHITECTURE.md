# ReadVault Architecture

## Layers

- **Presentation:** `src/app` routes and `src/components` UI.
- **Application:** API route handlers for auth-adjacent data, books, stories, images, progress, and AI drafts.
- **Data access:** `src/lib/book-store.ts`, `src/lib/story-store.ts`, `src/lib/users.ts`, `src/lib/db.ts`.
- **Storage:** Vercel Blob for PDFs and story images; URLs stored in Postgres.
- **Auth:** custom email/password with bcrypt + signed JWT cookies.

Components call typed HTTP endpoints. Server pages read through the stores with the session user id.

## Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Marketing/home page |
| `/login` | Public | Sign in / sign up |
| `/dashboard` | Private | Overview dashboard |
| `/library` | Private | Full book library |
| `/recent` | Private | Books with saved progress |
| `/bookmarks` | Private | Placeholder |
| `/settings` | Private | Placeholder |
| `/reader/[id]` | Private | PDF.js reader |
| `/story-time` | Private | Story shelf |
| `/story-time/new` | Private | Story editor |
| `/story-time/[id]` | Private | Story reader |
| `/story-time/[id]/edit` | Private | Story editor |
| `/offline` | Public | PWA fallback |

API routes under `/api` all require a session unless noted:

- `GET/POST /api/books`, `PATCH/DELETE /api/books/[id]`, `GET /api/books/[id]/file`, `PATCH /api/books/[id]/progress`
- `GET/POST /api/stories`, `GET/PATCH/DELETE /api/stories/[id]`, `POST /api/stories/[id]/images`, `PATCH /api/stories/[id]/progress`
- `POST /api/ai/story` (optional AI draft)
- `POST /api/blob/upload` (Vercel Blob client-upload token; auth required)

## Database

Postgres schema in `db/migrations/0001_init.sql`:

- `users` — id uuid, email (unique lower index), password_hash, created_at
- `books` — id uuid, user_id, metadata, file_name, file_path (Blob URL), file_hash, total_pages, current_page, status, cover_color, timestamps; unique `(user_id, file_hash)`
- `stories` — id uuid, user_id, title, story_type, source_title, description, age_range, language, cover_image_path (Blob URL), status, timestamps
- `story_pages` — id uuid, story_id, page_number, content, image_path (Blob URL), image_alt, timestamps; unique `(story_id, page_number)`
- `story_progress` — story_id primary key, current_page, last_read_at, updated_at
- `schema_migrations` — applied migration filenames

There is no RLS yet. The database is accessed only by the server with a private connection string; every query filters by the session user id. Add RLS as defense-in-depth in a hardening pass.

## Auth

- `POST` server actions `signUp`, `signIn`, `signOut` in `src/actions/auth.ts`.
- Password hashing: bcrypt cost 12.
- Session: HS256 JWT, subject = user id, 30-day expiry, HttpOnly/SameSite=Lax/Secure-in-production cookie.
- `src/middleware.ts` redirects unauthenticated private routes to `/login` and signed-in users away from `/login`.
- Server pages and every API route re-check the session; middleware is not the authorization boundary.

## File flow

1. Browser requests a short-lived Blob client token from `/api/blob/upload` (session required).
2. Browser uploads directly to Vercel Blob (`readvault/uploads/...` or `readvault/story-images/...`), avoiding Vercel Functions' small body limit.
3. Browser posts metadata + Blob URL to `/api/books` or `/api/stories/[id]/images`; the server verifies ownership and Blob existence.
4. PDFs are read from the Blob URL by PDF.js; the reader caches them in the browser Cache API for offline use.
5. Deletes remove the database row and the Blob file.

## PDF reader

`src/components/pdf-reader.tsx` dynamically imports PDF.js, renders the current page to a canvas, and provides page navigation, zoom, fit, fullscreen, keyboard controls, debounced progress, and localStorage progress fallback. The opening curtain and page-turn animation use `src/app/globals.css`.

## Story Time

- Story editor at `src/components/story-editor.tsx`; optional AI draft via `/api/ai/story` (OpenAI-compatible DeepSeek/OpenAI).
- Story reader at `src/components/story-reader.tsx`; page-by-page, read-aloud via SpeechSynthesis, print/save PDF, saved progress, storybook curtain/page-turn.
- Images upload directly to Blob, then attach to a story cover/page through the authenticated image route.
- Copyright guardrails: original wording only; no official characters/artwork/scripts.

## PWA

- `public/manifest.webmanifest`, `public/sw.js`, icons in `public/icons`.
- Service worker registers in production; caches the app shell, static assets, `/api/books` for offline library, and the PDF.js worker.
- PDFs are cached by the reader in `readvault-pdfs`; story pages and images depend on the app shell/network cache.
- HTTPS is required for installation on iPhone.

## Future hardening

- RLS with transaction-local user ids
- Private Blob storage / signed URLs
- Email verification and password reset
- Story/book sync status and conflict handling
- Backups, monitoring, and upload quotas
- Tests for store integration and auth flows
