# ReadVault

A local-first personal PDF library built with Next.js, TypeScript, SQLite, local file storage, and PDF.js. Upload books, organize them, read them in the app, and keep reading when you are offline.

## Features

- Upload, edit, and delete PDF books
- Search, filter by category, and sort by recent activity, title, or author
- Duplicate detection by SHA-256 file hash
- Embedded PDF.js reader with page navigation, zoom, fit width, fullscreen, and keyboard arrows
- Automatic reading-progress saving and resume
- Recently Read view
- Installable PWA with an offline app shell and cached PDFs
- Responsive desktop layout and mobile bottom navigation

## Requirements

- Node.js 22.13 or newer (required by the current PDF.js release)
- npm

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

`npm install` also copies the PDF.js worker into `public/`. The SQLite database is created automatically at `data/readvault.db`; uploaded PDFs go to `data/uploads/`.

## Tests and checks

```bash
npm test
npm run lint
npm run build
```

## PWA and offline reading

The service worker registers in production builds only. To test offline behavior on the same machine:

```bash
npm run build
npm run start
```

Then open a book once while online. The reader shows **Offline ready** after the PDF and reader shell are cached. Turn off Wi-Fi or use browser offline mode, reload, and the book should still open.

### Install on iPhone

Service workers require **HTTPS**. `http://localhost` is a secure context only on the computer itself; a phone visiting `http://192.168.x.x:3000` will not register the service worker.

1. Run the production build (`npm run build && npm run start`).
2. Expose it over HTTPS, for example with a tunnel:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
   or any HTTPS tunnel/deployment URL.
3. On the iPhone, open the HTTPS URL in Safari.
4. Tap **Share → Add to Home Screen**.
5. Open ReadVault from the Home Screen, open a book once while online, wait for **Offline ready**, then test in Airplane Mode.

Offline caveats:

- iOS may evict cached files under storage pressure. ReadVault requests persistent storage, but iOS can still clear it.
- Cached books are readable offline; uploads and metadata changes need a connection.
- The tunnel/PC must be running for online use. Data stays on the computer running the app.
- A tunnel URL is tied to the PWA origin. If the URL changes, reinstall the PWA.
- For a permanent multi-device app, migrate metadata and PDFs to Supabase (the future phase in the plan).

## Project structure

- `src/app`: routes, API handlers, reader, offline page
- `src/components`: library, dialogs, reader, mobile navigation, PWA registration
- `src/lib`: SQLite, validation, hashing, storage helpers
- `public`: manifest, service worker, icons, generated PDF.js worker
- `data`: local database and uploads (git-ignored)
- `docs`: project plan and supporting documentation

## Documentation

- [PROJECT_PLAN.md](PROJECT_PLAN.md) — scope, phases, acceptance criteria
- [ARCHITECTURE.md](ARCHITECTURE.md) — layers, schema, storage, offline design
- [AGENTS.md](AGENTS.md) — coding conventions and verification workflow
- [docs/PWA_iPhone.md](docs/PWA_iPhone.md) — iPhone install/offline checklist
- [CHANGELOG.md](CHANGELOG.md) — milestones
- `docs/ReadVault_Project_Plan.pdf` — original plan
- `docs/ReadVault_Story_Time_Feature_Specification.pdf` — planned Story Time feature (not implemented yet)

## Deploy to Vercel with Blob storage

The live deployment uses **Vercel Blob** for PDFs and a small public `books.json` index, because Vercel Functions have a small request body limit and no persistent local disk. Uploads go from the browser directly to Blob; the server only writes metadata.

Environment variables for the live project:

| Variable | Value |
| --- | --- |
| `BLOB_READ_WRITE_TOKEN` | Added by connecting a Vercel Blob store |
| `STORAGE_DRIVER` | `blob` |
| `NEXT_PUBLIC_STORAGE_DRIVER` | `blob` |
| `AUTH_SECRET` | Not needed yet (no accounts) |
| `GEMINI_API_KEY` | Not needed yet (Story Time AI is future work) |

Local development stays on SQLite when the storage driver variables are blank.

**Privacy note:** the current live demo uses public Blob URLs and a public metadata index so it can run without authentication. Do not upload sensitive documents. Private storage, signed URLs, and per-user auth belong to the cloud-auth phase.

### Deploy steps

```bash
vercel link
vercel storage create readvault-blobs --type blob --access public
vercel storage connect readvault-blobs --auth token --add-rw-token
vercel env add STORAGE_DRIVER production --value blob --yes
vercel env add NEXT_PUBLIC_STORAGE_DRIVER production --value blob --yes
vercel --prod
```

## Deployment note

This starter is local-first. SQLite and local uploads do not persist on Vercel. Before a public or multi-device deployment, migrate the database and PDFs to managed persistent services, add authentication, and verify private storage access. See the future phases in `PROJECT_PLAN.md`.
