"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Pool } from "@/lib/types";
import { Loader2 } from "lucide-react";

export default function JoinClient({
  pool,
  isLoggedIn,
}: {
  pool: Pool;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleJoin() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/pools/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: pool.invite_code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/pool/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-masters-cream flex flex-col items-center justify-center px-4">
      <div className="card p-8 max-w-sm w-full text-center">
        <p className="text-[10px] text-masters-gold font-semibold tracking-[0.2em] uppercase mb-2">
          You&apos;re invited to
        </p>
        <h1 className="text-2xl font-bold text-masters-green mb-1">
          {pool.name}
        </h1>
        <p className="text-xs text-masters-green/40 mb-6">
          Masters Fantasy Pool
        </p>

        {error && (
          <p className="text-xs text-masters-gold mb-4 bg-masters-sand rounded px-3 py-2">
            {error}
          </p>
        )}

        {isLoggedIn ? (
          <button
            onClick={handleJoin}
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Join Pool
          </button>
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => router.push(`/?next=/join/${pool.invite_code}`)}
              className="btn-primary w-full"
            >
              Sign up & Join
            </button>
            <p className="text-[11px] text-masters-green/40">
              Already have an account?{" "}
              <button
                onClick={() =>
                  router.push(`/?next=/join/${pool.invite_code}`)
                }
                className="text-masters-green underline underline-offset-2"
              >
                Sign in
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
