import { createHash, randomBytes } from "node:crypto";

import { Client } from "pg";

const email = process.argv[2]?.trim();
const connectionString =
  process.env.ADMIN_DATABASE_URL ?? process.env.DATABASE_URL;

if (!email) {
  console.error("Usage: npm run account:reset-link -- <email>");
  process.exit(1);
}

if (!connectionString) {
  console.error(
    "Set ADMIN_DATABASE_URL or DATABASE_URL before creating a reset link."
  );
  process.exit(1);
}

const client = new Client({ connectionString });
await client.connect();

try {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  await client.query("begin");

  const { rows } = await client.query(
    "select id, email from public.users where lower(email) = lower($1)",
    [email]
  );

  const user = rows[0];

  if (!user) {
    await client.query("rollback");
    console.error(`No account found for ${email}.`);
    process.exitCode = 1;
  } else {
    await client.query(
      `update public.account_tokens
       set used_at = $2
       where user_id = $1 and purpose = 'password_reset' and used_at is null`,
      [user.id, now]
    );

    await client.query(
      `insert into public.account_tokens
         (user_id, purpose, token_hash, expires_at, created_at)
       values ($1, 'password_reset', $2, $3, $4)`,
      [user.id, tokenHash, expiresAt, now]
    );

    await client.query("commit");

    const appUrl = (
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000"
    ).replace(/\/+$/, "");

    console.log(`${appUrl}/reset-password?token=${rawToken}`);
  }
} catch (error) {
  await client.query("rollback").catch(() => {});
  console.error(
    `Could not create reset link: ${
      error instanceof Error ? error.message : "unknown error"
    }`
  );
  process.exitCode = 1;
} finally {
  await client.end();
}
