# Changelog

## 2026-10-30

- Added the ReadVault starter baseline.
- Installed dependencies and committed the lockfile.
- Added ESLint 9 flat config and fixed starter lint issues.
- Made SQLite initialization lazy so the production build no longer hits `SQLITE_BUSY`.
- Set an explicit Next output-file tracing root.
- Removed demo seed books; a new library starts empty.
- Added dedicated Recently Read filtering and empty states.
- Added mobile bottom navigation.
- Split the library UI into stat, continue-reading, book-card, and empty-state components.
- Added AGENTS.md, PROJECT_PLAN.md, ARCHITECTURE.md, and the source PDF.
- Added Zod validation, SHA-256 hashing, storage helpers, and Vitest tests.
- Added duplicate-upload detection (`409`), metadata editing, and library sorting.
- Added automatic progress saving with detected total pages and completion status.
- Replaced the iframe viewer with a PDF.js reader (page navigation, zoom, fit, fullscreen, keyboard arrows).
- Cached opened PDFs for offline reading.
- Added the PWA manifest, icons, service worker, offline page, and production registration.
- Added iPhone PWA/offline setup documentation.
- Received the Story Time feature specification; implementation has not started.

