# ReadVault Pass 1 — Account Security, Settings, and AI Key Management

**Date:** 2026-10-30  
**Status:** Design approved; awaiting written-spec review  
**Scope:** Pass 1 of 2. Bookmark/note/favorite work is Pass 2 and gets its own spec.

## Context

ReadVault currently has invitation-only email/password sign-in, per-user PostgreSQL libraries, PDF reading, Story Time, and optional AI story drafting. Public signup is closed. The Settings and Bookmarks routes are placeholders. Password recovery and family account creation are not available, and the AI key can only be supplied through a deployment environment variable.

This spec replaces the Settings placeholder and adds the account/security foundation needed to run ReadVault for a family without reopening public signup.

## Goals

1. Let the owner generate one-time password-reset links without an email provider.
2. Let the owner create family accounts with either a one-time invite link or a temporary password.
3. Replace `/settings` with real account, security, reading, data, family, and AI configuration.
4. Invalidate active sessions after password changes, resets, and “sign out all devices.”
5. Let the owner securely add, test, replace, and remove an AI provider key from Settings.
6. Protect AI usage with a per-user daily draft limit.

## Non-goals

- Public signup.
- Sending email. Reset and invite links are copied and delivered manually.
- App-wide dark/sepia themes.
- Bookmarks, page notes, or favorites (Pass 2).
- PDF text highlights.
- 2FA, login rate limiting, email verification, or password reset by email.
- Child accounts, parental consent flows, or AI content moderation beyond the existing prompt rules.
- Binary ZIP export of PDFs/images.
- Admin deletion of other accounts.

## Approved decisions

- Reset links are admin-generated, one-time, and copied manually.
- The owner generates links in Settings, with a local CLI fallback for lockout.
- Family accounts support both invite links and temporary passwords.
- Settings includes account/security, reading preferences, data controls, family accounts, and AI configuration.
- Reading preferences are default PDF zoom, story text size, and reduce-motion; no theme in Pass 1.
- Data export is JSON metadata plus story text and Blob URLs, not binary files.
- AI key is managed in Settings, encrypted at rest, write-only in the UI, and tested from Settings.
- AI usage defaults to 10 drafts per user per UTC day.

## Architecture

### Database migration

Add `db/migrations/0002_account_security.sql`.

#### `public.users` additions

| Column | Type | Default | Purpose |
| --- | --- | --- | --- |
| `is_admin` | boolean | `false` | Owner-only Settings and admin APIs |
| `session_version` | integer | `0` | Invalidates existing JWTs |
| `must_change_password` | boolean | `false` | Forces temporary-password users to Settings |

#### `public.user_preferences`

| Column | Type | Default | Notes |
| --- | --- | --- | --- |
| `user_id` | uuid PK/FK | — | `on delete cascade` |
| `pdf_zoom` | smallint | `100` | Allowed: 75, 100, 125, 150 |
| `story_text_size` | text | `medium` | `small`, `medium`, `large` |
| `reduce_motion` | boolean | `false` | False follows the OS preference |
| `updated_at` | timestamptz | `now()` | — |

Create a row lazily on first read/update.

#### `public.account_tokens`

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | uuid PK | Token record |
| `user_id` | uuid FK | `on delete cascade` |
| `purpose` | text | `password_reset` or `account_invite` |
| `token_hash` | text unique | SHA-256 of the raw token |
| `expires_at` | timestamptz | Reset: 1 hour; invite: 24 hours |
| `used_at` | timestamptz nullable | Single-use marker |
| `created_by` | uuid nullable FK | Admin user, or null for CLI |
| `created_at` | timestamptz | — |

Index `(user_id, purpose)`. Invalidate previous unused tokens for the same user/purpose when a new one is generated. Never store raw tokens.

#### `public.app_settings`

Single-row table with `id integer primary key default 1 check (id = 1)`:

| Column | Purpose |
| --- | --- |
| `ai_provider` | `deepseek`, `openai`, or `custom` |
| `ai_base_url` | HTTPS provider base URL |
| `ai_model` | Provider model name |
| `ai_api_key_ciphertext` | Encrypted key envelope |
| `ai_api_key_hint` | Last four characters |
| `ai_daily_limit` | 1–100, default 10 |
| `ai_updated_at`, `ai_updated_by` | Audit metadata |

#### `public.ai_usage`

`(user_id, usage_date)` primary key, `count integer`, `updated_at`. Used to enforce the daily draft limit with an atomic upsert.

### Session and authorization model

