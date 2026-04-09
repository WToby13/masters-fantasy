"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import type { Tournament, Profile, Pool, PoolMember } from "@/lib/types";
import { LogOut, Loader2, Link2, Check, ChevronRight } from "lucide-react";
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
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  function copyLink(pool: Pool) {
    const url = `${window.location.origin}/join/${pool.invite_code}`;
    navigator.clipboard.writeText(url);
    setCopiedId(pool.id);
    setTimeout(() => setCopiedId(null), 2500);
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
          Create a new pool or join one with an invite link.
        </p>

        {/* Existing pools */}
        {userPools.length > 0 && (
          <div className="space-y-2 mb-6">
            {userPools.map((m) => (
              <div key={m.pool.id} className="card-interactive group">
                <button
                  onClick={() => router.push(`/pool/${m.pool.id}`)}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left"
                >
                  <div>
                    <p className="text-sm font-semibold text-masters-green">
                      {m.pool.name}
                    </p>
                    <p className="text-[10px] text-masters-green/40 mt-0.5">
                      Code: {m.pool.invite_code}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-masters-green/20 group-hover:text-masters-green transition-colors" />
                </button>
                <div className="px-4 pb-3 -mt-1">
                  <button
                    onClick={() => copyLink(m.pool)}
                    className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full transition-all ${
                      copiedId === m.pool.id
                        ? "bg-masters-green text-white"
                        : "bg-masters-sand text-masters-green/60 hover:bg-masters-green-light hover:text-masters-green"
                    }`}
                  >
                    {copiedId === m.pool.id ? (
                      <>
                        <Check className="w-3 h-3" /> Link copied!
                      </>
                    ) : (
                      <>
                        <Link2 className="w-3 h-3" /> Copy invite link
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create / Join */}
        {mode === "list" && (
          <div className="flex gap-3">
            <button
              onClick={() => setMode("create")}
              className="btn-primary flex-1"
            >
              Create Pool
            </button>
            <button
              onClick={() => setMode("join")}
              className="btn-outline flex-1"
            >
              Join Pool
            </button>
          </div>
        )}

        {mode === "create" && (
          <div className="card p-5 space-y-4">
            <p className="text-sm font-semibold text-masters-green">
              Create a New Pool
            </p>
            <input
              type="text"
              className="input-field"
              placeholder="Pool name (e.g. The Boys)"
              value={poolName}
              onChange={(e) => setPoolName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
            {error && (
              <p className="text-xs text-masters-gold bg-masters-sand rounded-md px-3 py-2">
                {error}
              </p>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={handleCreate}
                disabled={!poolName.trim() || loading}
                className="btn-primary"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Create
              </button>
              <button
                onClick={() => {
                  setMode("list");
                  setError("");
                }}
                className="btn-ghost"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {mode === "join" && (
          <div className="card p-5 space-y-4">
            <p className="text-sm font-semibold text-masters-green">
              Join a Pool
            </p>
            <input
              type="text"
              className="input-field uppercase tracking-[0.25em] text-center font-mono text-lg"
              placeholder="INVITE CODE"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              maxLength={6}
              autoFocus
            />
            {error && (
              <p className="text-xs text-masters-gold bg-masters-sand rounded-md px-3 py-2">
                {error}
              </p>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={handleJoin}
                disabled={!inviteCode.trim() || loading}
                className="btn-primary"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Join
              </button>
              <button
                onClick={() => {
                  setMode("list");
                  setError("");
                }}
                className="btn-ghost"
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
