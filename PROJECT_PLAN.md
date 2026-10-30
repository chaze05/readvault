# ReadVault Project Plan

Source: `docs/ReadVault_Project_Plan.pdf`

## Product

A local-first, single-user PDF library. Upload, organize, read, and track PDF books from one clean web interface. The first release runs locally: SQLite metadata and PDF files on the local filesystem. Cloud accounts, multi-device sync, and advanced reading features come only after the local MVP is stable.

## MVP Goals

- Upload PDFs and maintain a searchable personal library.
- Open PDFs inside ReadVault.
- Remember the last page and resume.
- Organize with categories; collections later.
- Responsive desktop and mobile browsing.

## MVP Scope

1. Upload, list, edit, and delete PDF books.
2. Embedded PDF reader.
3. Automatic reading-progress save and restore.
4. Search, filter, and sort.
5. Keep data and files local until cloud migration starts.

Out of scope for the first MVP: multi-user SaaS, sharing, AI summaries/chat, text-to-speech, EPUB, cloud sync, native apps, complex analytics.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- SQLite locally; Supabase PostgreSQL later
- Local filesystem storage; Supabase Storage later
- PDF.js for the embedded reader
- Zod for validation; React Hook Form when needed
- Git + GitHub
- Local development first; Vercel after cloud migration

## Phases

1. **Foundation and dashboard** — run starter, design tokens, responsive layout, navigation, dashboard states, docs, lint/build.
2. **Local library and CRUD** — SQLite schema/migrations, repository/storage layers, upload validation, create/edit/delete/search/filter/sort, duplicate detection.
3. **PDF reader** — PDF.js, navigation, zoom, fit modes, fullscreen, keyboard controls, search/outline, mobile testing.
4. **Reading intelligence** — auto-save current page with debounce, resume, bookmarks/notes, status, optional sessions/statistics.
5. **Organization** — categories, collections, tags, metadata/covers.
6. **Cloud migration** — Supabase Postgres and Storage, Auth, RLS, file/record migration.
7. **Multi-device and PWA** — installable app, sync, conflict handling, offline shell.
8. **Production readiness** — deployment, limits, security, monitoring, backup, acceptance/regression/security tests.

Planning estimate for the full roadmap: 20–32 working days. The local MVP comes first.

## MVP Acceptance

- A valid PDF uploads and appears in the library.
- The user can search for and open it.
- The reader navigates between pages.
- Progress is saved and restored after closing/reopening.
- Metadata can be edited and the book deleted.
- Deleting a book removes its stored PDF, with safe error handling.

## Current Status

- Starter inspected, installed, linted, and built.
- Phase 1 foundation and navigation in progress.
