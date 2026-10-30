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
| `/reader/[id]` | Book reader shell and progress control |
| `GET /api/books` | List books, newest activity first |
| `POST /api/books` | Multipart upload + metadata |
| `DELETE /api/books/[id]` | Delete row and stored file |
| `GET /api/books/[id]/file` | Stream the PDF inline |
| `PATCH /api/books/[id]/progress` | Save current page and derive status |

All database routes are Node runtime and dynamic.

## Database

SQLite file: `data/readvault.db` (WAL mode, foreign keys on, 5s busy timeout).

Current `books` table:

- `id` integer primary key
- `title`, `author`, `category`, `description`
- `file_name`, `file_path`
- `total_pages`, `current_page`, `status` (`not_started`, `reading`, `completed`)
- `cover_color`
- `created_at`, `updated_at`

`rowToBook` maps snake_case rows to the `Book` type.

The connection is opened lazily with `getDb()` so Next build workers do not race to seed or lock the database. The current MVP has no user table; a future `user_id` column will be added before cloud migration.

## Upload Flow

1. Client posts multipart form data to `POST /api/books`.
2. Route validates title, file presence, PDF type/extension, and 50 MB limit.
3. Route writes the file to `data/uploads` under a generated name.
4. Route inserts metadata into SQLite.
5. Client refreshes the library.

## Reader and Progress

The current reader renders the PDF API URL in an iframe and exposes a page-number progress control. Progress updates set `current_page`, derive `status`, and bump `updated_at`. Phase 3 replaces the iframe with PDF.js and debounced automatic progress saving.

## Deletion

Delete removes the database row first, then the stored file if it exists. A future hardening pass should reconcile partial failures (row deleted but file missing, or file deletion failure) and clean orphan files.

## Future Migration

The repository/storage boundaries are intended to keep the UI independent of SQLite and local files. Cloud migration will:

- Move metadata to Supabase PostgreSQL with UUIDs and `user_id`.
- Move PDFs to private Supabase Storage with short-lived URLs.
- Add Supabase Auth and RLS.
- Replace `src/lib/db.ts` with repository implementations without changing the UI contracts.
