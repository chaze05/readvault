# ReadVault on iPhone — PWA & Offline Checklist

## Why HTTPS is required

Service workers and the Cache API require a secure context. `localhost` counts on the computer, but not when the iPhone visits your PC over a LAN IP (`http://192.168.x.x`). Use an HTTPS tunnel or a deployed HTTPS URL.

## Quick test

1. On the PC:
   ```bash
   npm run build
   npm run start
   ```
2. In another terminal, expose port 3000 over HTTPS:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
   Copy the `https://...` URL.
3. On the iPhone, open that URL in **Safari**.
4. Tap **Share → Add to Home Screen**.
5. Open ReadVault from the Home Screen.
6. Upload a PDF and open it once. Wait for the reader to show **Offline ready**.
7. Turn on Airplane Mode, reopen ReadVault, and open the same book. It should render from the cache.

## What is cached

- App shell pages (`/`, `/library`, `/recent`, `/offline`)
- Static JS/CSS chunks as they are visited
- The PDF.js worker
- The `/api/books` library response
- Each PDF you open (`readvault-pdfs` cache)

## Known iOS limitations

- iOS may evict cache storage under pressure. ReadVault requests persisted storage but cannot guarantee it.
- Offline mode is read-only: uploads, edits, and deletes need a connection.
- No background sync or push notifications yet.
- The PWA is tied to the HTTPS origin. A changing tunnel URL means reinstalling.
- Only PDFs opened while online are cached. New books are not downloaded automatically.
- Very large PDFs consume significant storage; keep an eye on iPhone storage.
- PDF.js is tested in Chromium locally; test the actual iPhone build on your device before relying on it.

## Later

Cloud migration (Supabase Postgres + Storage + Auth) removes the PC/tunnel dependency and enables true multi-device sync and background updates.
