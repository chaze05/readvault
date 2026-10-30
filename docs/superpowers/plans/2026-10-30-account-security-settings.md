# Account Security, Settings, and AI Key Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Pass 1 account recovery, family accounts, real Settings, session invalidation, data controls, reading preferences, and encrypted AI-key management without opening public signup.

**Architecture:** Add a backward-compatible PostgreSQL migration for admin/session/token/preference/AI records. Replace JWT-only checks with a database-validated current-user helper, build admin-generated token flows, add server actions for Settings, and keep all secrets server-side.

**Tech Stack:** Next.js 15.5 App Router, React 19, TypeScript, Tailwind, PostgreSQL via `pg`, bcrypt, jose, Vercel Blob, Zod, Vitest, Framer Motion.

**Spec:** `docs/superpowers/specs/2026-10-30-account-security-settings-design.md`

## Global Constraints

- Public signup stays closed; do not set `ALLOW_SIGNUPS=true` in production.
- No email delivery is added. Invite/reset links are copied manually.
- Reset tokens expire in 1 hour; invite tokens expire in 24 hours; both are single-use.
- Tokens are 32 random bytes, base64url-encoded; only SHA-256 hashes are stored.
- Session JWTs carry `sv` and `mcp`; absent claims mean `sv=0` and `mcp=false`.
- Every authenticated API/action must scope by the database user id; admin access must re-check `users.is_admin`.
- AI keys use AES-256-GCM with a server-only `SETTINGS_ENCRYPTION_KEY`; never return/log the raw key.
- AI provider URLs are HTTPS-only, reject loopback/private hosts, and require `AI_ALLOWED_HOSTS` for custom hosts.
- AI drafts default to 10 per user per UTC day.
- PDF zoom values are exactly 75, 100, 125, 150. Story text sizes are small, medium, large. No app-wide theme.
- Do not commit `.env.local`, `.local-credentials.txt`, API keys, or generated reset links.
- Finish every task with `npm.cmd test`, `npm.cmd run lint`, and `npm.cmd run build` before committing.

## Review Focus

- A reused, expired, or wrong-purpose reset/invite token must never change a password; Task 3 tests the pure lifecycle and Task 4 verifies the rejected submission path.
- An old JWT must stop working after a password change/reset/sign-out-all; Task 2 tests signed claims and Task 5 verifies the database-version rejection in a second browser.
- A non-admin or temporary-password user must not reach admin actions or normal app APIs; Task 5 and Task 8 verify both redirects and rejected requests.
- A tampered/missing AI encryption key or unsafe provider URL must fail closed without exposing secrets; Task 9 tests tamper detection, wrong keys, and private-host rejection.
- If any Blob deletion fails during content/account deletion, the database deletion must abort and report the failure; Task 7 tests URL collection and verifies the failure path.

---

## File Structure

- `db/migrations/0002_account_security.sql` — users flags, preferences, tokens, app settings, AI usage.
- `src/lib/session.ts` — JWT claims and session types.
- `src/lib/current-user.ts` — database-validated current user, active-user, and admin guards.
- `src/lib/users.ts` — user lookup and password/session-version mutations.
- `src/lib/account-token-crypto.ts` — pure token generation/hash/expiry helpers.
- `src/lib/account-tokens.ts` — token persistence, lookup, consumption, and password setting.
- `src/lib/app-url.ts` — absolute URL construction for links and CLI.
- `src/lib/preferences.ts` — reading preference read/update.
- `src/lib/export-shape.ts` — pure export document builder.
- `src/lib/data-export.ts` — export queries and Blob-first deletion.
- `src/lib/admin-accounts.ts` — family account creation and reset-link generation.
- `src/lib/ai/crypto.ts` — AES-256-GCM encryption helpers.
- `src/lib/ai/url.ts` — provider URL validation.
- `src/lib/ai/usage-window.ts` — pure UTC date/limit helpers.
- `src/lib/ai/usage.ts` — atomic daily usage reservation/refund.
- `src/lib/ai/config.ts` — database/env AI configuration resolution.
- `src/lib/ai/provider.ts` — AI request and connection test.
- `src/actions/account-tokens.ts` — public invite/reset password actions.
- `src/actions/settings.ts` — password, preferences, data, deletion actions.
- `src/actions/admin.ts` — family account and reset-link actions.
- `src/actions/ai-settings.ts` — save/test/remove AI settings.
- `src/components/settings/*` — focused Settings forms and copyable one-time output.
- `src/app/settings/page.tsx` — real Settings page.
- `src/app/reset-password/page.tsx`, `src/app/accept-invite/page.tsx` — public token pages.
- `src/app/api/settings/export/route.ts` — JSON export download.
- `scripts/grant-admin.mjs`, `scripts/create-reset-link.mjs` — CLI fallbacks.
- `src/lib/*.test.ts`, `src/lib/ai/*.test.ts` — Vitest coverage for pure logic.
- `README.md`, `AGENTS.md` — new env, security, and operational documentation.

