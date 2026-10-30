# ReadVault Agent Guide

ReadVault is a local-first personal PDF library. Keep the MVP single-user, local, and free to run: SQLite metadata plus PDFs on the local filesystem. Supabase, authentication, and cloud sync belong to the later cloud-migration phase.

## Commands

- `npm.cmd install` — install dependencies (PowerShell blocks `npm.ps1` on this machine)
- `npm.cmd run dev` — start the dev server at http://localhost:3000
- `npm.cmd run lint` — ESLint 9 flat config
- `npm.cmd run build` — production build and type check
- `npm.cmd run start` — production server

## Stack

- Next.js 15 App Router, React 19, TypeScript
- Tailwind CSS 3 with semantic tokens in `tailwind.config.ts` (`ink`, `muted`, `paper`, `line`, `brand`, `brand-soft`)
- `better-sqlite3` for SQLite
- Local files in `data/uploads`; SQLite database at `data/readvault.db`
- `lucide-react` icons

## Architecture Rules

- Keep presentation, application/data access, and storage separate. Components must not construct file paths or run SQL.
- Database access goes through `src/lib/db.ts`. Use `getDb()` lazily; never open SQLite at module scope or during build. Build workers opening the database concurrently cause `SQLITE_BUSY`.
- API routes are the application boundary for uploads, progress, file serving, and deletion.
- Validate all uploads server-side: PDF extension/MIME, 50 MB limit, safe generated filenames, and no path traversal.
- Use parameterized SQL. Never trust `id`, filenames, or form values.
- Keep `better-sqlite3` in `serverExternalPackages` in `next.config.ts`.
- Route handlers that touch the database use `export const runtime = "nodejs"` and `export const dynamic = "force-dynamic"`.
- Next 15 route handlers receive `params` as a Promise; await it.
- Do not add Supabase, authentication, cloud storage, or multi-user code before the cloud-migration phase.
- Avoid new dependencies without a clear reason. Use the existing stack first.

## Data Safety

- `data/*.db*` and `data/uploads/*` are git-ignored. Never commit user books.
- Deleting a book must remove both the database row and its file; handle partial failures.
- Do not run destructive database commands without explaining them first.
- Back up `data/readvault.db` and `data/uploads` before risky migrations.

## Verification

Before calling a milestone complete:

1. `npm.cmd run lint`
2. `npm.cmd run build`
3. Smoke test upload → open → progress save → reopen → delete when the change touches those flows.

Tests are not wired yet. Add Vitest when the Phase 2 validation/repository work begins; pure logic should be test-driven.

## Git

Commit small, stable milestones. Do not commit secrets or local data. Keep the starter baseline and each phase reviewable.
