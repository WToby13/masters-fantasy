"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import type { Tournament, Golfer, Profile, Pick } from "@/lib/types";
import { TIER_COLORS, TIER_LABELS, NUM_TIERS, BEST_OF } from "@/lib/types";
import { LogOut, Trophy, Loader2, Scissors } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface Props {
  user: User;
  profile: Profile;
  tournament: Tournament | null;
  golfers: Golfer[];
  userPicks: Pick[];
  allPicks: (Pick & { golfer: Golfer; profile: Profile })[];
  allProfiles: Profile[];
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
}: Props) {
  const supabase = createClient();
  const router = useRouter();
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
          .map((p) => ({
            ...p,
            score: effectiveScore(p.golfer),
          }))
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
      <div className="min-h-screen flex items-center justify-center bg-masters-cream">
        <div className="card p-10 text-center max-w-sm">
          <p className="text-lg font-semibold text-masters-dark mb-1">
            No Active Tournament
          </p>
          <p className="text-sm text-gray-400">
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
      <header className="bg-masters-dark text-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-masters-yellow text-xs font-semibold tracking-[0.2em] uppercase">
              {tournament.name}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-green-200/80 text-xs">
              {profile?.display_name}
            </span>
            <button
              onClick={handleLogout}
              className="text-green-200/60 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>
      <div className="divider-gold" />

      {/* Tabs */}
      <div className="max-w-7xl mx-auto w-full px-4 pt-4 flex items-center gap-4">
        <nav className="flex gap-1 bg-white/80 rounded-lg p-0.5 border border-gray-100">
          {(["picks", "leaderboard"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${
                tab === t
                  ? "bg-masters-green text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
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
        <p className="text-[11px] text-gray-400 ml-auto hidden sm:block">
          Pick 1 per tier &middot; Best {BEST_OF} of {NUM_TIERS} count &middot;
          Lowest wins
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
              <div className="space-y-4">
                {/* Tier Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {Array.from({ length: NUM_TIERS }, (_, i) => i + 1).map(
                    (tier) => {
                      const color = TIER_COLORS[tier];
                      const selected = golfers.find(
                        (g) => g.id === selections[tier]
                      );
                      return (
                        <div
                          key={tier}
                          className={`card overflow-hidden border ${
                            selected ? color.border : ""
                          }`}
                        >
                          <div
                            className={`px-3 py-2 flex items-center gap-2 ${color.bg}`}
                          >
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider ${color.text}`}
                            >
                              Tier {tier}
                            </span>
                            <span
                              className={`text-[10px] ${color.text} opacity-60`}
                            >
                              {TIER_LABELS[tier]}
                            </span>
                          </div>
                          <div className="p-2">
                            <select
                              value={selections[tier] || ""}
                              onChange={(e) =>
                                setSelections((s) => ({
                                  ...s,
                                  [tier]: e.target.value,
                                }))
                              }
                              className="w-full text-sm py-1.5 px-2 rounded border border-gray-200 bg-white focus:outline-none focus:border-masters-green focus:ring-1 focus:ring-masters-green/20 appearance-none cursor-pointer"
                            >
                              <option value="">Select golfer...</option>
                              {golfersByTier[tier]?.map((g) => (
                                <option key={g.id} value={g.id}>
                                  {g.name} (#{g.world_ranking})
                                </option>
                              ))}
                            </select>
                            {selected && (
                              <p className="text-[11px] text-masters-green font-medium mt-1.5 px-0.5 truncate">
                                {selected.name}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    }
                  )}

                  {/* Tiebreaker card in the grid */}
                  <div className="card overflow-hidden sm:col-span-2 lg:col-span-1">
                    <div className="px-3 py-2 bg-masters-sand">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-masters-dark">
                        Tiebreaker
                      </span>
                    </div>
                    <div className="p-2">
                      <input
                        type="number"
                        className="w-full text-sm py-1.5 px-2 rounded border border-gray-200 bg-white focus:outline-none focus:border-masters-green focus:ring-1 focus:ring-masters-green/20"
                        placeholder="e.g. -12"
                        value={tiebreaker}
                        onChange={(e) => setTiebreaker(e.target.value)}
                      />
                      <p className="text-[10px] text-gray-400 mt-1.5 px-0.5">
                        Predict the winning score
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <button
                  onClick={handleSave}
                  disabled={
                    Object.keys(selections).length !== NUM_TIERS || saving
                  }
                  className="btn-masters w-full sm:w-auto flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving
                    ? "Saving..."
                    : `Submit Picks (${Object.keys(selections).length}/${NUM_TIERS})`}
                </button>
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

/* ── Team View ─────────────────────────────────────────── */

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
      <div className="px-4 py-3 bg-masters-dark text-white flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">{profile.display_name}</p>
          {profile.tiebreaker_score != null && (
            <p className="text-[11px] text-green-200/70">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 divide-gray-50">
        {withScores.map(({ pick, golfer, score }) => {
          const color = TIER_COLORS[pick.tier];
          const counts = bestIds.has(golfer.id);
          return (
            <div
              key={pick.id}
              className={`px-3 py-2.5 flex items-center justify-between border-b border-gray-50 sm:border-b-0 sm:border-r last:border-r-0 ${
                !counts && isLive ? "opacity-35" : ""
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${color.bg} ${color.text}`}
                >
                  {pick.tier}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{golfer.name}</p>
                  <p className="text-[10px] text-gray-400">
                    {TIER_LABELS[pick.tier]}
                    {golfer.status === "cut" && (
                      <span className="text-red-400 ml-1 inline-flex items-center gap-0.5">
                        <Scissors className="w-2.5 h-2.5" /> CUT
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {isLive && (
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {counts && (
                    <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase">
                      Counts
                    </span>
                  )}
                  <span className="text-sm font-semibold font-sans tabular-nums">
                    {score}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Leaderboard ───────────────────────────────────────── */

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
        <p className="text-sm text-gray-400">
          No complete teams yet. Be the first to submit!
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-2.5 bg-masters-sand flex items-center gap-2 border-b border-gray-100">
        <Trophy className="w-4 h-4 text-masters-gold" />
        <span className="text-xs font-bold text-masters-dark uppercase tracking-wider">
          Leaderboard
        </span>
        {tournament.winning_score != null && (
          <span className="text-[11px] text-gray-400 ml-auto">
            Winner: {tournament.winning_score}
          </span>
        )}
      </div>

      <div className="divide-y divide-gray-50">
        {leaderboard.map((entry, idx) => {
          const rank = idx + 1;
          const isMe = entry.userId === currentUserId;
          const isOpen = expanded === entry.userId;
          const rankBg =
            rank === 1
              ? "bg-amber-100 text-amber-800"
              : rank === 2
                ? "bg-slate-100 text-slate-700"
                : rank === 3
                  ? "bg-orange-100 text-orange-800"
                  : "bg-gray-50 text-gray-500";

          return (
            <div key={entry.userId}>
              <button
                onClick={() =>
                  setExpanded(isOpen ? null : entry.userId)
                }
                className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50/50 transition-colors ${
                  isMe ? "bg-emerald-50/40" : ""
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${rankBg}`}
                >
                  {rank}
                </span>
                <span className="text-sm font-medium text-left flex-1 truncate">
                  {entry.profile?.display_name ?? "Unknown"}
                  {isMe && (
                    <span className="text-[10px] text-masters-green ml-1">
                      (you)
                    </span>
                  )}
                </span>
                {entry.profile?.tiebreaker_score != null && (
                  <span className="text-[10px] text-gray-400 font-sans hidden sm:block">
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
                <div className="px-4 pb-3 pt-1 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
                  {entry.picks
                    .sort((a, b) => a.tier - b.tier)
                    .map((p) => {
                      const color = TIER_COLORS[p.tier];
                      const counts = entry.bestIds.has(p.golfer.id);
                      return (
                        <div
                          key={p.golfer.id}
                          className={`rounded-md px-2 py-1.5 ${color.bg} ${
                            !counts && isLive ? "opacity-30" : ""
                          }`}
                        >
                          <p className="text-[10px] text-gray-500 font-sans">
                            T{p.tier}
                          </p>
                          <p
                            className={`text-xs font-medium truncate ${color.text}`}
                          >
                            {p.golfer.name}
                          </p>
                          <div className="flex items-center justify-between mt-0.5">
                            {p.golfer.status === "cut" && (
                              <span className="text-[9px] text-red-500 font-bold">
                                CUT
                              </span>
                            )}
                            {isLive && (
                              <span className="text-[11px] font-semibold font-sans ml-auto">
                                {p.score}
                              </span>
                            )}
                          </div>
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
