"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import type { Tournament, Profile, Pool, PoolMember } from "@/lib/types";
import { LogOut, Loader2, Copy, Check } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface Props {
  user: User;
  profile: Profile;
  tournament: Tournament | null;
  userPools: (PoolMember & { pool: Pool })[];
}

export default function PoolLobby({
  user,
  profile,
  tournament,
  userPools,
}: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [mode, setMode] = useState<"list" | "create" | "join">("list");
  const [poolName, setPoolName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  async function handleCreate() {
    if (!poolName.trim() || !tournament) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/pools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: poolName.trim(),
          tournament_id: tournament.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/pool/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create pool");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!inviteCode.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/pools/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: inviteCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/pool/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join pool");
    } finally {
      setLoading(false);
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-masters-cream">
        <div className="card p-10 text-center max-w-sm">
          <p className="font-semibold text-masters-green">
            No Active Tournament
          </p>
          <p className="text-sm text-masters-green/40 mt-1">
            Check back when the pool opens.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-masters-cream flex flex-col">
      <header className="bg-masters-green text-white">
        <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <span className="text-masters-yellow text-xs font-semibold tracking-[0.15em] uppercase">
            {tournament.name}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-white/60 text-xs">
              {profile?.display_name}
            </span>
            <button
              onClick={handleLogout}
              className="text-white/40 hover:text-white transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>
      <div className="divider-gold" />

      <div className="max-w-lg mx-auto w-full px-4 py-8 flex-1">
        <h2 className="text-lg font-bold text-masters-green mb-1">
          Your Pools
        </h2>
        <p className="text-xs text-masters-green/40 mb-6">
          Create a new pool or join one with an invite code.
        </p>

        {/* Existing pools */}
        {userPools.length > 0 && (
          <div className="space-y-2 mb-6">
            {userPools.map((m) => (
              <button
                key={m.pool.id}
                onClick={() => router.push(`/pool/${m.pool.id}`)}
                className="card w-full px-4 py-3 flex items-center justify-between hover:bg-masters-sand/50 transition-colors text-left"
              >
                <div>
                  <p className="text-sm font-semibold text-masters-green">
                    {m.pool.name}
                  </p>
                  <p className="text-[10px] text-masters-green/40 mt-0.5">
                    Code: {m.pool.invite_code}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyCode(m.pool.invite_code);
                    }}
                    className="text-masters-green/30 hover:text-masters-green transition-colors p-1"
                    title="Copy invite code"
                  >
                    {copied === m.pool.invite_code ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <span className="text-xs text-masters-green/40">→</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Create / Join */}
        {mode === "list" && (
          <div className="flex gap-2">
            <button
              onClick={() => setMode("create")}
              className="btn-masters flex-1"
            >
              Create Pool
            </button>
            <button
              onClick={() => setMode("join")}
              className="flex-1 px-4 py-2.5 rounded-md text-sm font-semibold border border-masters-green text-masters-green hover:bg-masters-green-light transition-colors"
            >
              Join Pool
            </button>
          </div>
        )}

        {mode === "create" && (
          <div className="card p-4 space-y-3">
            <p className="text-sm font-semibold text-masters-green">
              Create a New Pool
            </p>
            <input
              type="text"
              className="input-field"
              placeholder="Pool name (e.g. The Boys)"
              value={poolName}
              onChange={(e) => setPoolName(e.target.value)}
              autoFocus
            />
            {error && (
              <p className="text-xs text-masters-gold">{error}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={!poolName.trim() || loading}
                className="btn-masters flex items-center gap-2"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Create
              </button>
              <button
                onClick={() => {
                  setMode("list");
                  setError("");
                }}
                className="text-xs text-masters-green/40 hover:text-masters-green"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {mode === "join" && (
          <div className="card p-4 space-y-3">
            <p className="text-sm font-semibold text-masters-green">
              Join a Pool
            </p>
            <input
              type="text"
              className="input-field uppercase tracking-widest text-center font-mono"
              placeholder="INVITE CODE"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              maxLength={6}
              autoFocus
            />
            {error && (
              <p className="text-xs text-masters-gold">{error}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleJoin}
                disabled={!inviteCode.trim() || loading}
                className="btn-masters flex items-center gap-2"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Join
              </button>
              <button
                onClick={() => {
                  setMode("list");
                  setError("");
                }}
                className="text-xs text-masters-green/40 hover:text-masters-green"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
