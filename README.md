# ReadVault

**Live:** https://readvault-ten.vercel.app  
**Source:** https://github.com/chaze05/readvault

A private, multi-user PDF library and family Story Time app. Sign in, upload and edit your books, read them in a PDF.js reader with saved progress and offline caching, and write illustrated storybooks with optional read-aloud and AI drafting.

## Features

- Email/password accounts with private per-user libraries.
- Public home page, invitation-only sign in, and protected app routes; public signup stays closed.
- Administrators can create family accounts with single-use invitation links or temporary passwords that force a password change at first sign-in.
- Security settings: change password, sign out all devices, and manual one-time reset links issued by an administrator.
- Reading preferences (PDF zoom, Story Time text size, reduced motion), data export, and account/content deletion.
- PDF CRUD: upload, list, search, filter, sort, edit metadata, delete.
- Duplicate detection by SHA-256 hash per account.
- PDF.js reader: page navigation, zoom, fit width, fullscreen, keyboard arrows, automatic progress, resume.
- Story Time: original or movie-inspired stories, multi-page editor, page reorder/delete, cover and page illustrations, read-aloud, print/save PDF.
- Optional AI story drafting through any OpenAI-compatible API (DeepSeek by default), configured in admin Settings with an encrypted key and a per-user daily limit; parent review before saving.
- PWA: installable app shell and offline reading for PDFs and opened stories.
- Warm storybook opening curtain and page-turn transitions, with reduced-motion support.
- Page bookmarks with optional notes, whole-book/story favorites, and a dedicated Bookmarks page; JSON export includes bookmarks and favorites.
- Mobile PDF reader: phone-sized screens auto-open an immersive fit-width view with high-DPI rendering, vertical scrolling, swipe page turns, and pinch/zoom.

## Stack

- Next.js 15 App Router, TypeScript, Tailwind CSS
- PostgreSQL (Neon in production, Docker locally) with `pg`
- Vercel Blob for PDFs and story images
- Custom email/password auth: bcrypt hashing + signed HttpOnly JWT cookies (`jose`)
- PDF.js (`pdfjs-dist`)
- Optional OpenAI-compatible AI endpoint (DeepSeek/OpenAI)
- Vitest
- Vercel + Neon + Blob free tiers

## Local setup

Requirements: Node.js 22.13+, a Postgres database, and a Vercel Blob token.

1. Install dependencies:

   ```bash
   npm.cmd install
   ```

2. Create `.env.local` with the variables below. Required: `DATABASE_URL`, `ADMIN_DATABASE_URL`, `AUTH_SECRET`, `APP_URL`, `SETTINGS_ENCRYPTION_KEY`, and `BLOB_READ_WRITE_TOKEN`; the `AI_*` variables are optional.

   | Variable | Purpose |
   | --- | --- |
   | `DATABASE_URL` | Postgres connection used by the app (Neon or local) |
   | `ADMIN_DATABASE_URL` | Migration/CLI connection (same URL for local) |
   | `AUTH_SECRET` | 32+ random characters for session JWTs |
   | `APP_URL` | Public base URL used in invite and reset links (defaults to `http://localhost:3000`) |
   | `SETTINGS_ENCRYPTION_KEY` | 32-byte base64 key that encrypts the AI key saved in admin Settings |
   | `BLOB_READ_WRITE_TOKEN` | Vercel Blob read/write token |
   | `GEMINI_MODEL` | Not used by this build |
   | `AI_ALLOWED_HOSTS` | Optional comma-separated host allowlist for custom AI provider URLs beyond DeepSeek/OpenAI |
   | `AI_API_KEY` | Optional server-side fallback; normally enter the key in admin Settings instead |
   | `AI_BASE_URL` | Optional fallback base URL: `https://api.deepseek.com` or `https://api.openai.com/v1` |
   | `AI_MODEL` | Optional fallback model: `deepseek-chat` or `gpt-4o-mini` |

   Generate a settings encryption key without committing it:

   ```bash
   node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
   ```

   Store the output in `.env.local` and the host's production environment. AI provider keys are entered in **Settings → AI story drafts** by an administrator, encrypted with `SETTINGS_ENCRYPTION_KEY`, and never committed to git. The `AI_*` variables are a server-side fallback when no database key is saved.

   The current `.env.local` can point at Neon and Blob, or use the optional local Docker database on port 5434.

