"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-blue-500 text-3xl">◎</span>
          <h1 className="text-2xl font-bold text-slate-900 mt-3 mb-1">Sign in to Phon.Audio</h1>
          <p className="text-slate-500 text-sm">Save and share your signal chains</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          {sent ? (
            <div className="text-center">
              <p className="text-2xl mb-3">📬</p>
              <p className="font-semibold text-slate-800 mb-2">Check your inbox</p>
              <p className="text-sm text-slate-500">
                We sent a magic link to <strong>{email}</strong>.
                Click it to sign in — no password needed.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-700 disabled:bg-slate-300 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
              >
                {loading ? "Sending…" : "Send magic link"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          By signing in you agree to our terms.{" "}
          <Link href="/builder" className="underline hover:text-slate-600">
            Continue without account
          </Link>
        </p>
      </div>
    </div>
  );
}
