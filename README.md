# ReadVault

**Live:** https://readvault-ten.vercel.app  
**Source:** https://github.com/chaze05/readvault

A private, multi-user PDF library and family Story Time app. Sign in, upload and edit your books, read them in a PDF.js reader with saved progress and offline caching, and write illustrated storybooks with optional read-aloud and AI drafting.

## Features

- Email/password accounts with private per-user libraries.
- Public home page, invitation-only sign in, and protected app routes.
- PDF CRUD: upload, list, search, filter, sort, edit metadata, delete.
- Duplicate detection by SHA-256 hash per account.
- PDF.js reader: page navigation, zoom, fit width, fullscreen, keyboard arrows, automatic progress, resume.
- Story Time: original or movie-inspired stories, multi-page editor, page reorder/delete, cover and page illustrations, read-aloud, print/save PDF.
- Optional AI story drafting through any OpenAI-compatible API (DeepSeek by default); parent review before saving.
- PWA: installable app shell and offline reading for PDFs and opened stories.
- Warm storybook opening curtain and page-turn transitions, with reduced-motion support.

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

2. Create `.env.local` from `.env.example` and fill in:

   | Variable | Purpose |
   | --- | --- |
   | `DATABASE_URL` | Postgres connection used by the app (Neon or local) |
   | `ADMIN_DATABASE_URL` | Migration connection (same URL for local) |
   | `AUTH_SECRET` | 32+ random characters for session JWTs |
   | `BLOB_READ_WRITE_TOKEN` | Vercel Blob read/write token |
   | `GEMINI_MODEL` | Not used by this build |
   | `AI_API_KEY` | Optional: DeepSeek/OpenAI-compatible key for story drafts |
   | `AI_BASE_URL` | Optional: `https://api.deepseek.com` or `https://api.openai.com/v1` |
   | `AI_MODEL` | Optional: `deepseek-chat` or `gpt-4o-mini` |

   The current `.env.local` can point at Neon and Blob, or use the optional local Docker database on port 5434.

3. Apply the schema:

   ```bash
   npm.cmd run db:migrate
   ```

   Local Docker alternative:

   ```bash
   npm.cmd run db:up
   ```

4. Start the app:

   ```bash
   npm.cmd run dev
   ```

5. Open http://localhost:3000, create an account, and upload a PDF.

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
| `npm.cmd run db:up` / `db:down` | Optional local Postgres on port 5434 |

## Auth and data isolation

- Accounts are invitation-only by default. Signup is closed unless `ALLOW_SIGNUPS=true`; passwords are bcrypt-hashed.
- Sessions are 30-day HS256 JWTs in an HttpOnly, SameSite=Lax cookie, Secure in production.
- `src/middleware.ts` protects `/dashboard`, `/library`, `/recent`, `/bookmarks`, `/settings`, `/reader`, and `/story-time`.
- Every database query and server action scopes rows by the signed-in user id.
- v1 has no email verification or password reset yet. Add those before opening public signups.

## Vercel deployment

Production env vars:

- `DATABASE_URL` — Neon pooled connection string
- `AUTH_SECRET` — 32+ random characters
- `BLOB_READ_WRITE_TOKEN` — from the connected Blob store
- `AI_API_KEY` — optional, enables the Story Time AI draft button
- `ALLOW_SIGNUPS` — optional; leave unset/false to keep public signup closed

The Neon schema was applied with `npm run db:migrate:prod`. Deploy with `vercel --prod` or push to the connected GitHub repository.

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

The full local/live smoke covers invite-only sign-in, PDF upload/read/edit/delete, Story Time create/edit/cover/page images/read, and sign-out protection. Temporarily set `ALLOW_SIGNUPS=true` only when intentionally testing the closed signup path.

## Docs

- [PROJECT_PLAN.md](PROJECT_PLAN.md) — scope, phases, current status
- [ARCHITECTURE.md](ARCHITECTURE.md) — data model, auth, storage, Story Time
- [AGENTS.md](AGENTS.md) — coding conventions
- [docs/PWA_iPhone.md](docs/PWA_iPhone.md) — install/offline checklist
- [CHANGELOG.md](CHANGELOG.md) — milestones
