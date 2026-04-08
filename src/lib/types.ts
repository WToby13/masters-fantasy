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

export const TIER_COLORS: Record<number, { bg: string; text: string }> = {
  1: { bg: "bg-yellow-400", text: "text-yellow-900" },
  2: { bg: "bg-gray-300", text: "text-gray-800" },
  3: { bg: "bg-amber-600", text: "text-white" },
  4: { bg: "bg-emerald-600", text: "text-white" },
  5: { bg: "bg-sky-600", text: "text-white" },
  6: { bg: "bg-purple-600", text: "text-white" },
  7: { bg: "bg-red-600", text: "text-white" },
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