- JWT claims add `sv` (session version) and `mcp` (must change password). Existing tokens without them are treated as `sv=0, mcp=false`.
- `src/lib/session.ts` remains edge-safe and verifies only the JWT.
- A new server-only `getAuthenticatedUser()` verifies the JWT, loads the user row, and rejects the session when `token.sv !== users.session_version`.
- All authenticated API routes and server actions switch from JWT-only `getSession()` to `getAuthenticatedUser()`/`requireUser()`.
- Middleware remains optimistic. It may redirect based on the signed `mcp` claim but does not query PostgreSQL.
- Temporary-password sessions (`mcp=true`) are redirected to `/settings?security=password` from every protected page except `/settings` itself. Authenticated APIs reject `mcp=true` except the password-change and sign-out endpoints.
- `is_admin` is never trusted from the client or JWT; admin helpers query `users.is_admin`.

### Token lifecycle

1. Admin or CLI requests a reset/invite link for an email.
2. Generate 32 random bytes, base64url-encode the raw token.
3. Store only its SHA-256 hash with purpose and expiry.
4. Return the full link once; the UI/CLI prints it for copying.
5. On submission, hash the supplied token and atomically consume a matching unused, unexpired row.
6. Set the new bcrypt password hash, increment `session_version`, clear `must_change_password`, mark the token used, and invalidate other unused tokens for that user/purpose.
7. Password resets redirect to `/login`; invites redirect to `/login` after the invitee sets a password.

Invalid, expired, and already-used tokens all show the same generic message.

### Family account creation

**Invite link**

- Admin enters an email.
- Create the user with a random password hash that is never revealed.
- Set `must_change_password=true` until the invite is accepted.
- Generate a 24-hour invite token and return the link.
- The invitee sets their own password; the link becomes unusable.

**Temporary password**

- Admin enters an email.
- Generate a strong temporary password, hash it, and set `must_change_password=true`.
- Return the email/password once for copying.
- First sign-in redirects to Settings; the user must choose a new password before using the app.

Duplicate emails return a clear admin-facing conflict. No account is created for an existing email.

### Owner admin and CLI fallback

- `is_admin` defaults to false.
- `npm run admin:grant -- <email>` sets the flag. No admin UI can promote accounts.
- `npm run account:reset-link -- <email>` generates a one-time reset link using the production database and prints it once.
- The CLI reads `.env.local` and uses `ADMIN_DATABASE_URL`/`DATABASE_URL` plus `APP_URL` or `NEXT_PUBLIC_APP_URL`.
- The CLI scripts are local-only and are not exposed by the deployed app.

### Settings page

Replace `src/app/settings/page.tsx` with a server page plus focused client forms.

**Account**

- Show the signed-in email as read-only.
- Link to sign out.

**Security**

- Change password: current password, new password, confirmation.
- On success: increment `session_version`, set `must_change_password=false`, issue a replacement session cookie, and invalidate other devices.
- Sign out all devices: increment `session_version`, clear the current cookie, redirect to `/login`.
- Admin-only “Generate reset link” form.

**Reading**

- Default PDF zoom: 75%, 100%, 125%, 150%.
- Story text size: small, medium, large.
- Reduce motion: on/off; off follows the OS setting.
- Preferences persist in `user_preferences` and apply to authenticated readers.

**Data**

- Export JSON with account email, preferences, book metadata, story content, page metadata, and Blob URLs.
- Delete all books/stories after a typed confirmation; Blob deletion is attempted first.
- Delete account with email and current-password confirmation; deletes content, tokens, preferences, and user.

**Family (admin only)**

- List family accounts with email and creation date.
- Create an account by invite link or temporary password.
- Generate a reset link for an account.
- Show temporary credentials or invite/reset URLs once, with a copy action. Never show them again.

**AI story drafts (admin only)**

- Provider: DeepSeek, OpenAI, or custom.
- Base URL and model.
- Write-only API key field. Blank while saved; entering a value replaces the key.
- Show only the last four characters after saving.
- Save, Test connection, and Remove key actions.
- Daily draft limit: 1–100, default 10.
- Status shows whether the database key or `AI_API_KEY` environment fallback is active.

### AI key security and runtime

- Encrypt the key with AES-256-GCM using `SETTINGS_ENCRYPTION_KEY` (32 random bytes, base64).
- Envelope format includes a version, random IV, authentication tag, and ciphertext.
- Bind the key with AAD such as `readvault:ai-key:v1`.
- Never return the raw key, ciphertext, or full URL credentials to the browser.
- Never log the key or provider request headers.
- If `SETTINGS_ENCRYPTION_KEY` is missing, saving a database key is disabled with an actionable message; the env fallback can still power AI.
- Database configuration takes precedence over `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL`.
- Only HTTPS provider URLs are allowed. Reject loopback, private, and link-local hosts. Custom hosts require `AI_ALLOWED_HOSTS`; DeepSeek and OpenAI presets are built in.
- Test connection calls a minimal chat completion using the saved key and does not increment user usage.
- `/api/ai/story` uses the resolved database/env config, enforces the per-user daily limit, and returns generic errors without secrets.
- Each accepted draft request atomically reserves one unit before calling the provider. A definitive provider failure refunds the unit; a completed or ambiguous request keeps it. Limits reset at UTC midnight.

