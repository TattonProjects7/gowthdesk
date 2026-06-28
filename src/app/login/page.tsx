"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TrendingDown, Loader2, Mail } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function Login() {
  const { enabled, supabase } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;
        setMsg("Check your email to confirm your account, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/tracker");
        router.refresh();
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const magicLink = async () => {
    if (!supabase || !email) {
      setErr("Enter your email first.");
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
    setBusy(false);
    if (error) setErr(error.message);
    else setMsg("Magic link sent — check your inbox.");
  };

  return (
    <div className="min-h-screen bg-ink-950 flex flex-col items-center justify-center px-6">
      <Link href="/" className="flex items-center gap-2.5 mb-8">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-600 text-white">
          <TrendingDown className="h-5 w-5" />
        </div>
        <span className="font-bold text-xl text-white">Shortlist</span>
      </Link>

      <div className="w-full max-w-sm rounded-2xl border border-ink-800 bg-ink-900 p-6">
        {!enabled ? (
          <div className="text-center">
            <p className="text-white font-semibold mb-2">Accounts aren’t enabled yet</p>
            <p className="text-sm text-ink-400 mb-4">
              Shortlist runs in local mode — your tracked shorts live in this browser. Add Supabase keys (see SETUP.md) to
              turn on cloud accounts.
            </p>
            <Link href="/" className="text-rose-400 hover:underline text-sm">
              ← Back to the scanner
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-lg font-bold text-white mb-1">{mode === "signin" ? "Sign in" : "Create your account"}</h1>
            <p className="text-sm text-ink-400 mb-5">Your shortlist, alerts and stats — synced across devices.</p>

            <form onSubmit={submit} className="space-y-3">
              <input
                type="email"
                required
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm text-white placeholder-ink-500 focus:border-rose-600 focus:outline-none"
              />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm text-white placeholder-ink-500 focus:border-rose-600 focus:outline-none"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "signin" ? "Sign in" : "Sign up"}
              </button>
            </form>

            <button onClick={magicLink} disabled={busy} className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-ink-700 px-4 py-2.5 text-sm text-ink-200 hover:bg-ink-800">
              <Mail className="h-4 w-4" /> Email me a magic link
            </button>

            {msg && <p className="mt-4 text-sm text-emerald-400">{msg}</p>}
            {err && <p className="mt-4 text-sm text-rose-400">{err}</p>}

            <p className="mt-5 text-center text-sm text-ink-400">
              {mode === "signin" ? "No account? " : "Already have one? "}
              <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-rose-400 hover:underline">
                {mode === "signin" ? "Sign up" : "Sign in"}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
