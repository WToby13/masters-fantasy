"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import type { Tournament, Golfer, Profile, Pick } from "@/lib/types";
import { TIER_COLORS, TIER_LABELS } from "@/lib/types";
import {
  LogOut,
  TreePine,
  Trophy,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  Scissors,
} from "lucide-react";
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

function TierBadge({ tier }: { tier: number }) {
  const color = TIER_COLORS[tier];
  return (
    <span className={`tier-badge ${color.bg} ${color.text}`}>{tier}</span>
  );
}

function effectiveScore(golfer: Golfer): number {
  if (golfer.status === "cut" || golfer.status === "withdrawn" || golfer.status === "disqualified") {
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
  const [expandedTier, setExpandedTier] = useState<number | null>(
    userPicks.length === 0 ? 1 : null
  );
  const [tab, setTab] = useState<"picks" | "leaderboard">(
    userPicks.length === 6 ? "leaderboard" : "picks"
  );

  const hasPicks = userPicks.length === 6;
  const isDraftOpen =
    tournament?.status === "drafting" || tournament?.status === "upcoming";

  const golfersByTier = useMemo(() => {
    const map: Record<number, Golfer[]> = {};
    for (let t = 1; t <= 6; t++) map[t] = [];
    golfers.forEach((g) => map[g.tier]?.push(g));
    return map;
  }, [golfers]);

  const leaderboard = useMemo(() => {
    const profileMap = new Map(allProfiles.map((p) => [p.id, p]));
    const userPicks: Record<string, { golfer: Golfer; tier: number }[]> = {};

    allPicks.forEach((p) => {
      if (!userPicks[p.user_id]) userPicks[p.user_id] = [];
      userPicks[p.user_id].push({ golfer: p.golfer, tier: p.tier });
    });

    return Object.entries(userPicks)
      .map(([userId, picks]) => {
        const scores = picks
          .map((p) => ({
            ...p,
            score: effectiveScore(p.golfer),
          }))
          .sort((a, b) => a.score - b.score);

        const best4 = scores.slice(0, 4);
        const total = best4.reduce((s, p) => s + p.score, 0);
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
          best4Ids: new Set(best4.map((p) => p.golfer.id)),
          total,
          tiebreakerDiff: tbDiff,
        };
      })
      .filter((e) => e.picks.length === 6)
      .sort((a, b) => {
        if (a.total !== b.total) return a.total - b.total;
        if (a.tiebreakerDiff != null && b.tiebreakerDiff != null)
          return a.tiebreakerDiff - b.tiebreakerDiff;
        return 0;
      });
  }, [allPicks, allProfiles, tournament]);

  async function handleSave() {
    if (Object.keys(selections).length !== 6) return;
    setSaving(true);

    try {
      for (let tier = 1; tier <= 6; tier++) {
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="card-masters p-12 text-center max-w-md">
          <TreePine className="w-12 h-12 text-masters-green mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-masters-dark mb-2">
            No Active Tournament
          </h2>
          <p className="text-gray-500">
            Check back when the pool opens for the next tournament.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-masters-cream">
      {/* Header */}
      <header className="bg-masters-green text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TreePine className="w-6 h-6 text-masters-yellow" />
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                Masters Fantasy Pool
              </h1>
              <p className="text-green-200 text-xs">{tournament.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-green-200 text-sm hidden sm:block">
              {profile?.display_name}
            </span>
            <button
              onClick={handleLogout}
              className="text-green-200 hover:text-white transition-colors"
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="azalea-divider" />

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm w-fit">
          <button
            onClick={() => setTab("picks")}
            className={`px-5 py-2 rounded-md text-sm font-semibold transition-colors ${
              tab === "picks"
                ? "bg-masters-green text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {hasPicks ? "My Team" : "Draft Picks"}
          </button>
          <button
            onClick={() => setTab("leaderboard")}
            className={`px-5 py-2 rounded-md text-sm font-semibold transition-colors ${
              tab === "leaderboard"
                ? "bg-masters-green text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Leaderboard
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {tab === "picks" && (
          <>
            {/* Draft / Team View */}
            {hasPicks && !isDraftOpen ? (
              <MyTeam
                picks={userPicks}
                golfers={golfers}
                profile={profile}
                tournament={tournament}
              />
            ) : (
              <div className="space-y-3">
                <div className="card-masters p-5 mb-4">
                  <h2 className="text-xl font-bold text-masters-dark mb-1">
                    {hasPicks
                      ? "Update Your Picks"
                      : "Draft Your Team"}
                  </h2>
                  <p className="text-gray-500 text-sm">
                    Select one golfer from each tier. Your best 4 of 6 scores
                    will count.
                  </p>
                </div>

                {[1, 2, 3, 4, 5, 6].map((tier) => (
                  <div key={tier} className="card-masters overflow-hidden">
                    <button
                      onClick={() =>
                        setExpandedTier(expandedTier === tier ? null : tier)
                      }
                      className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <TierBadge tier={tier} />
                        <div className="text-left">
                          <span className="font-bold text-masters-dark">
                            Tier {tier}
                          </span>
                          <span className="text-gray-400 text-sm ml-2">
                            {TIER_LABELS[tier]}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {selections[tier] && (
                          <span className="text-sm text-masters-green font-semibold flex items-center gap-1">
                            <Check className="w-4 h-4" />
                            {
                              golfers.find((g) => g.id === selections[tier])
                                ?.name
                            }
                          </span>
                        )}
                        {expandedTier === tier ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {expandedTier === tier && (
                      <div className="border-t border-gray-100 divide-y divide-gray-50">
                        {golfersByTier[tier]?.map((golfer) => (
                          <button
                            key={golfer.id}
                            onClick={() =>
                              setSelections((s) => ({
                                ...s,
                                [tier]: golfer.id,
                              }))
                            }
                            className={`w-full px-5 py-3 flex items-center justify-between text-left transition-colors ${
                              selections[tier] === golfer.id
                                ? "bg-green-50 border-l-4 border-masters-green"
                                : "hover:bg-gray-50 border-l-4 border-transparent"
                            }`}
                          >
                            <div>
                              <span className="font-semibold text-gray-900">
                                {golfer.name}
                              </span>
                              <span className="text-gray-400 text-sm ml-2 font-sans">
                                #{golfer.world_ranking}
                              </span>
                            </div>
                            {selections[tier] === golfer.id && (
                              <Check className="w-5 h-5 text-masters-green" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Tiebreaker */}
                <div className="card-masters p-5">
                  <label className="block text-sm font-bold text-masters-dark mb-2">
                    Tiebreaker: Predict the winning score (relative to par)
                  </label>
                  <input
                    type="number"
                    className="input-masters max-w-xs"
                    placeholder="e.g. -12"
                    value={tiebreaker}
                    onChange={(e) => setTiebreaker(e.target.value)}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    If tied, the closest prediction to the actual winning score
                    wins.
                  </p>
                </div>

                {/* Submit */}
                <button
                  onClick={handleSave}
                  disabled={Object.keys(selections).length !== 6 || saving}
                  className="btn-masters w-full flex items-center justify-center gap-2 text-lg py-4"
                >
                  {saving && <Loader2 className="w-5 h-5 animate-spin" />}
                  {saving
                    ? "Saving..."
                    : `Submit Picks (${Object.keys(selections).length}/6 selected)`}
                </button>
              </div>
            )}
          </>
        )}

        {tab === "leaderboard" && (
          <div className="space-y-4">
            <div className="card-masters p-5">
              <div className="flex items-center gap-3 mb-1">
                <Trophy className="w-6 h-6 text-masters-yellow" />
                <h2 className="text-xl font-bold text-masters-dark">
                  Leaderboard
                </h2>
              </div>
              <p className="text-gray-500 text-sm">
                Best 4 of 6 scores &middot; Lowest total wins
                {tournament.winning_score != null && (
                  <span className="ml-2">
                    &middot; Winning score:{" "}
                    <strong>{tournament.winning_score}</strong>
                  </span>
                )}
              </p>
            </div>

            {leaderboard.length === 0 ? (
              <div className="card-masters p-12 text-center">
                <p className="text-gray-400">
                  No complete teams yet. Be the first to submit your picks!
                </p>
              </div>
            ) : (
              leaderboard.map((entry, idx) => (
                <LeaderboardCard
                  key={entry.userId}
                  entry={entry}
                  rank={idx + 1}
                  isCurrentUser={entry.userId === user.id}
                  tournament={tournament}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MyTeam({
  picks,
  golfers,
  profile,
  tournament,
}: {
  picks: Pick[];
  golfers: Golfer[];
  profile: Profile;
  tournament: Tournament;
}) {
  const golferMap = new Map(golfers.map((g) => [g.id, g]));
  const sortedPicks = [...picks].sort((a, b) => a.tier - b.tier);
  const picksWithScores = sortedPicks.map((p) => {
    const g = golferMap.get(p.golfer_id)!;
    return { pick: p, golfer: g, score: effectiveScore(g) };
  });
  const sorted = [...picksWithScores].sort((a, b) => a.score - b.score);
  const best4Ids = new Set(sorted.slice(0, 4).map((p) => p.golfer.id));

  return (
    <div className="card-masters overflow-hidden">
      <div className="bg-masters-green text-white p-5">
        <h2 className="text-xl font-bold">
          {profile.display_name}&apos;s Team
        </h2>
        {profile.tiebreaker_score != null && (
          <p className="text-green-200 text-sm mt-1">
            Tiebreaker prediction: {profile.tiebreaker_score}
          </p>
        )}
      </div>
      <div className="divide-y divide-gray-100">
        {picksWithScores.map(({ pick, golfer, score }) => (
          <div
            key={pick.id}
            className={`px-5 py-3.5 flex items-center justify-between ${
              !best4Ids.has(golfer.id) ? "opacity-40" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <TierBadge tier={pick.tier} />
              <div>
                <span className="font-semibold">{golfer.name}</span>
                {golfer.status === "cut" && (
                  <span className="ml-2 text-xs text-red-500 font-sans font-semibold inline-flex items-center gap-1">
                    <Scissors className="w-3 h-3" /> CUT
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 font-sans">
              {best4Ids.has(golfer.id) && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                  COUNTS
                </span>
              )}
              <span
                className={`font-bold ${score < 0 ? "text-red-600" : "text-gray-800"}`}
              >
                {tournament.status !== "upcoming" && tournament.status !== "drafting"
                  ? (score > 0 ? `+${score}` : score === 0 ? "E" : score)
                  : "—"}
              </span>
            </div>
          </div>
        ))}
      </div>
      {tournament.status !== "upcoming" && tournament.status !== "drafting" && (
        <div className="border-t-2 border-masters-yellow bg-masters-sand/30 px-5 py-4 flex justify-between items-center">
          <span className="font-bold text-masters-dark">
            Total (Best 4)
          </span>
          <span className="text-2xl font-bold text-masters-green font-sans">
            {sorted
              .slice(0, 4)
              .reduce((s, p) => s + p.score, 0)}
          </span>
        </div>
      )}
    </div>
  );
}

function LeaderboardCard({
  entry,
  rank,
  isCurrentUser,
  tournament,
}: {
  entry: {
    userId: string;
    profile?: Profile;
    picks: { golfer: Golfer; tier: number; score: number }[];
    best4Ids: Set<string>;
    total: number;
    tiebreakerDiff: number | null;
  };
  rank: number;
  isCurrentUser: boolean;
  tournament: Tournament;
}) {
  const [expanded, setExpanded] = useState(isCurrentUser);
  const rankColors: Record<number, string> = {
    1: "bg-yellow-400 text-yellow-900",
    2: "bg-gray-300 text-gray-700",
    3: "bg-amber-600 text-white",
  };

  return (
    <div
      className={`card-masters overflow-hidden ${isCurrentUser ? "ring-2 ring-masters-green" : ""}`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold font-sans ${
              rankColors[rank] || "bg-gray-100 text-gray-600"
            }`}
          >
            {rank}
          </span>
          <div className="text-left">
            <span className="font-bold text-masters-dark">
              {entry.profile?.display_name ?? "Unknown"}
            </span>
            {isCurrentUser && (
              <span className="text-xs text-masters-green ml-2">(you)</span>
            )}
            {entry.profile?.tiebreaker_score != null && (
              <span className="text-xs text-gray-400 ml-2 font-sans">
                TB: {entry.profile.tiebreaker_score}
                {entry.tiebreakerDiff != null && ` (±${entry.tiebreakerDiff})`}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-masters-green font-sans">
            {tournament.status !== "upcoming" && tournament.status !== "drafting"
              ? entry.total
              : "—"}
          </span>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {entry.picks
            .sort((a, b) => a.tier - b.tier)
            .map((p) => (
              <div
                key={p.golfer.id}
                className={`px-5 py-2.5 flex items-center justify-between text-sm ${
                  !entry.best4Ids.has(p.golfer.id) ? "opacity-40" : ""
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <TierBadge tier={p.tier} />
                  <span className="font-medium">{p.golfer.name}</span>
                  {p.golfer.status === "cut" && (
                    <span className="text-xs text-red-500 font-sans font-semibold">
                      CUT
                    </span>
                  )}
                </div>
                <span className="font-mono font-semibold text-gray-700">
                  {tournament.status !== "upcoming" && tournament.status !== "drafting"
                    ? p.score
                    : "—"}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
