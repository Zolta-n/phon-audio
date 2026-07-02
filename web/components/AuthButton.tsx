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
      <Link href="/login" className="pa-navlink pa-navlink--accent">
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
        fontSize: "0.8rem",
        fontFamily: "var(--pa-font-ui)",
      }}>
        {displayName}
      </span>
      <button
        onClick={handleSignOut}
        className="pa-btn pa-btn-outline-light"
        style={{
          padding: "4px 10px",
          fontSize: "0.75rem",
          fontWeight: 400,
          color: "#a08060",
          borderColor: "rgba(217,119,6,0.3)",
          borderRadius: "var(--pa-radius-sm)",
        }}
      >
        Sign out
      </button>
    </div>
  );
}
