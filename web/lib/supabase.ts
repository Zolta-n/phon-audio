import { createBrowserClient } from "@supabase/ssr";

// Browser client (for client components)
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Server client: import from "@/lib/supabase-server" in server components/routes.
// Service-role client: import from "@/lib/supabase-admin" (server-only).