---

### Task 1: Migration and Validation Schemas

**Files:**
- Create: `db/migrations/0002_account_security.sql`
- Modify: `src/lib/validation.ts`
- Modify: `src/lib/validation.test.ts`

**Interfaces:**
- Produces: `preferencesSchema`, `passwordChangeSchema`, `deleteAccountSchema`, `familyAccountInputSchema`, `aiSettingsInputSchema`, and `passwordSchema` from `src/lib/validation.ts`.

- [ ] **Step 1: Add failing validation tests**

Append tests to `src/lib/validation.test.ts` covering:
- `preferencesSchema` accepts `{ pdfZoom: 75|100|125|150, storyTextSize: "small"|"medium"|"large", reduceMotion: boolean }` and rejects zoom `90`.
- `passwordChangeSchema` rejects mismatched `newPassword`/`confirmPassword`.
- `familyAccountInputSchema` accepts `invite` and `temporary_password`, and rejects an invalid email.
- `aiSettingsInputSchema` rejects `dailyLimit: 0` and `dailyLimit: 101`.

```ts
expect(
  preferencesSchema.safeParse({
    pdfZoom: 75,
    storyTextSize: "small",
    reduceMotion: true,
  }).success
).toBe(true);

expect(
  preferencesSchema.safeParse({
    pdfZoom: 90,
    storyTextSize: "small",
    reduceMotion: true,
  }).success
).toBe(false);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm.cmd test -- src/lib/validation.test.ts`  
Expected: FAIL because the schemas are not exported.

- [ ] **Step 3: Add schemas to `src/lib/validation.ts`**

