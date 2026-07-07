import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS; the ONLY way to touch the staging
// tables (they have RLS enabled with zero policies). Local copy of
// web/lib/supabase-admin.ts.
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { persistSession: false } }
  );
}