### API and action surface

Public token pages:

- `/reset-password?token=...`
- `/accept-invite?token=...`

Authenticated settings actions/routes:

- Update reading preferences.
- Change password.
- Sign out all devices.
- Export data (`GET`; JSON attachment).
- Delete all content.
- Delete account.

Admin routes:

- List/create family accounts.
- Generate invite/reset links.
- Read/update/remove AI settings.
- Test the AI connection.

Reuse server actions where forms are straightforward; use route handlers for downloads and JSON endpoints. All mutation routes validate input, re-check authentication, and scope by the authenticated user.

### Error handling

- Token errors: generic invalid/expired message; no email enumeration.
- Admin errors: 401 unauthenticated, 403 non-admin, 409 duplicate email.
- Password change: verify the current password; reject weak/new-password mismatches.
- Blob deletion: attempt all Blob deletions before deleting database rows; abort and report if any deletion fails.
- AI errors: expose a safe provider message and retry guidance; never expose the key.
- Daily limit reached: HTTP 429 with when the limit resets.
- Missing encryption key or AI config: actionable admin-facing message.

## Testing

Automated:

- Token generation/hash/expiry/single-use helpers.
- AES-256-GCM encrypt/decrypt round-trip and tamper rejection.
- AI URL validation (HTTPS, private-host rejection, allowlist).
- Daily-limit arithmetic and UTC day handling.
- Session version and `mcp` claim helpers.
- Preference and account-token validation.
- Data-export shape and secret redaction.

Manual local/live smoke:

1. Grant owner admin.
2. Create an invite account; accept it; sign in; set a password.
3. Create a temporary-password account; confirm forced password change.
4. Generate a reset link; confirm old sessions are invalid and the link works once.
5. Change password; confirm other sessions are invalidated.
6. Update preferences; verify PDF zoom, story text size, and reduced motion.
7. Export JSON; delete content; delete a test account and verify Blob/database cleanup.
8. Save an AI key; test it; generate a draft; hit/verify the daily limit; remove the key.
9. Confirm public signup remains closed.

Run `npm.cmd test`, `npm.cmd run lint`, and `npm.cmd run build` before deployment.

## Rollout

1. Add and review migration `0002_account_security.sql`.
2. Generate a local `SETTINGS_ENCRYPTION_KEY`; add it to `.env.local` and Vercel production. Add `APP_URL` (or `NEXT_PUBLIC_APP_URL`) for generated links and optional `AI_ALLOWED_HOSTS` for custom providers.
3. Apply the migration with `npm.cmd run db:migrate:prod`.
4. Deploy.
5. Run `npm.cmd run admin:grant -- <owner email>`.
6. Verify invite, temporary-password, reset, settings, data, and AI flows.
7. Enter the AI provider key in Settings; do not put it in chat or commit it.

## Acceptance criteria

- Owner can grant admin access by CLI.
- Admin can create a family account by invite link or temporary password.
- Invite and reset links are single-use and expire.
- The owner can recover a forgotten password via Settings or CLI.
- Password changes/resets and “sign out all devices” invalidate old sessions.
- Temporary-password users cannot use the app until they change their password.
- Settings contains working account, security, reading, data, family, and AI sections.
- Preferences persist and affect readers.
- JSON export and both deletion flows work with Blob cleanup.
- AI key is encrypted, write-only, testable, removable, and masked after save.
- AI drafts obey the per-user daily limit.
- Public signup stays closed.

## Risks and tradeoffs

- Manual link delivery means no self-service reset without the owner.
- A database check on authenticated requests adds one query per request; acceptable for a family app.
- Rotating `SETTINGS_ENCRYPTION_KEY` requires re-entering the AI key.
- Temporary passwords are shared out-of-band and must be changed immediately.
- Public Blob URLs remain a privacy limitation; exports include those URLs.
- Login rate limiting, 2FA, email verification, and stronger child-safety controls remain future hardening work.

## Pass 2 handoff

Pass 2 will add page bookmarks with notes and whole-book/story favorites, plus their API, reader controls, Bookmarks page, and export integration. It gets its own spec and implementation plan before coding.
