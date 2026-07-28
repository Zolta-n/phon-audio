/**
 * Set (or rotate) the password for an admin account.
 *
 * The admin app signs in with email + password rather than a magic link,
 * because the admin box may not have inbox access. Passwords are therefore set
 * out-of-band with the service key — this script is that band.
 *
 * Usage, from the admin/ directory:
 *
 *   npx tsx scripts/set-admin-password.ts <email> [password]
 *
 * Omit the password and a strong one is generated and printed. The account must
 * already exist in Supabase auth and be listed in ADMIN_EMAILS to reach the UI.
 *
 * The new password is verified by signing in through the anon key — the same
 * path the login form takes — so a "SUCCESS" line means the form will work.
 */
import * as path from "node:path";
import * as crypto from "node:crypto";
import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !serviceKey || !anonKey) {
  console.error("Missing Supabase env vars — check admin/.env.local");
  process.exit(1);
}

const email = process.argv[2];
if (!email) {
  console.error("Usage: npx tsx scripts/set-admin-password.ts <email> [password]");
  process.exit(1);
}

// Avoid characters that are easy to mistype or that shells treat specially.
const password =
  process.argv[3] ?? `Pa-${crypto.randomBytes(12).toString("base64url").replace(/[-_]/g, "x")}-9`;

async function main() {
  const admin = createClient(url!, serviceKey!);

  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (listError) throw listError;

  const user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    console.error(`No auth user with email ${email}.`);
    console.error(`Existing: ${list.users.map((u) => u.email).join(", ")}`);
    process.exit(1);
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, { password });
  if (updateError) throw updateError;
  console.log(`Password set for ${user.email}`);

  // Verify through the real client path rather than trusting the write.
  const anon = createClient(url!, anonKey!);
  const { data: session, error: signInError } = await anon.auth.signInWithPassword({
    email: user.email!,
    password,
  });
  if (signInError) {
    console.error(`Sign-in check FAILED: ${signInError.message}`);
    process.exit(1);
  }
  console.log(`Sign-in check: SUCCESS (session for ${session.user.email})`);

  const allow = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase());
  if (!allow.includes(user.email!.toLowerCase())) {
    console.warn(
      `\nWARNING: ${user.email} is not in ADMIN_EMAILS, so sign-in will succeed but the ` +
        `app will refuse access. Current allowlist: ${allow.join(", ") || "(empty)"}`,
    );
  }

  console.log(`\n  PASSWORD: ${password}\n`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
