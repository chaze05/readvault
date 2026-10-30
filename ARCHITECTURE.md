# ReadVault Architecture

## Layers

- **Presentation:** `src/app` pages/layouts and `src/components` UI.
- **Application:** API route handlers for books, uploads, file serving, progress, and deletion.
- **Data access:** `src/lib/db.ts` owns the SQLite connection, schema, and row mapping.
- **Storage:** `data/uploads` holds PDFs under generated filenames; the database stores the absolute path.

Components call typed HTTP endpoints; they do not run SQL or construct storage paths.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Overview dashboard |
| `/library` | Full library |
| `/recent` | Books with saved reading progress |
| `/bookmarks` | Placeholder for page bookmarks |
| `/settings` | Placeholder for future preferences/cloud settings |
| `/offline` | Offline fallback shell |
| `/reader/[id]` | PDF.js reader shell and automatic progress |
| `GET /api/books` | List books, newest activity first |
| `POST /api/books` | Multipart upload + metadata + duplicate hash check |
| `PATCH /api/books/[id]` | Edit title, author, and category |
| `DELETE /api/books/[id]` | Delete row and stored file |
| `GET /api/books/[id]/file` | Serve the PDF inline |
| `PATCH /api/books/[id]/progress` | Save current page and total pages, derive status |

All database routes are Node runtime and dynamic.

## Database

SQLite file: `data/readvault.db` (WAL mode, foreign keys on, 5s busy timeout).

Current `books` table:

- `id` integer primary key
- `title`, `author`, `category`, `description`
- `file_name`, `file_path`, `file_hash`
- `total_pages`, `current_page`, `status` (`not_started`, `reading`, `completed`)
- `cover_color`
- `created_at`, `updated_at`

`rowToBook` maps snake_case rows to the `Book` type. `file_hash` is a SHA-256 of the uploaded PDF and has a partial unique index for duplicate rejection.

The connection is opened lazily with `getDb()` so Next build workers do not race to seed or lock the database. The current MVP has no user table; a future `user_id` column will be added before cloud migration.

## Upload Flow

1. Client posts multipart form data to `POST /api/books`.
2. Route validates title/author/category with Zod, file presence, PDF type/extension, 50 MB limit, and the `%PDF-` signature.
3. Route hashes the bytes with SHA-256 and rejects duplicates with `409`.
4. Route writes the file to `data/uploads` under a generated name via `src/lib/storage.ts`.
5. Route inserts metadata into SQLite; if the insert fails, the file is removed.
6. Client refreshes the library.

## Reader and Progress

`src/components/pdf-reader.tsx` dynamically imports PDF.js, renders pages to a canvas, and provides page navigation, zoom, fit width, fullscreen, and keyboard arrows. Page changes are debounced and saved to `PATCH /api/books/[id]/progress`, which also stores the detected total page count and derives reading/completed status.

When a PDF is opened, the reader fetches it once and stores the response in the `readvault-pdfs` Cache API cache. Later offline opens read the PDF from that cache. The reader also warms a full HTML navigation of the reader route so the service worker has a shell for offline reloads.

## PWA and Offline

- `public/manifest.webmanifest` describes the standalone app and icons.
- `src/components/pwa-register.tsx` registers `public/sw.js` in production and requests persisted storage.
- The service worker precaches the app shell, offline page, manifest, icons, and PDF.js worker. Navigation is network-first with cached/offline fallback; static assets are cache-first; the library API is network-first.
- PDF files are deliberately cached by the reader through the Cache API (`readvault-pdfs`), not by the service worker.
- Service workers require HTTPS. See `docs/PWA_iPhone.md` for the iPhone/tunnel workflow.

## Deletion

Delete removes the database row first, then the stored file if it exists. A future hardening pass should reconcile partial failures (row deleted but file missing, or file deletion failure) and clean orphan files.

## Future Migration

The repository/storage boundaries are intended to keep the UI independent of SQLite and local files. Cloud migration will:

- Move metadata to Supabase PostgreSQL with UUIDs and `user_id`.
- Move PDFs to private Supabase Storage with short-lived URLs.
- Add Supabase Auth and RLS.
- Replace `src/lib/db.ts` with repository implementations without changing the UI contracts.
