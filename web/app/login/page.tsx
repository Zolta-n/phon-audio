"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
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

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/builder");
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-pa-accent text-3xl" style={{ fontFamily: "var(--pa-font-display)" }}>Ω</span>
          <h1 className="text-2xl font-bold text-pa-text mt-3 mb-1" style={{ fontFamily: "var(--pa-font-display)" }}>Sign in to Phon.Audio</h1>
          <p className="text-pa-muted text-sm">Save and share your signal chains</p>
        </div>

        <div className="bg-pa-cream rounded-xl border border-pa-border p-8" style={{ boxShadow: "var(--pa-shadow-md)" }}>
          {sent ? (
            <div className="text-center">
              <p className="text-pa-accent text-2xl mb-3" style={{ fontFamily: "var(--pa-font-display)" }}>Ω</p>
              <p className="font-semibold text-pa-text mb-2">Check your inbox</p>
              <p className="text-sm text-pa-muted mb-5">
                We sent a link and a 6-digit code to <strong>{email}</strong>.
                Click the link, or enter the code below if your email provider
                pre-scans links.
              </p>
              <form onSubmit={handleVerifyCode} className="space-y-4 text-left">
                <div>
                  <label className="block text-sm font-medium text-pa-text mb-1.5">
                    6-digit code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="123456"
                    className="pa-input"
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
                  className="pa-btn pa-btn-primary w-full"
                >
                  {loading ? "Verifying…" : "Verify code"}
                </button>
              </form>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-pa-text mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pa-input"
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
                className="pa-btn pa-btn-primary w-full"
              >
                {loading ? "Sending…" : "Send magic link"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-pa-muted mt-6">
          By signing in you agree to our terms.{" "}
          <Link href="/builder" className="underline hover:text-pa-accent-deep">
            Continue without account
          </Link>
        </p>
      </div>
    </div>
  );
}
