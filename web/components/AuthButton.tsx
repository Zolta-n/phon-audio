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
      <Link href="/login" style={{
        color: "#d97706",
        textDecoration: "none",
        fontSize: "0.875rem",
        fontFamily: "var(--pa-font-ui)",
        letterSpacing: "0.05em",
      }}>
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
      <Link href="/saved" style={{
        color: "#a08060",
        textDecoration: "none",
        fontSize: "0.875rem",
        fontFamily: "var(--pa-font-ui)",
        letterSpacing: "0.05em",
      }}>
        My Chains
      </Link>
      <span style={{
        color: "#d97706",
        fontSize: "0.8rem",
        fontFamily: "var(--pa-font-ui)",
      }}>
        {displayName}
      </span>
      <button
        onClick={handleSignOut}
        style={{
          background: "none",
          border: "1px solid rgba(201,111,18,0.3)",
          borderRadius: "4px",
          color: "#a08060",
          padding: "4px 10px",
          fontSize: "0.75rem",
          cursor: "pointer",
          fontFamily: "var(--pa-font-ui)",
        }}
      >
        Sign out
      </button>
    </div>
  );
}
