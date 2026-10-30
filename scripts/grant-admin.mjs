import { Client } from "pg";

const email = process.argv[2]?.trim();
const connectionString =
  process.env.ADMIN_DATABASE_URL ?? process.env.DATABASE_URL;

if (!email) {
  console.error("Usage: npm run admin:grant -- <email>");
  process.exit(1);
}

if (!connectionString) {
  console.error("Set ADMIN_DATABASE_URL or DATABASE_URL before granting admin.");
  process.exit(1);
}

const client = new Client({ connectionString });
await client.connect();

try {
  const { rows } = await client.query(
    `update public.users
     set is_admin = true
     where lower(email) = lower($1)
     returning email`,
    [email]
  );

  const user = rows[0];

  if (!user) {
    console.error(`No account found for ${email}.`);
    process.exitCode = 1;
  } else {
    console.log(user.email);
  }
} catch (error) {
  console.error(
    `Could not grant admin access: ${
      error instanceof Error ? error.message : "unknown error"
    }`
  );
  process.exitCode = 1;
} finally {
  await client.end();
}
