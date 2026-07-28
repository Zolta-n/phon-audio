// Pure catalog-permission predicates. Deliberately free of `server-only` and
// any Supabase import so they can be unit-tested from the repo-root test suite
// (same split as chartImages.ts vs graphExtract.ts).

export type Tier = "free" | "paid";

export interface Viewer {
  /** Supabase auth user id, or null when signed out. */
  userId: string | null;
  /** On the ADMIN_EMAILS allowlist. */
  admin: boolean;
  tier: Tier;
}

/** The row fields needed to decide access to a component. */
export interface OwnableComponent {
  /** Submitter's user id; null = curated (admin-seeded or admin-added). */
  created_by: string | null;
  verified: boolean | null;
}

/** May add new components / run the collector — both cost LLM + search spend. */
export function canSubmit(viewer: Viewer): boolean {
  return viewer.admin || viewer.tier === "paid";
}

/**
 * Admins may edit anything. A submitter may keep editing their own component
 * only while it is still awaiting review — once approved it belongs to the
 * public catalog, so letting the author rewrite it would reopen the vandalism
 * path that review exists to close.
 */
export function canEditComponent(viewer: Viewer, row: OwnableComponent): boolean {
  if (viewer.admin) return true;
  if (!viewer.userId) return false;
  return row.created_by === viewer.userId && row.verified !== true;
}

/**
 * Whether a component is visible to this viewer. Mirrors the catalog query in
 * getComponents() — keep the two in sync.
 */
export function canViewComponent(viewer: Viewer, row: OwnableComponent): boolean {
  if (row.created_by === null || row.verified === true) return true;
  if (viewer.admin) return true;
  return !!viewer.userId && row.created_by === viewer.userId;
}
