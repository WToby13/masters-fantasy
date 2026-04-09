"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AuthForm({ redirectTo }: { redirectTo?: string }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
      router.push(redirectTo || "/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-6">
      <h2 className="text-lg font-bold text-masters-green mb-1">
        {mode === "login" ? "Welcome Back" : "Join the Pool"}
      </h2>
      <p className="text-xs text-masters-green/40 mb-5">
        {mode === "login"
          ? "Sign in to manage your picks"
          : "Create your account to start drafting"}
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "signup" && (
          <div>
            <label className="block text-xs font-semibold text-masters-green/70 mb-1">
              Display Name
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Tiger"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>
        )}
        <div>
          <label className="block text-xs font-semibold text-masters-green/70 mb-1">
            Email
          </label>
          <input
            type="email"
            className="input-field"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-masters-green/70 mb-1">
            Password
          </label>
          <input
            type="password"
            className="input-field"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        {error && (
          <p className="text-xs text-masters-gold bg-masters-sand border border-masters-beige rounded px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {mode === "login" ? "Sign In" : "Create Account"}
        </button>
      </form>

      <button
        onClick={() => {
          setMode(mode === "login" ? "signup" : "login");
          setError("");
        }}
        className="mt-4 w-full text-center text-xs text-masters-green/60 hover:text-masters-green underline underline-offset-2"
      >
        {mode === "login"
          ? "Need an account? Sign up"
          : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
