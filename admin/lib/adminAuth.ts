import "server-only";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "./supabase-server";

// ADMIN_EMAILS is the sole authorization source: a comma-separated allowlist
// checked against the Supabase magic-link session on every page and route.

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

async function sessionUser(): Promise<User | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

function isAdmin(user: User | null): user is User {
  return !!user?.email && adminEmails().includes(user.email.toLowerCase());
}

/** Server pages: redirect to /login unless an allowlisted admin. */
export async function requireAdminPage(): Promise<User> {
  const user = await sessionUser();
  if (!isAdmin(user)) redirect("/login");
  return user;
}

/** Route handlers: the admin user, or a 401/403 Response to return as-is. */
export async function requireAdminApi(): Promise<
  { user: User; error: null } | { user: null; error: Response }
> {
  const user = await sessionUser();
  if (!user) {
    return { user: null, error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!isAdmin(user)) {
    return { user: null, error: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, error: null };
}
