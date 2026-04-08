export interface Profile {
  id: string;
  display_name: string;
  tiebreaker_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface Tournament {
  id: string;
  name: string;
  year: number;
  status: "upcoming" | "drafting" | "locked" | "in_progress" | "completed";
  winning_score: number | null;
  espn_event_id: string | null;
  created_at: string;
}

export interface Golfer {
  id: string;
  tournament_id: string;
  name: string;
  world_ranking: number;
  tier: number;
  espn_player_id: string | null;
  score_r1: number | null;
  score_r2: number | null;
  score_r3: number | null;
  score_r4: number | null;
  total_score: number | null;
  status: "active" | "cut" | "withdrawn" | "disqualified";
  created_at: string;
}

export interface Pick {
  id: string;
  user_id: string;
  tournament_id: string;
  golfer_id: string;
  tier: number;
  created_at: string;
}

export interface PickWithGolfer extends Pick {
  golfer: Golfer;
}

export interface LeaderboardEntry {
  user_id: string;
  tournament_id: string;
  total_score: number;
  picks_detail: {
    tier: number;
    golfer_name: string;
    golfer_status: string;
    effective_score: number;
    counted: boolean;
  }[];
  profile?: Profile;
  tiebreaker_diff?: number;
}

export const NUM_TIERS = 7;
export const BEST_OF = 4;

export const TIER_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200" },
  2: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" },
  3: { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-200" },
  4: { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-200" },
  5: { bg: "bg-sky-100", text: "text-sky-800", border: "border-sky-200" },
  6: { bg: "bg-violet-100", text: "text-violet-800", border: "border-violet-200" },
  7: { bg: "bg-red-100", text: "text-red-800", border: "border-red-200" },
};

export const TIER_LABELS: Record<number, string> = {
  1: "Elite",
  2: "Contenders",
  3: "Sleepers",
  4: "Long Shots",
  5: "Dark Horses",
  6: "The Field",
  7: "Canadians",
};
