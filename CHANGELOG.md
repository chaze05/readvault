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
