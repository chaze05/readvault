# ReadVault

A local-first personal PDF library built with Next.js, TypeScript, SQLite, and local file storage.

## Requirements

- Node.js 22 LTS (22.13+ recommended)
- npm
- Windows, macOS, or Linux

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

The SQLite database is created automatically at `data/readvault.db`. Uploaded PDFs are stored in `data/uploads/`.

## Current functionality

- Responsive library dashboard with an empty state for a new library
- Search and category filtering
- Upload PDF files
- Local SQLite metadata storage
- Local PDF file storage
- Browser-based PDF viewing (PDF.js reader is the next milestone)
- Reading progress updates
- Recently Read view backed by saved progress
- Mobile bottom navigation
- Delete books and their uploaded files

## Project documentation

- [PROJECT_PLAN.md](PROJECT_PLAN.md) — MVP scope, phases, acceptance criteria
- [ARCHITECTURE.md](ARCHITECTURE.md) — layers, routes, schema, storage, migration notes
- [AGENTS.md](AGENTS.md) — coding conventions and verification workflow
- [CHANGELOG.md](CHANGELOG.md) — completed milestones

The original plan is stored at `docs/ReadVault_Project_Plan.pdf`.

## Important deployment note

This starter is intended for local development on your own computer. The SQLite database and uploaded PDFs live on the local filesystem. Do not deploy this exact storage configuration to Vercel and expect persistent storage.

Before public or multi-device deployment, migrate the repository implementation to Supabase PostgreSQL and Supabase Storage (or another persistent database/object-storage provider). Keep uploaded files private and serve them through authenticated, short-lived access.

## Project structure

- `src/app`: routes and pages
- `src/components`: UI components
- `src/lib`: SQLite data access and helpers
- `data`: local database and uploads (ignored by Git)
