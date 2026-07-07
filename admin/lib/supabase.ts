import { createBrowserClient } from "@supabase/ssr";

// Browser client (for client components). Local copy of web/lib/supabase.ts:
// framework-coupled helpers are duplicated per app so each app bundles its own
// next/react copies (see admin/README.md).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
