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
- `npm.cmd run db:up` / `db:down` — optional local Postgres on port 5434

## Stack rules

- Next.js 15 App Router. Middleware is `src/middleware.ts` (not the Next 16 `proxy.ts` convention).
- Postgres via `pg` (`src/lib/db.ts`). No SQLite. Use parameterized `$1` queries.
- Auth: bcrypt passwords + `jose` JWTs. Session token code in `src/lib/session.ts` (edge-safe); cookie helpers in `src/lib/session-cookies.ts`.
- Files: Vercel Blob only. Client uploads use `@vercel/blob/client`; server metadata is stored in Postgres.
- PDF reader: `pdfjs-dist` dynamically imported in `src/components/pdf-reader.tsx`; worker copied by `scripts/copy-pdf-worker.mjs`.
- PWA: `public/sw.js` registers in production only. Test with `npm run build && npm run start`, not `next dev`.
- AI: `src/app/api/ai/story/route.ts` uses an optional OpenAI-compatible endpoint. `AI_API_KEY` is server-only. Never expose it client-side.

## Security and data rules

- Every API route and server action must call `getSession()` and scope every query by `session.userId`.
- Never accept a user id from the client.
- Story/book images and PDFs are Blob URLs; validate ownership before attaching/deleting.
- Middleware is an optimistic redirect only; server routes still re-check auth.
- Keep `AUTH_SECRET` and `BLOB_READ_WRITE_TOKEN` out of git.
- v1 has no email verification or password reset; do not market it as a fully hardened public signup until those exist.
- Blob URLs are currently public-but-unguessable. Do not treat them as private storage; add private Blobs/signed URLs before sensitive use.

## Story Time rules

- Original or movie-inspired only; never reproduce copyrighted scripts, dialogue, characters, or official artwork.
- AI drafts are reviewed and edited by the parent before saving; no auto-publish.
- AI should return 4–8 short pages; no generated images (users upload their own).
- Story reader uses the shared storybook curtain/page-turn classes and browser SpeechSynthesis with graceful fallback.

## Verification

Before a milestone is done:

1. `npm.cmd test`
2. `npm.cmd run lint`
3. `npm.cmd run build`
4. Smoke-test signup → PDF upload/read/edit/delete → Story Time create/edit/images/read/delete → sign-out protection.
5. For PWA changes, test the production server and reload a cached book offline.

Commit small milestones. Do not commit `.env.local`, `.neon`, Blob tokens, or user data.
