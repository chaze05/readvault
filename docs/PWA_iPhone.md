# ReadVault on iPhone — PWA & Offline Checklist

## Install from the live app

1. Open **https://readvault-ten.vercel.app** in **Safari** on the iPhone.
2. Sign in or create an account.
3. Tap **Share → Add to Home Screen**.
4. Open ReadVault from the Home Screen.
5. Open a PDF or story once while online. The PDF reader shows **Offline ready** after the file is cached.
6. Turn on Airplane Mode and reopen the book/story to test offline reading.

## Local testing (optional)

If you want to test the local dev server on a phone, it must be served over HTTPS (for example with `cloudflared tunnel --url http://localhost:3000`). A `http://192.168.x.x` LAN URL will not register a service worker.

## What is cached

- App shell pages (`/`, `/login`, `/library`, `/recent`, `/offline`)
- Static JS/CSS chunks as they are visited
- The PDF.js worker
- The `/api/books` library response
- Each PDF opened in the reader (`readvault-pdfs` cache)
- Story pages/scripts and images depend on the app shell and normal browser cache; story offline caching is a future hardening pass.

## Known iOS limitations

- iOS may evict cache storage under pressure. ReadVault requests persisted storage but cannot guarantee it.
- Offline mode is read-only: sign-up, uploads, edits, AI drafts, and deletes need a connection.
- No background sync or push notifications yet.
- Only books opened while online are cached.
- Very large PDFs consume significant storage.
- The live app uses public-but-unguessable Blob URLs; do not upload sensitive documents yet.

## Future

Private Blob storage/signed URLs, story offline caching, email verification/password reset, and RLS defense-in-depth.