3. Apply the schema:

   ```bash
   npm.cmd run db:migrate
   ```

   Migrations are additive; `0004_bookmarks_favorites.sql` adds the bookmarks table and favorite flags.

   Local Docker alternative:

   ```bash
   npm.cmd run db:up
   ```

4. Start the app:

   ```bash
   npm.cmd run dev
   ```

5. Open http://localhost:3000. Public signup is closed. On a brand-new local database, temporarily set `ALLOW_SIGNUPS=true` to create the owner account, grant it admin, then remove the flag:

   ```bash
   npm.cmd run admin:grant -- you@example.com
   ```

   After that, create family accounts from **Settings → Family**. Restart the dev server after changing environment values.

> The app uses Vercel Blob for all PDF/image storage, including local development. A Blob token is required even when the database is local.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm.cmd run dev` | Start development |
| `npm.cmd run build` | Production build + type check |
| `npm.cmd test` | Vitest |
| `npm.cmd run lint` | ESLint |
| `npm.cmd run db:migrate` | Apply pending migrations |
| `npm.cmd run db:migrate:prod` | Apply migrations using process env (Vercel/Neon) |
| `npm.cmd run admin:grant -- <email>` | Grant an existing account admin access |
| `npm.cmd run account:reset-link -- <email>` | Print a manual one-time password reset link (expires in 1 hour) |
| `npm.cmd run db:up` / `db:down` | Optional local Postgres on port 5434 |

## Accounts and security

- Public signup is closed. Accounts are invitation-only unless `ALLOW_SIGNUPS=true` is set temporarily for local bootstrap or intentional testing.
- Administrators create family accounts in **Settings → Family** using either a single-use invitation link (valid 24 hours) or a temporary password. Temporary-password accounts must choose a new password before using the app.
- Password reset and invitation links are issued manually; there is no email delivery. An admin can generate a reset link from **Settings → Family** or with `npm.cmd run account:reset-link -- <email>`. Reset links are valid for 1 hour and work once.
- Creating a new invite or reset link invalidates the previous unused link of the same purpose. Raw links are shown once; only SHA-256 token hashes are stored.
- Grant the owner/admin account with `npm.cmd run admin:grant -- <email>`. Admin-only Settings sections (Family and AI story drafts) are re-checked on the server.
- Sessions are 30-day HS256 JWTs in an HttpOnly, SameSite=Lax cookie, Secure in production. Every authenticated data request compares the JWT session version with `users.session_version` in `getCurrentUser`; changing or resetting a password, or choosing **Sign out all devices**, increments it and invalidates older sessions.
- Settings also provides reading preferences, data export, and account/content deletion.
- Data export includes books, stories, bookmarks, favorites, and reading preferences; account/content deletion removes bookmarks and favorites through database cascades.

## Bookmarks, favorites, and mobile reader

- In the PDF and Story readers, the bookmark control quick-saves the current page. There is one bookmark per user and page; clicking a filled bookmark can open the Bookmarks page or remove it.
- Edit or clear a bookmark note (500 characters max) on **Bookmarks → Pages**. Bookmark links open `/reader/<id>?page=<n>` or `/story-time/<id>?page=<n>`; the page parameter is validated and clamped to the document.
- Favorite whole books and stories with the heart on Library/Story Time cards and in both readers. Favorites appear under **Bookmarks → Favorites**.
- On phones (coarse pointer, short viewport side 700px or less), PDFs open in an immersive full-viewport reader. It uses fit-width high-DPI rendering, scrolls tall pages vertically, turns one page on a horizontal swipe at fit, and supports pinch or button zoom from 0.5× to 3×. When zoomed beyond 1.05×, horizontal drags pan instead of paging; **Fit** restores swipe paging. Closing the reader returns to the normal view at the same page.
- Phone auto-immersive mode always starts at **Fit** width, even when the saved PDF zoom preference is 75%, 125%, or 150%, so the page never overflows horizontally or blocks swipe paging on open. The saved zoom still applies in the normal desktop reader.
- iPhone Safari may keep its own browser chrome even in immersive mode; Add to Home Screen for a fully chrome-free view. Phase 2 adds no environment variables.

## AI story drafts

- Enter the provider API key in **Settings → AI story drafts** as an administrator. It is write-only in the UI, encrypted at rest with `SETTINGS_ENCRYPTION_KEY`, and never committed to git.
- DeepSeek and OpenAI presets are built in. Custom providers must use HTTPS and be listed in `AI_ALLOWED_HOSTS`; localhost and private IP hosts are blocked.
- The daily limit is 10 drafts per user per UTC day by default and is configurable from 1 to 100 in admin Settings. `connection_failed` and `provider_rejected` failures are refunded; `timeout` and `invalid_response` failures consume the daily slot.
- `AI_API_KEY` (with optional `AI_BASE_URL`/`AI_MODEL`) remains a server-side environment fallback when no key is saved in the database.

## Auth and data isolation

- Passwords are bcrypt-hashed. User-owned rows are scoped by the signed-in user id; admin-only queries such as family account listing and AI settings are explicitly authorized with `requireAdmin()`.
- `src/middleware.ts` protects `/dashboard`, `/library`, `/recent`, `/bookmarks`, `/settings`, `/reader`, and `/story-time`; server routes still re-check auth.
- v1 has no email delivery or email verification. Reset and invitation links must be shared manually.

## Vercel deployment

Production env vars:

- `DATABASE_URL` — Neon pooled connection string
- `AUTH_SECRET` — 32+ random characters
- `APP_URL` — public production URL, `https://readvault-ten.vercel.app`, used in manual invite/reset links
- `SETTINGS_ENCRYPTION_KEY` — 32-byte base64 key; required to save AI settings
- `BLOB_READ_WRITE_TOKEN` — from the connected Blob store
- `AI_ALLOWED_HOSTS` — optional custom AI provider host allowlist
- `AI_API_KEY` — optional server fallback; prefer saving the key in admin Settings
- `ALLOW_SIGNUPS` — leave unset/false to keep public signup closed