Extract the existing password rules into `passwordSchema`, keep `signUpSchema` using it, and add the four new schemas with the exact enums and limits above. Export the inferred types as `PreferencesInput`, `PasswordChangeInput`, `DeleteAccountInput`, `FamilyAccountInput`, and `AiSettingsInput`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm.cmd test -- src/lib/validation.test.ts`  
Expected: PASS.

- [ ] **Step 5: Create `db/migrations/0002_account_security.sql`**

Use `add column if not exists` for `is_admin`, `session_version`, and `must_change_password`. Create:

```sql
create table if not exists public.user_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  pdf_zoom smallint not null default 100 check (pdf_zoom in (75, 100, 125, 150)),
  story_text_size text not null default 'medium'
    check (story_text_size in ('small', 'medium', 'large')),
  reduce_motion boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.account_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  purpose text not null check (purpose in ('password_reset', 'account_invite')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists account_tokens_user_purpose_idx
  on public.account_tokens (user_id, purpose);

create table if not exists public.app_settings (
  id integer primary key default 1 check (id = 1),
  ai_provider text not null default 'deepseek'
    check (ai_provider in ('deepseek', 'openai', 'custom')),
  ai_base_url text not null default 'https://api.deepseek.com',
  ai_model text not null default 'deepseek-chat',
  ai_api_key_ciphertext text,
  ai_api_key_hint text,
  ai_daily_limit integer not null default 10
    check (ai_daily_limit between 1 and 100),
  ai_updated_at timestamptz,
  ai_updated_by uuid references public.users(id) on delete set null
);

insert into public.app_settings (id) values (1)
on conflict (id) do nothing;

create table if not exists public.ai_usage (
  user_id uuid not null references public.users(id) on delete cascade,
  usage_date date not null,
  count integer not null default 0 check (count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);
```

- [ ] **Step 6: Apply the additive migration to the development database**

Run: `npm.cmd run db:migrate`  
Expected: `0002_account_security.sql` applied (or skipped if already applied). This is additive; do not deploy yet.

- [ ] **Step 7: Commit**

```bash
git add db/migrations/0002_account_security.sql src/lib/validation.ts src/lib/validation.test.ts
git commit -m "feat: add account security schema and validation"
```

---

### Task 2: Session Version, Current User, and Auth Guards

**Files:**
- Modify: `src/lib/session.ts`
- Modify: `src/lib/users.ts`
- Modify: `src/actions/auth.ts`
- Modify: `src/components/auth-form.tsx`
- Modify: `src/middleware.ts`
- Create: `src/lib/current-user.ts`
- Create: `src/lib/session.test.ts`
- Modify: all files listed in Step 4 that call `getSession()`

**Interfaces:**
- Produces: `Session { userId; email; sessionVersion; mustChangePassword }`
- Produces: `CurrentUser { id; email; isAdmin; mustChangePassword; sessionVersion }`
- Produces: `getCurrentUser(): Promise<CurrentUser | null>`, `requireActiveUser(): Promise<CurrentUser | null>`, `requireAdmin(): Promise<CurrentUser | null>` from `src/lib/current-user.ts`.

- [ ] **Step 1: Write the failing session test**

Create `src/lib/session.test.ts`:

```ts
import { beforeAll, describe, expect, it } from "vitest";

import { signSession, verifySession } from "./session";

beforeAll(() => {
  process.env.AUTH_SECRET = "x".repeat(32);
});

describe("session claims", () => {
  it("round-trips the session version and must-change flag", async () => {
    const token = await signSession({
      userId: "user-1",
      email: "reader@example.com",
      sessionVersion: 7,
      mustChangePassword: true,
    });

    await expect(verifySession(token)).resolves.toEqual({
      userId: "user-1",
      email: "reader@example.com",
      sessionVersion: 7,
      mustChangePassword: true,
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm.cmd test -- src/lib/session.test.ts`  
Expected: FAIL because the new session fields are missing.

- [ ] **Step 3: Implement session claims**

Update `signSession` to write `sv` and `mcp`; update `verifySession` to read them and default missing claims to `0` and `false`. Update `Session` to the four-field interface.

- [ ] **Step 4: Add the database guard and replace direct session checks**

Create `src/lib/current-user.ts`:

```ts
export interface CurrentUser {
  id: string;
  email: string;
  isAdmin: boolean;
  mustChangePassword: boolean;
  sessionVersion: number;
}

export async function getCurrentUser(): Promise<CurrentUser | null>;
export async function requireActiveUser(): Promise<CurrentUser | null>;
export async function requireAdmin(): Promise<CurrentUser | null>;
```

`getCurrentUser` reads the cookie session, loads the user row, rejects a missing user or a version mismatch, and returns the DB values. `requireActiveUser` also returns null when `mustChangePassword` is true. `requireAdmin` requires `isAdmin` and an active user.

Update `src/lib/users.ts` so `findUserForLogin` returns `is_admin`, `session_version`, and `must_change_password`, and add `findUserById`.

Update `src/actions/auth.ts` to sign sessions with those fields, return `{ ok: true, mustChangePassword }`, and redirect future temp-password users through that flag. Update `src/components/auth-form.tsx` to route to `/settings?security=password` when true.

Update `src/middleware.ts` so a session with `mustChangePassword` is redirected to `/settings?security=password` for all protected pages except `/settings`, and so `/login` redirects to Settings rather than the library.

Replace `getSession()` with `requireActiveUser()` in:

- `src/app/api/ai/story/route.ts`
- `src/app/api/blob/upload/route.ts`
- `src/app/api/books/route.ts`
- `src/app/api/books/[id]/route.ts`
- `src/app/api/books/[id]/file/route.ts`
- `src/app/api/books/[id]/progress/route.ts`
- `src/app/api/stories/route.ts`
- `src/app/api/stories/[id]/route.ts`
- `src/app/api/stories/[id]/images/route.ts`
- `src/app/api/stories/[id]/progress/route.ts`
- `src/app/reader/[id]/page.tsx`
- `src/app/story-time/[id]/page.tsx`

Use `getCurrentUser()` on the public home page for the signed-in display state. Keep the old `getSession()` helper only as an internal JWT verifier for current-user/middleware.

- [ ] **Step 5: Run tests, lint, and build**

Run: `npm.cmd test`  
Run: `npm.cmd run lint`  
Run: `npm.cmd run build`  
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/session.ts src/lib/session.test.ts src/lib/users.ts src/lib/current-user.ts src/actions/auth.ts src/components/auth-form.tsx src/middleware.ts src/app/api src/app/reader src/app/story-time src/app/page.tsx
git commit -m "feat: validate session versions and admin access"
```

---

### Task 3: Account Tokens, CLI Fallbacks, and Admin Grant

**Files:**
- Create: `src/lib/account-token-crypto.ts`
- Create: `src/lib/account-token-crypto.test.ts`
- Create: `src/lib/account-tokens.ts`
- Create: `src/lib/app-url.ts`
- Create: `scripts/grant-admin.mjs`
- Create: `scripts/create-reset-link.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `AccountTokenPurpose = "password_reset" | "account_invite"`.
- Produces: `generateAccountToken()`, `hashAccountToken(raw)`, `accountTokenExpiry(purpose, now?)`, `isAccountTokenExpired(expiresAt, now?)`.
- Produces: `createAccountToken({ userId, purpose, createdBy?, now? })`, `findAccountToken(rawToken, purpose, now?)`, `setPasswordWithToken({ rawToken, purpose, passwordHash, now? })`, `buildAccountTokenUrl(rawToken, purpose)`.

- [ ] **Step 1: Write failing token crypto tests**

Create `src/lib/account-token-crypto.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  accountTokenExpiry,
  generateAccountToken,
  hashAccountToken,
  isAccountTokenExpired,
} from "./account-token-crypto";

describe("account token crypto", () => {
  it("generates URL-safe tokens and stores only deterministic hashes", () => {
    const raw = generateAccountToken();
    expect(raw.length).toBeGreaterThan(30);
    expect(raw).not.toMatch(/[+/=]/);
    expect(hashAccountToken(raw)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashAccountToken(raw)).toBe(hashAccountToken(raw));
  });

  it("uses one hour for resets and 24 hours for invites", () => {
    const now = new Date("2026-10-30T12:00:00.000Z");
    expect(accountTokenExpiry("password_reset", now).toISOString()).toBe(
      "2026-10-30T13:00:00.000Z"
    );
    expect(accountTokenExpiry("account_invite", now).toISOString()).toBe(
      "2026-10-31T12:00:00.000Z"
    );
    expect(isAccountTokenExpired(now, now)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm.cmd test -- src/lib/account-token-crypto.test.ts`  
Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement token crypto and persistence**

Create the pure helpers with `randomBytes(32).toString("base64url")`, SHA-256 hex, and the 1-hour/24-hour expiry. Implement `createAccountToken` so it invalidates previous unused tokens for the same user/purpose, inserts only the hash, and returns the raw token plus expiry.

`findAccountToken` returns the matching user email only for an unused, unexpired token. `setPasswordWithToken` uses `withTransaction`: consume the token atomically, update the user password hash, increment `session_version`, set `must_change_password=false`, and invalidate other unused tokens for that purpose. Invalid, expired, and used tokens all return null.

Create `src/lib/app-url.ts` with `getAppUrl()` using `APP_URL` then `NEXT_PUBLIC_APP_URL`, defaulting to `http://localhost:3000`. `buildAccountTokenUrl` returns `/reset-password?token=...` or `/accept-invite?token=...` on that origin.

- [ ] **Step 4: Add CLI fallbacks**

Create `scripts/grant-admin.mjs` to set `is_admin=true` for an email and print only the account email. Create `scripts/create-reset-link.mjs` to find the user, create a one-time reset token, and print the full reset URL once. Both read `ADMIN_DATABASE_URL` or `DATABASE_URL` and must fail clearly when the email does not exist.

Add scripts:

```json
"admin:grant": "node --env-file=.env.local scripts/grant-admin.mjs",
"account:reset-link": "node --env-file=.env.local scripts/create-reset-link.mjs"
```

- [ ] **Step 5: Run tests**

Run: `npm.cmd test -- src/lib/account-token-crypto.test.ts`  
Expected: PASS.

- [ ] **Step 6: Verify the CLI against the migrated database**

Run: `npm.cmd run admin:grant -- ranirubillos05@gmail.com`  
Expected: account flagged admin; no password or secret printed.

Run: `npm.cmd run account:reset-link -- ranirubillos05@gmail.com`  
Expected: a one-time reset URL is printed once.

- [ ] **Step 7: Commit**

```bash
git add src/lib/account-token-crypto.ts src/lib/account-token-crypto.test.ts src/lib/account-tokens.ts src/lib/app-url.ts scripts/grant-admin.mjs scripts/create-reset-link.mjs package.json
git commit -m "feat: add account token and admin CLI support"
```

---

### Task 4: Public Reset and Invite Password Pages

**Files:**
- Create: `src/actions/account-tokens.ts`
- Create: `src/components/auth/set-password-form.tsx`
- Create: `src/app/reset-password/page.tsx`
- Create: `src/app/accept-invite/page.tsx`

**Interfaces:**
- Consumes: `findAccountToken`, `setPasswordWithToken`, `buildAccountTokenUrl`.
- Produces: `setPasswordWithTokenAction(formData): Promise<{ error: string } | never>` and public token pages.

- [ ] **Step 1: Implement the token action**

The action reads `token`, `purpose`, `password`, and `confirmPassword`. Validate with the password schema, reject mismatches, hash with bcrypt, call `setPasswordWithToken`, and redirect to `/login?reset=1` on success. Show the same generic error for invalid/expired/used tokens.

- [ ] **Step 2: Implement the shared password form and pages**

Create a client `SetPasswordForm` that posts to the action and displays an error. The reset page uses purpose `password_reset`; the invite page uses `account_invite`. Server pages read `searchParams.token`, call `findAccountToken` for display-only validation, and show a generic invalid-link state when the token cannot be used. Do not consume the token during page render.

- [ ] **Step 3: Add page copy**

Reset page: `Choose a new password`. Invite page: `Welcome to ReadVault — choose your password`. Both include a link back to `/login`.

- [ ] **Step 4: Run tests, lint, and build**

Run: `npm.cmd test`  
Run: `npm.cmd run lint`  
Run: `npm.cmd run build`  
Expected: all pass.

- [ ] **Step 5: Manual token verification**

Use the reset URL from Task 3. Confirm:
- The page accepts a new password once.
- The same URL is rejected after submission.
- The old password no longer signs in.
- An expired or random token shows the generic invalid message.

- [ ] **Step 6: Commit**

```bash
git add src/actions/account-tokens.ts src/components/auth/set-password-form.tsx src/app/reset-password src/app/accept-invite
git commit -m "feat: add reset and invite password pages"
```

---

### Task 5: Real Settings Account and Security

**Files:**
- Replace: `src/app/settings/page.tsx`
- Create: `src/actions/settings.ts`
- Create: `src/components/settings/settings-section.tsx`
- Create: `src/components/settings/security-form.tsx`
- Create: `src/components/settings/account-summary.tsx`
- Modify: `src/lib/users.ts`
- Modify: `src/actions/auth.ts`

**Interfaces:**
- Produces: `changePasswordAction`, `signOutAllAction` from `src/actions/settings.ts`.
- Produces: `updateUserPassword(userId, hash): Promise<number>` and `incrementSessionVersion(userId): Promise<number>` from `src/lib/users.ts`.

- [ ] **Step 1: Add server mutations**

Implement `updateUserPassword` to update the bcrypt hash, clear `must_change_password`, increment `session_version`, and return the new version. Implement `incrementSessionVersion` for sign-out-all.

`changePasswordAction` uses `getCurrentUser`, verifies the current password, validates the new password, updates the hash, signs a new session with the new version, and sets the cookie. `signOutAllAction` increments the version, clears the cookie, and redirects to `/login`.

- [ ] **Step 2: Build the Settings shell**

The server page redirects unauthenticated users to `/login`, renders the signed-in email, and displays the account/security sections. Use the existing paper/white/brand styling and focused cards; remove all copy claiming local-only storage or Supabase.

`SecurityForm` posts current/new/confirm passwords and shows inline errors. Add a separate “Sign out all devices” button with a confirmation message.

- [ ] **Step 3: Enforce temporary-password behavior**

Confirm a session with `mcp=true` is redirected to Settings and cannot call normal app APIs. After password change, verify the new cookie routes to `/library` and the old cookie is rejected.

- [ ] **Step 4: Run tests, lint, and build**

Run: `npm.cmd test`  
Run: `npm.cmd run lint`  
Run: `npm.cmd run build`  
Expected: all pass.

- [ ] **Step 5: Manual verification**

Sign in in two browsers. Change the password in one; confirm the other receives 401/redirect behavior on refresh. Repeat with “Sign out all devices.” Confirm an incorrect current password cannot change anything.

- [ ] **Step 6: Commit**

```bash
git add src/app/settings/page.tsx src/actions/settings.ts src/components/settings/settings-section.tsx src/components/settings/security-form.tsx src/components/settings/account-summary.tsx src/lib/users.ts src/actions/auth.ts
git commit -m "feat: add account and security settings"
```

---

### Task 6: Reading Preferences and Reader Application

**Files:**
- Create: `src/lib/preferences.ts`
- Create: `src/lib/preferences.test.ts`
- Create: `src/components/settings/reading-form.tsx`
- Create: `src/components/motion-preferences.tsx`
- Modify: `src/actions/settings.ts`
- Modify: `src/app/settings/page.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/app/reader/[id]/page.tsx`
- Modify: `src/components/pdf-reader.tsx`
- Modify: `src/app/story-time/[id]/page.tsx`
- Modify: `src/components/story-reader.tsx`
- Modify: `src/lib/session-cookies.ts`

**Interfaces:**
- Produces: `UserPreferences { pdfZoom: 75|100|125|150; storyTextSize: "small"|"medium"|"large"; reduceMotion: boolean }`
- Produces: `getPreferences(userId)`, `updatePreferences(userId, input)`, `updatePreferencesAction(formData)`.

- [ ] **Step 1: Add failing preference tests**

Test default values and accepted values in `src/lib/preferences.test.ts`, using the schemas from Task 1.

- [ ] **Step 2: Implement preference persistence**

Lazily create the `user_preferences` row, reading and upserting values. `updatePreferencesAction` uses `getCurrentUser`, validates input, saves, sets a `readvault-motion` cookie (`1` when reduced), and revalidates `/settings`.

- [ ] **Step 3: Apply preferences to readers**

Add `initialZoom` to `PdfReader` and initialize zoom from it. Pass `preferences.pdfZoom / 100` from the reader page. Add `textSize` to `StoryReader` and apply small/medium/large classes to the story article; pass the value from the Story Time reader page.

Make `RootLayout` read the motion cookie and wrap children in a client `MotionPreferences` using Framer Motion’s `MotionConfig` (`always` or `user`). Add reduced-motion CSS overrides for the reader curtain/page-turn selectors. `signIn` should load preferences and set the motion cookie for existing users.

- [ ] **Step 4: Run tests, lint, and build**

Run: `npm.cmd test`  
Run: `npm.cmd run lint`  
Run: `npm.cmd run build`  
Expected: all pass.

- [ ] **Step 5: Manual verification**

Change each preference and reload a PDF and a story. Confirm zoom, text size, and reduced motion apply, and that a new sign-in keeps the preference.

- [ ] **Step 6: Commit**

```bash
git add src/lib/preferences.ts src/lib/preferences.test.ts src/components/settings/reading-form.tsx src/components/motion-preferences.tsx src/actions/settings.ts src/app/settings/page.tsx src/app/layout.tsx src/app/globals.css src/app/reader src/components/pdf-reader.tsx src/app/story-time src/components/story-reader.tsx src/lib/session-cookies.ts
git commit -m "feat: add reading preferences and motion controls"
```

---

### Task 7: Data Export and Deletion

**Files:**
- Create: `src/lib/export-shape.ts`
- Create: `src/lib/export-shape.test.ts`
- Create: `src/lib/data-export.ts`
- Create: `src/app/api/settings/export/route.ts`
- Create: `src/components/settings/data-form.tsx`
- Modify: `src/actions/settings.ts`
- Modify: `src/app/settings/page.tsx`

**Interfaces:**
- Produces: `buildExportDocument({ account, preferences, books, stories })`, `collectBlobUrls({ books, stories })`, `buildUserExport(userId)`, `deleteAllUserContent(userId)`, `deleteUserAccount(userId)`.
- Produces: `deleteAllContentAction`, `deleteAccountAction`.

- [ ] **Step 1: Add failing export-shape tests**

Test that the document includes `schemaVersion`, account email, preference values, book metadata, story pages, and unique Blob URLs. Assert that no password hash or token value is present.

- [ ] **Step 2: Implement export and deletion**

`buildUserExport` queries the user, preferences, books, and stories with pages. `GET /api/settings/export` requires an active user and returns `application/json` with a dated filename.

`collectBlobUrls` gathers book files, story covers, and page images. `deleteAllUserContent` deletes those Blob URLs first; if any deletion fails, throw before deleting database rows. Then delete books and stories. `deleteUserAccount` verifies the current password and typed email, deletes content, deletes the user (cascading tokens/preferences), and clears the cookie.

`deleteAllContentAction` requires typed confirmation. `deleteAccountAction` requires typed email, password, and the exact phrase `DELETE`; redirect to `/` on success.

- [ ] **Step 3: Build the Data section**

Add Export JSON, Delete all content, and Delete account controls with clear destructive styling. Show server errors inline; never claim data was deleted if Blob cleanup failed.

- [ ] **Step 4: Run tests, lint, and build**

Run: `npm.cmd test`  
Run: `npm.cmd run lint`  
Run: `npm.cmd run build`  
Expected: all pass.

- [ ] **Step 5: Manual verification**

With a test account containing a book and story, export and inspect the JSON. Delete content and confirm database rows are gone. Delete the account and confirm sign-out and no remaining user row. Simulate a Blob deletion failure and confirm the DB rows remain.

- [ ] **Step 6: Commit**

```bash
git add src/lib/export-shape.ts src/lib/export-shape.test.ts src/lib/data-export.ts src/app/api/settings/export/route.ts src/components/settings/data-form.tsx src/actions/settings.ts src/app/settings/page.tsx
git commit -m "feat: add data export and account deletion"
```

---

### Task 8: Family Accounts and Admin Reset Links

**Files:**
- Create: `src/lib/admin-accounts.ts`
- Create: `src/actions/admin.ts`
- Create: `src/components/settings/family-section.tsx`
- Create: `src/components/settings/copy-value.tsx`
- Modify: `src/app/settings/page.tsx`

**Interfaces:**
- Produces: `listFamilyAccounts()`, `createFamilyAccount({ email, method, createdBy })`, `createPasswordResetLink(email, createdBy)`.
- Produces: `createFamilyAccountAction`, `generateResetLinkAction`.

- [ ] **Step 1: Implement admin account operations**

`listFamilyAccounts` returns id, email, created date, and admin flag ordered by creation. `createFamilyAccount` supports `invite` and `temporary_password`; reject duplicate emails. Invite accounts get an unknown random password hash, `must_change_password=true`, a 24-hour invite token, and a returned URL. Temporary accounts get a generated strong password, a bcrypt hash, `must_change_password=true`, and return the password once.

`createPasswordResetLink` finds the account and returns a 1-hour reset URL. All functions require the caller to have already passed `requireAdmin`; actions call `requireAdmin` and return 403/error otherwise.

- [ ] **Step 2: Build the Family section**

Admin-only. Show account emails and creation dates, a create form with method selector, and a one-time result panel using `CopyValue`. Include a reset-link action per account. On non-admin accounts, omit the section entirely.

- [ ] **Step 3: Run tests, lint, and build**

Run: `npm.cmd test`  
Run: `npm.cmd run lint`  
Run: `npm.cmd run build`  
Expected: all pass.

- [ ] **Step 4: Manual verification**

Grant owner admin via the Task 3 CLI. Create an invite account; accept it in a private window; confirm sign-in works. Create a temporary-password account; confirm the first sign-in forces Settings and the new password works. Generate a reset link; confirm one-time use. Confirm a non-admin account gets no Family section.

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin-accounts.ts src/actions/admin.ts src/components/settings/family-section.tsx src/components/settings/copy-value.tsx src/app/settings/page.tsx
git commit -m "feat: add family accounts and admin reset links"
```

---

### Task 9: AI Backend, Encryption, and Daily Limit

**Files:**
- Create: `src/lib/ai/crypto.ts`
- Create: `src/lib/ai/crypto.test.ts`
- Create: `src/lib/ai/url.ts`
- Create: `src/lib/ai/url.test.ts`
- Create: `src/lib/ai/usage-window.ts`
- Create: `src/lib/ai/usage-window.test.ts`
- Create: `src/lib/ai/usage.ts`
- Create: `src/lib/ai/config.ts`
- Create: `src/lib/ai/provider.ts`
- Modify: `src/app/api/ai/story/route.ts`

**Interfaces:**
- Produces: `encryptSecret(plaintext, keyBase64)`, `decryptSecret(envelope, keyBase64)`.
- Produces: `validateAiBaseUrl(rawUrl, allowedHosts?)`.
- Produces: `usageDateKey(now)`, `usageResetAt(now)`, `reserveAiDraft(userId, limit, now?)`, `refundAiDraft(userId, now?)`.
- Produces: `resolveAiConfig()`, `generateAiStory(config, input)`, `testAiProvider(config)`.

- [ ] **Step 1: Write failing crypto, URL, and usage-window tests**

Tests must cover:
- Encryption round-trip and rejection of tampered ciphertext/wrong key.
- HTTPS acceptance; `http://`, `localhost`, private IP, and unapproved custom hosts rejection.
- UTC date key and reset timestamp for a known instant.

```ts
expect(usageDateKey(new Date("2026-10-30T23:59:59.000Z"))).toBe("2026-10-30");
expect(() => validateAiBaseUrl("http://api.deepseek.com", [])).toThrow();
expect(() => validateAiBaseUrl("https://127.0.0.1", [])).toThrow();
```

- [ ] **Step 2: Implement crypto, URL validation, and usage window**

Use AES-256-GCM with a random 12-byte IV and a versioned envelope. Require a 32-byte base64 key. Use the existing DeepSeek/OpenAI hosts plus `AI_ALLOWED_HOSTS` for custom hosts; reject loopback/private/link-local addresses.

- [ ] **Step 3: Implement configuration, provider, and usage**

`resolveAiConfig` reads the singleton `app_settings` row; if it has a ciphertext, decrypt with `SETTINGS_ENCRYPTION_KEY`; otherwise fall back to `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL`. Return null when no key exists. If a database ciphertext exists but cannot be decrypted, fail closed with a safe configuration error rather than silently using the environment key.

`reserveAiDraft` performs an atomic upsert that only increments while the count is below the limit; return `{ allowed, used, limit, resetAt }`. `refundAiDraft` decrements the current UTC day without going below zero. `generateAiStory` preserves the current system prompt and JSON parsing; `testAiProvider` performs a minimal chat completion with the saved config.

- [ ] **Step 4: Update the AI route**

Require an active user, resolve config, return 503 when absent, reject over-limit users with 429, reserve usage before the provider call, refund on definitive provider failure, and return only safe errors. Do not log request headers or keys.

- [ ] **Step 5: Run tests, lint, and build**

Run: `npm.cmd test`  
Run: `npm.cmd run lint`  
Run: `npm.cmd run build`  
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ai src/app/api/ai/story/route.ts
git commit -m "feat: secure AI configuration and usage limits"
```

---

### Task 10: AI Settings Admin UI

**Files:**
- Create: `src/lib/ai/settings.ts`
- Create: `src/actions/ai-settings.ts`
- Create: `src/components/settings/ai-settings-form.tsx`
- Modify: `src/app/settings/page.tsx`

**Interfaces:**
- Produces: `getAiSettingsView()`, `saveAiSettings(input)`, `removeAiKey()`.
- Produces: `saveAiSettingsAction`, `removeAiKeyAction`, `testAiConnectionAction`.

- [ ] **Step 1: Implement the settings store**

Return provider, base URL, model, daily limit, `hasKey`, `keyHint`, and whether the active config comes from the database or environment. Save only ciphertext and the last-four hint. Blank key input preserves the existing key; an explicit remove clears it. Require `SETTINGS_ENCRYPTION_KEY` for database saves.

- [ ] **Step 2: Add admin actions and form**

All actions call `requireAdmin`. The form shows presets, base URL, model, daily limit, a write-only password field, Save, Test connection, and Remove. Show the masked hint and source. Disable saving with an actionable message when the encryption key is absent. On test failure, show the safe provider message.

- [ ] **Step 3: Run tests, lint, and build**

Run: `npm.cmd test`  
Run: `npm.cmd run lint`  
Run: `npm.cmd run build`  
Expected: all pass.

- [ ] **Step 4: Prepare the local encryption key**

Before starting the server, generate a 32-byte base64 `SETTINGS_ENCRYPTION_KEY` and add it only to `.env.local` for local verification. Never print it or commit it. Vercel’s copy is added during Task 11.

- [ ] **Step 5: Manual verification**

After adding an AI key through the UI, test the connection, generate a draft, confirm the daily limit, remove the key, and confirm generation returns the “not configured” message. Confirm the key is never present in page HTML or network responses after save.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ai/settings.ts src/actions/ai-settings.ts src/components/settings/ai-settings-form.tsx src/app/settings/page.tsx
git commit -m "feat: add encrypted AI settings"
```

---

### Task 11: Documentation, Migration, and Production Verification

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `PROJECT_PLAN.md` if its current status list still describes Settings as unfinished

- [ ] **Step 1: Document operations and environment**

README must document:
- Invite-only account creation and manual reset links.
- `APP_URL`, `SETTINGS_ENCRYPTION_KEY`, optional `AI_ALLOWED_HOSTS`.
- AI key is entered in admin Settings, not committed.
- Admin and reset CLI commands.
- Reset/invite expiry values and the AI daily limit.
- Pass 2 bookmarks/favorites are still pending.

AGENTS must document the session-version rule, admin authorization, token expiry, secret handling, and the requirement not to open signup.

- [ ] **Step 2: Generate and set the encryption key**

Generate 32 random bytes as base64 in the terminal and add the value to `.env.local` and Vercel production as `SETTINGS_ENCRYPTION_KEY`. Never print the value in chat or commit it. Add `APP_URL=https://readvault-ten.vercel.app`.

- [ ] **Step 3: Apply the migration and verify**

Run: `npm.cmd run db:migrate:prod`  
Expected: `0002_account_security.sql` applied or already recorded.

Run: `npm.cmd run admin:grant -- ranirubillos05@gmail.com`  
Expected: owner is admin.

- [ ] **Step 4: Run the complete verification suite**

Run: `npm.cmd test`  
Run: `npm.cmd run lint`  
Run: `npm.cmd run build`  
Expected: all pass.

- [ ] **Step 5: Deploy and smoke-check**

Deploy to production, then verify:
1. Public signup is still absent.
2. Owner can sign in and see Family/AI sections.
3. Invite link creates an account and is single-use.
4. Temporary password forces a Settings password change.
5. Reset link works once and invalidates old sessions.
6. Sign-out-all invalidates a second browser.
7. Preferences affect readers.
8. Export and deletion work with Blob cleanup.
9. AI key saves, tests, generates a draft, hits the daily limit, and removes.
10. No secret appears in the browser, logs, git, or chat.

- [ ] **Step 6: Commit documentation**

```bash
git add README.md AGENTS.md PROJECT_PLAN.md
git commit -m "docs: document account security and AI key operations"
```

---

## Verification Commands

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Manual smoke tests require the migrated database, owner admin grant, and production deployment. Do not consider Pass 1 complete until Task 11’s ten-point check passes.
