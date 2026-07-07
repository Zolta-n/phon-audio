"use client";

import { useState } from "react";
import { createClient } from "../../lib/supabase";

// Password sign-in (not magic-link): the admin box may not have inbox access.
// The account password is set out-of-band via the service key — see README.
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Full navigation so the server sees the fresh session cookies.
    window.location.assign("/");
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold">Admin sign-in</h1>
          <p className="text-adm-muted text-sm mt-1">
            Allowlisted admin accounts only.
          </p>
        </div>

        <div className="adm-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="adm-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="adm-input"
              />
            </div>
            {error && <p className="text-sm text-adm-err">{error}</p>}
            <button type="submit" disabled={loading} className="adm-btn adm-btn-primary w-full justify-center">
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