Apply the schema from a trusted machine with `npm.cmd run db:migrate:prod` using those process env values. Deploy with `vercel --prod` or push to the connected GitHub repository.

### Phase 2 rollout

1. Run `npm.cmd run db:migrate:prod` with the production environment. Expect `0004_bookmarks_favorites.sql` to be applied, or skipped if it is already recorded in `schema_migrations`.
2. Deploy after review.
3. Smoke-test bookmark save/note/open/remove, favorites from cards and readers, and the mobile immersive swipe/pinch/fit flows with temporary data. Do not modify owner content. No new environment variables are required.

## PWA and offline

- The service worker registers in production.
- Install from Safari on iPhone: open the HTTPS URL, Share → Add to Home Screen.
- Open a PDF or story once while online; it is cached for offline reading.
- iOS may evict caches under storage pressure; uploads/edits need a connection. See `docs/PWA_iPhone.md`.

## Privacy

The current Blob files are public-but-unguessable URLs, and the app is a personal demo. Do not upload sensitive documents yet. Private Blob access, signed URLs, and tighter retention belong to the next hardening pass.

## Verification

```bash
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

The full local/live smoke covers invite-only sign-in, PDF upload/read/edit/delete, Story Time create/edit/cover/page images/read, bookmark save/note/open/remove, favorites from cards and readers, the mobile immersive swipe/pinch/fit flows, and sign-out protection. Temporarily set `ALLOW_SIGNUPS=true` only when intentionally testing the closed signup path.

## Docs

- [PROJECT_PLAN.md](PROJECT_PLAN.md) — scope, phases, current status
- [ARCHITECTURE.md](ARCHITECTURE.md) — data model, auth, storage, Story Time
- [AGENTS.md](AGENTS.md) — coding conventions
- [docs/PWA_iPhone.md](docs/PWA_iPhone.md) — install/offline checklist
- [CHANGELOG.md](CHANGELOG.md) — milestones
