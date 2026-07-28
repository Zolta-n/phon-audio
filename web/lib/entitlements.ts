import "server-only";
import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isAdmin, sessionUser } from "@/lib/adminAuth";
import { canSubmit, type Tier, type Viewer as BaseViewer } from "@/lib/permissions";

export {
  canEditComponent,
  canViewComponent,
  type OwnableComponent,
  type Tier,
} from "@/lib/permissions";

export interface Viewer extends BaseViewer {
  user: User | null;
  /** May add components / run the collector. Derived from admin + tier. */
  canSubmit: boolean;
}

export const ANONYMOUS: Viewer = {
  user: null,
  userId: null,
  admin: false,
  tier: "free",
  canSubmit: false,
};

/**
 * Resolve the current session's identity and entitlements in one call.
 *
 * `tier` is read from public.profiles, which only the service key can write —
 * a user cannot promote themselves. Once billing is wired up, the payment
 * webhook becomes the writer and nothing here needs to change.
 */
export async function getViewer(): Promise<Viewer> {
  const user = await sessionUser();
  if (!user) return ANONYMOUS;

  const admin = isAdmin(user);

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    // Fail closed, but loudly — a missing profiles table (migration not run)
    // would otherwise silently downgrade every paying user to free.
    console.error("[getViewer] profiles lookup failed, treating as free tier:", error);
  }

  // Missing profile row (pre-migration account, or the trigger did not fire)
  // is treated as free — fail closed.
  const tier: Tier = data?.tier === "paid" ? "paid" : "free";
  const base: BaseViewer = { userId: user.id, admin, tier };

  return { ...base, user, canSubmit: canSubmit(base) };
}
