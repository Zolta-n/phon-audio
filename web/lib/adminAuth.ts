import "server-only";
import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";

// ADMIN_EMAILS is the sole authorization source: a comma-separated allowlist
// checked against the Supabase session. Deliberately mirrors admin/lib/adminAuth.ts
// rather than importing it — the two apps have separate node_modules trees, so a
// shared next/headers instance would break request context (see admin/README.md).

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function sessionUser(): Promise<User | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export function isAdmin(user: User | null): user is User {
  return !!user?.email && adminEmails().includes(user.email.toLowerCase());
}

/** True when the current session belongs to an allowlisted admin. */
export async function currentUserIsAdmin(): Promise<boolean> {
  return isAdmin(await sessionUser());
}

/**
 * Route handlers: returns the signed-in user, or a Response to return as-is.
 * `admin: true` additionally requires the allowlist (403 when not on it).
 */
export async function requireUser(
  opts: { admin?: boolean } = {},
): Promise<{ user: User; error: null } | { user: null; error: Response }> {
  const user = await sessionUser();
  if (!user) {
    return { user: null, error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (opts.admin && !isAdmin(user)) {
    return { user: null, error: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, error: null };
}
