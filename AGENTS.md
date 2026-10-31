# ReadVault Agent Guide

ReadVault is a multi-user PDF library and family Story Time app. Accounts, metadata, PDFs, story images, and reading progress are private per user. Production runs Next.js on Vercel, Postgres on Neon, and files on Vercel Blob.

## Commands

- `npm.cmd install` — install dependencies (also copies the PDF.js worker)
- `npm.cmd run dev` — start the dev server
- `npm.cmd test` — Vitest
- `npm.cmd run lint` — ESLint 9 flat config
- `npm.cmd run build` — production build and type check
- `npm.cmd run db:migrate` — apply pending migrations from `.env.local`
- `npm.cmd run db:migrate:prod` — apply migrations using process env
- `npm.cmd run admin:grant -- <email>` — grant an existing account admin access
- `npm.cmd run account:reset-link -- <email>` — print a manual one-time reset link (expires in 1 hour)
- `npm.cmd run db:up` / `db:down` — optional local Postgres on port 5434

## Stack rules

- Next.js 15 App Router. Middleware is `src/middleware.ts` (not the Next 16 `proxy.ts` convention).
- Postgres via `pg` (`src/lib/db.ts`). No SQLite. Use parameterized `$1` queries.
- Auth: bcrypt passwords + `jose` JWTs. Session token code in `src/lib/session.ts` (edge-safe); cookie helpers in `src/lib/session-cookies.ts`.
- Files: Vercel Blob only. Client uploads use `@vercel/blob/client`; server metadata is stored in Postgres.
- PDF reader: `pdfjs-dist` dynamically imported in `src/components/pdf-reader.tsx`; worker copied by `scripts/copy-pdf-worker.mjs`. Mobile swipe/pinch classification lives in `src/lib/reader-gestures.ts`; keep it covered by tests.
- PWA: `public/sw.js` registers in production only. Test with `npm run build && npm run start`, not `next dev`.
- AI: `src/app/api/ai/story/route.ts` resolves the admin-saved key from `app_settings` (encrypted with `SETTINGS_ENCRYPTION_KEY`) and falls back to a server-only `AI_API_KEY`. Enter provider keys in admin Settings, never in client code, logs, or git.

## Security and data rules

- Every API route, server action, and data-access path must call the DB-validated `getCurrentUser()`, `requireActiveUser()`, or `requireAdmin()` helpers. Never use `getSession()` for data access or authorization; it is reserved for middleware and the expired-cookie marker. User-owned queries must be scoped by the authenticated user id; admin/global queries must be explicitly authorized with `requireAdmin()`.
- Never accept a user id from the client.
- Session-version rule: `getCurrentUser()` loads the user and rejects the JWT when `users.session_version` differs from the token's `sv`. Password changes, reset/invite completion, and Sign out all increment `session_version`. Preserve this check on every authenticated path.
- Admin authorization: use `requireAdmin()` (active user with `is_admin`). Hiding admin UI is not authorization; Family and AI settings actions must re-check server-side. Accounts with `must_change_password` are not active until the password is changed.
- Tokens: password reset links expire after 1 hour and invitation links after 24 hours. Both are single-use, stored only as SHA-256 hashes, and a new link invalidates the previous unused link for that purpose. Raw links are returned once and are never emailed; share them manually.
- Secrets: `SETTINGS_ENCRYPTION_KEY` is a 32-byte base64 server-only key used to encrypt the AI provider key at rest. Never expose `AUTH_SECRET`, `BLOB_READ_WRITE_TOKEN`, `AI_API_KEY`, decrypted keys, or token ciphertext/hashes in the browser, logs, git, or chat. Reset/invite URLs may be shown once to the signed-in administrator in the Family UI (or printed by the reset CLI) for manual sharing; never send them to unintended recipients or record them in logs, git, or chat. Keep `.env.local` and `.local-credentials.txt` uncommitted.
- AI provider URLs must use HTTPS; localhost/private IPs are blocked and custom hosts require `AI_ALLOWED_HOSTS`. Do not weaken `validateAiBaseUrl`.
- AI usage: default 10 drafts per user per UTC day, configurable from 1 to 100 in admin Settings. Keep reservation/refund logic atomic.
- Story/book images and PDFs are Blob URLs; validate ownership before attaching/deleting.
- Middleware is an optimistic redirect only; server routes still re-check auth.
- Signups are closed unless `ALLOW_SIGNUPS=true`; set it only for intentional local bootstrap/testing. Never open public signup in production. There is no email delivery or email verification yet; keep accounts invite-only.
- Blob URLs are currently public-but-unguessable. Do not treat them as private storage; add private Blobs/signed URLs before sensitive use.

## Story Time rules

- Original or movie-inspired only; never reproduce copyrighted scripts, dialogue, characters, or official artwork.
- AI drafts are reviewed and edited by the parent before saving; no auto-publish.
- AI should return 4–8 short pages; no generated images (users upload their own).
- Story reader uses the shared storybook curtain/page-turn classes and browser SpeechSynthesis with graceful fallback.

## Bookmarks, favorites, and mobile reader rules

- Bookmarks are page-number based and user-scoped: one bookmark per user/page, optional note up to 500 characters, page bounds enforced per book/story. Validate target ownership; deleting a book, story, or user cascades bookmarks. Favorites are whole-book/whole-story `is_favorite` flags.
- Notes are edited only on `/bookmarks`; the readers provide quick-save, open, and remove. Keep bookmark/favorite controls out of anchor text and never nest interactive elements.
- Export schema version 2 includes `isFavorite` on books/stories and `bookmarks` with kind, targetId, title, pageNumber, note, and timestamps. Never export passwords, tokens, session data, or another user's rows.
- Mobile reader: phone-sized coarse-pointer screens (short side <=700px) auto-open immersive fit-width mode. Render high-DPI with a 2x cap, keep vertical scrolling native, page on one-finger horizontal swipes only at fit (>=50px and >=1.5x vertical), allow 0.5x-3x zoom, and pan instead of paging above 1.05x. iPhone Safari chrome may remain unless added to the Home Screen.
- Phase 2 adds no environment variables. Apply `0004_bookmarks_favorites.sql` before deploying.

## Verification

Before a milestone is done:

1. `npm.cmd test`
2. `npm.cmd run lint`
3. `npm.cmd run build`
4. Smoke-test invitation-only sign-in → PDF upload/read/edit/delete → Story Time create/edit/images/read/delete → Settings password change/sign-out-all → sign-out protection. When account security changes, also verify admin invite/reset links, forced password change, single-use expiry, and session revocation.
5. For bookmark/favorite/mobile-reader changes, smoke-test quick-save/note/open/remove, favorites from cards and readers, and phone immersive swipe/pinch/fit with temporary data.
6. For PWA changes, test the production server and reload a cached book offline.

Commit small milestones. Do not commit `.env.local`, `.neon`, Blob tokens, or user data.
