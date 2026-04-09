"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import type { Tournament, Golfer, Profile, Pick, Pool } from "@/lib/types";
import { TIER_LABELS, NUM_TIERS, BEST_OF } from "@/lib/types";
import { LogOut, Loader2, ArrowLeft, Copy, Check } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface Props {
  user: User;
  profile: Profile;
  tournament: Tournament | null;
  golfers: Golfer[];
  userPicks: Pick[];
  allPicks: (Pick & { golfer: Golfer; profile: Profile })[];
  allProfiles: Profile[];
  pool: Pool;
}

function effectiveScore(golfer: Golfer): number {
  if (
    golfer.status === "cut" ||
    golfer.status === "withdrawn" ||
    golfer.status === "disqualified"
  ) {
    return (golfer.score_r1 ?? 0) + (golfer.score_r2 ?? 0) + 80 + 80;
  }
  return golfer.total_score ?? 0;
}

export default function DashboardClient({
  user,
  profile,
  tournament,
  golfers,
  userPicks,
  allPicks,
  allProfiles,
  pool,
}: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [codeCopied, setCodeCopied] = useState(false);
  const [selections, setSelections] = useState<Record<number, string>>(() => {
    const map: Record<number, string> = {};
    userPicks.forEach((p) => {
      map[p.tier] = p.golfer_id;
    });
    return map;
  });
  const [tiebreaker, setTiebreaker] = useState(
    profile?.tiebreaker_score?.toString() ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"picks" | "leaderboard">(
    userPicks.length === NUM_TIERS ? "leaderboard" : "picks"
  );

  const hasPicks = userPicks.length === NUM_TIERS;
  const isDraftOpen =
    tournament?.status === "drafting" || tournament?.status === "upcoming";

  const golfersByTier = useMemo(() => {
    const map: Record<number, Golfer[]> = {};
    for (let t = 1; t <= NUM_TIERS; t++) map[t] = [];
    golfers.forEach((g) => map[g.tier]?.push(g));
    return map;
  }, [golfers]);

  const leaderboard = useMemo(() => {
    const profileMap = new Map(allProfiles.map((p) => [p.id, p]));
    const grouped: Record<string, { golfer: Golfer; tier: number }[]> = {};

    allPicks.forEach((p) => {
      if (!grouped[p.user_id]) grouped[p.user_id] = [];
      grouped[p.user_id].push({ golfer: p.golfer, tier: p.tier });
    });

    return Object.entries(grouped)
      .map(([userId, picks]) => {
        const scores = picks
          .map((p) => ({ ...p, score: effectiveScore(p.golfer) }))
          .sort((a, b) => a.score - b.score);
        const best = scores.slice(0, BEST_OF);
        const total = best.reduce((s, p) => s + p.score, 0);
        const prof = profileMap.get(userId);
        const tb = prof?.tiebreaker_score;
        const tbDiff =
          tb != null && tournament?.winning_score != null
            ? Math.abs(tb - tournament.winning_score)
            : null;

        return {
          userId,
          profile: prof,
          picks: scores,
          bestIds: new Set(best.map((p) => p.golfer.id)),
          total,
          tiebreakerDiff: tbDiff,
        };
      })
      .filter((e) => e.picks.length === NUM_TIERS)
      .sort((a, b) => {
        if (a.total !== b.total) return a.total - b.total;
        if (a.tiebreakerDiff != null && b.tiebreakerDiff != null)
          return a.tiebreakerDiff - b.tiebreakerDiff;
        return 0;
      });
  }, [allPicks, allProfiles, tournament]);

  async function handleSave() {
    if (Object.keys(selections).length !== NUM_TIERS) return;
    setSaving(true);
    try {
      for (let tier = 1; tier <= NUM_TIERS; tier++) {
        const existing = userPicks.find((p) => p.tier === tier);
        if (existing) {
          await supabase
            .from("picks")
            .update({ golfer_id: selections[tier] })
            .eq("id", existing.id);
        } else {
          await supabase.from("picks").insert({
            user_id: user.id,
            tournament_id: tournament!.id,
            pool_id: pool.id,
            golfer_id: selections[tier],
            tier,
          });
        }
      }
      if (tiebreaker) {
        await supabase
          .from("profiles")
          .update({ tiebreaker_score: parseInt(tiebreaker) })
          .eq("id", user.id);
      }
      router.refresh();
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card p-10 text-center max-w-sm">
          <p className="font-semibold text-masters-green">
            No Active Tournament
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Check back when the pool opens.
          </p>
        </div>
      </div>
    );
  }

  const isLive =
    tournament.status !== "upcoming" && tournament.status !== "drafting";

  return (
    <div className="min-h-screen bg-masters-cream flex flex-col">
      {/* Header */}
      <header className="bg-masters-green text-white">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-white/40 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <span className="text-masters-yellow text-xs font-semibold tracking-[0.15em] uppercase">
                {pool.name}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-white/30 text-[10px]">
                  {tournament.name} &middot; Code: {pool.invite_code}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(pool.invite_code);
                    setCodeCopied(true);
                    setTimeout(() => setCodeCopied(false), 2000);
                  }}
                  className="text-white/20 hover:text-white/60 transition-colors"
                >
                  {codeCopied ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
          </div>
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

      {/* Tabs */}
      <div className="max-w-7xl mx-auto w-full px-4 pt-4 flex items-center justify-between">
        <nav className="flex gap-0.5 bg-masters-sand rounded-md p-0.5">
          {(["picks", "leaderboard"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded text-xs font-semibold transition-all ${
                tab === t
                  ? "bg-masters-green text-white"
                  : "text-masters-green/60 hover:text-masters-green"
              }`}
            >
              {t === "picks"
                ? hasPicks && !isDraftOpen
                  ? "My Team"
                  : "Draft"
                : "Leaderboard"}
            </button>
          ))}
        </nav>
        <p className="text-[11px] text-masters-green/40 hidden sm:block">
          Best {BEST_OF} of {NUM_TIERS} &middot; Lowest wins
        </p>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto w-full px-4 py-4 flex-1">
        {tab === "picks" && (
          <>
            {hasPicks && !isDraftOpen ? (
              <TeamView
                picks={userPicks}
                golfers={golfers}
                profile={profile}
                tournament={tournament}
                isLive={isLive}
              />
            ) : (
              <div>
                {/* Tier grid — each card shows all players with radio select */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {Array.from({ length: NUM_TIERS }, (_, i) => i + 1).map(
                    (tier) => (
                      <TierCard
                        key={tier}
                        tier={tier}
                        golfers={golfersByTier[tier] || []}
                        selected={selections[tier] || null}
                        onSelect={(id) =>
                          setSelections((s) => ({ ...s, [tier]: id }))
                        }
                      />
                    )
                  )}

                  {/* Tiebreaker */}
                  <div className="card overflow-hidden">
                    <div className="px-3 py-2 bg-masters-sand border-b border-masters-beige">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-masters-green">
                        Tiebreaker
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-gray-400 mb-2">
                        Predict the winning score (vs par)
                      </p>
                      <input
                        type="number"
                        className="input-field"
                        placeholder="e.g. -12"
                        value={tiebreaker}
                        onChange={(e) => setTiebreaker(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <div className="mt-4">
                  <button
                    onClick={handleSave}
                    disabled={
                      Object.keys(selections).length !== NUM_TIERS || saving
                    }
                    className="btn-masters flex items-center gap-2"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {saving
                      ? "Saving..."
                      : `Submit Picks (${Object.keys(selections).length}/${NUM_TIERS})`}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {tab === "leaderboard" && (
          <LeaderboardView
            leaderboard={leaderboard}
            currentUserId={user.id}
            tournament={tournament}
            isLive={isLive}
          />
        )}
      </div>
    </div>
  );
}

/* ── Tier Card with radio select ────────────────────────── */

function TierCard({
  tier,
  golfers,
  selected,
  onSelect,
}: {
  tier: number;
  golfers: Golfer[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="px-3 py-2 bg-masters-sand border-b border-masters-beige flex items-baseline gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-masters-green">
          Tier {tier}
        </span>
        <span className="text-[10px] text-masters-green/50">
          {TIER_LABELS[tier]}
        </span>
      </div>
      <div className="divide-y divide-masters-beige/50">
        {golfers.map((g) => {
          const isSelected = selected === g.id;
          return (
            <button
              key={g.id}
              onClick={() => onSelect(g.id)}
              className={`w-full px-3 py-1.5 flex items-center gap-2 text-left transition-colors ${
                isSelected
                  ? "bg-masters-green-light"
                  : "hover:bg-masters-sand/50"
              }`}
            >
              <span
                className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  isSelected
                    ? "border-masters-green"
                    : "border-masters-beige"
                }`}
              >
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-masters-green" />
                )}
              </span>
              <span
                className={`text-[13px] truncate ${
                  isSelected
                    ? "font-semibold text-masters-green"
                    : "text-foreground"
                }`}
              >
                {g.name}
              </span>
              <span className="text-[10px] text-masters-green/30 ml-auto shrink-0 font-sans">
                #{g.world_ranking}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Team View ──────────────────────────────────────────── */

function TeamView({
  picks,
  golfers,
  profile,
  tournament,
  isLive,
}: {
  picks: Pick[];
  golfers: Golfer[];
  profile: Profile;
  tournament: Tournament;
  isLive: boolean;
}) {
  const golferMap = new Map(golfers.map((g) => [g.id, g]));
  const withScores = picks
    .map((p) => {
      const g = golferMap.get(p.golfer_id)!;
      return { pick: p, golfer: g, score: effectiveScore(g) };
    })
    .sort((a, b) => a.pick.tier - b.pick.tier);

  const sorted = [...withScores].sort((a, b) => a.score - b.score);
  const bestIds = new Set(sorted.slice(0, BEST_OF).map((p) => p.golfer.id));
  const total = sorted.slice(0, BEST_OF).reduce((s, p) => s + p.score, 0);

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 bg-masters-green text-white flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">{profile.display_name}</p>
          {profile.tiebreaker_score != null && (
            <p className="text-[11px] text-white/50">
              Tiebreaker: {profile.tiebreaker_score}
            </p>
          )}
        </div>
        {isLive && (
          <p className="text-xl font-bold text-masters-yellow font-sans">
            {total}
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {withScores.map(({ pick, golfer, score }) => {
          const counts = bestIds.has(golfer.id);
          return (
            <div
              key={pick.id}
              className={`px-3 py-2.5 border-b border-r border-masters-beige/50 flex items-center justify-between ${
                !counts && isLive ? "opacity-30" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="text-[10px] text-masters-green/40 uppercase tracking-wider font-sans">
                  T{pick.tier} &middot; {TIER_LABELS[pick.tier]}
                </p>
                <p className="text-sm font-medium truncate">{golfer.name}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {counts && isLive && (
                  <span className="text-[8px] bg-masters-green-light text-masters-green px-1.5 py-0.5 rounded font-bold">
                    COUNTS
                  </span>
                )}
                {golfer.status === "cut" && (
                  <span className="text-[9px] text-masters-gold font-bold font-sans">
                    CUT
                  </span>
                )}
                {isLive && (
                  <span className="text-sm font-semibold font-sans tabular-nums text-masters-green">
                    {score}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {isLive && (
        <div className="px-4 py-3 bg-masters-sand flex justify-between items-center border-t border-masters-beige">
          <span className="text-sm font-semibold text-masters-green">
            Total (Best {BEST_OF})
          </span>
          <span className="text-xl font-bold text-masters-green font-sans">
            {total}
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Leaderboard ────────────────────────────────────────── */

function LeaderboardView({
  leaderboard,
  currentUserId,
  tournament,
  isLive,
}: {
  leaderboard: {
    userId: string;
    profile?: Profile;
    picks: { golfer: Golfer; tier: number; score: number }[];
    bestIds: Set<string>;
    total: number;
    tiebreakerDiff: number | null;
  }[];
  currentUserId: string;
  tournament: Tournament;
  isLive: boolean;
}) {
  const [expanded, setExpanded] = useState<string | null>(currentUserId);

  if (leaderboard.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-sm text-masters-green/40">
          No complete teams yet. Be the first to submit!
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-2.5 bg-masters-sand border-b border-masters-beige flex items-center justify-between">
        <span className="text-[10px] font-bold text-masters-green uppercase tracking-wider">
          Leaderboard
        </span>
        {tournament.winning_score != null && (
          <span className="text-[10px] text-masters-green/40">
            Winning score: {tournament.winning_score}
          </span>
        )}
      </div>

      <div className="divide-y divide-masters-beige/40">
        {leaderboard.map((entry, idx) => {
          const rank = idx + 1;
          const isMe = entry.userId === currentUserId;
          const isOpen = expanded === entry.userId;

          return (
            <div key={entry.userId}>
              <button
                onClick={() =>
                  setExpanded(isOpen ? null : entry.userId)
                }
                className={`w-full px-4 py-2.5 flex items-center gap-3 transition-colors ${
                  isMe
                    ? "bg-masters-green-light/50 hover:bg-masters-green-light"
                    : "hover:bg-masters-sand/50"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    rank <= 3
                      ? "bg-masters-yellow text-masters-green"
                      : "bg-masters-sand text-masters-green/60"
                  }`}
                >
                  {rank}
                </span>
                <span className="text-sm font-medium text-left flex-1 truncate">
                  {entry.profile?.display_name ?? "Unknown"}
                  {isMe && (
                    <span className="text-[10px] text-masters-green/50 ml-1">
                      (you)
                    </span>
                  )}
                </span>
                {entry.profile?.tiebreaker_score != null && (
                  <span className="text-[10px] text-masters-green/30 font-sans hidden sm:block">
                    TB: {entry.profile.tiebreaker_score}
                    {entry.tiebreakerDiff != null &&
                      ` (±${entry.tiebreakerDiff})`}
                  </span>
                )}
                <span className="text-base font-bold text-masters-green font-sans tabular-nums">
                  {isLive ? entry.total : "—"}
                </span>
              </button>

              {isOpen && (
                <div className="px-4 pb-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
                  {entry.picks
                    .sort((a, b) => a.tier - b.tier)
                    .map((p) => {
                      const counts = entry.bestIds.has(p.golfer.id);
                      return (
                        <div
                          key={p.golfer.id}
                          className={`rounded px-2 py-1.5 bg-masters-sand ${
                            !counts && isLive ? "opacity-25" : ""
                          }`}
                        >
                          <p className="text-[9px] text-masters-green/40 font-sans uppercase">
                            T{p.tier} · {TIER_LABELS[p.tier]}
                          </p>
                          <p className="text-xs font-medium text-masters-green truncate">
                            {p.golfer.name}
                          </p>
                          {(isLive || p.golfer.status === "cut") && (
                            <div className="flex items-center justify-between mt-0.5">
                              {p.golfer.status === "cut" && (
                                <span className="text-[9px] text-masters-gold font-bold">
                                  CUT
                                </span>
                              )}
                              {isLive && (
                                <span className="text-[11px] font-semibold font-sans ml-auto text-masters-green">
                                  {p.score}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
