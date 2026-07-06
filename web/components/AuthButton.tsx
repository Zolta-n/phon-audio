"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null;

  if (!user) {
    return (
      <Link
        href="/login"
        className="pa-navlink"
        style={{
          color: "var(--pa-cream)",
          borderBottom: "1px solid var(--pa-accent)",
          paddingBottom: "3px",
        }}
      >
        Sign in
      </Link>
    );
  }

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const displayName = user.email?.split("@")[0] ?? "User";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <Link href="/saved" className="pa-navlink">
        My Chains
      </Link>
      <span style={{
        color: "var(--pa-accent)",
        fontSize: "0.72rem",
        letterSpacing: "0.08em",
        fontFamily: "var(--pa-font-ui)",
      }}>
        {displayName}
      </span>
      <button
        onClick={handleSignOut}
        className="pa-btn"
        style={{
          padding: "5px 12px",
          fontSize: "0.6rem",
          color: "var(--pa-navtext)",
          borderColor: "rgba(217,119,6,0.3)",
          background: "transparent",
        }}
      >
        Sign out
      </button>
    </div>
  );
}
