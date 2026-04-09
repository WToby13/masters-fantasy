import { createAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

/**
 * Fetches live scores from ESPN's public leaderboard API and updates golfer records.
 *
 * GET  /api/scores  — called by Supabase pg_cron (requires Authorization: Bearer <CRON_SECRET>)
 * POST /api/scores  — manual trigger (body: { tournament_id, espn_event_id? })
 */

const MASTERS_2026_ESPN_ID = "401811941";

interface ESPNLinescoreStat {
  value?: number;
  displayValue?: string;
}

interface ESPNLinescore {
  value?: number;
  displayValue?: string;
  period?: number;
  linescores?: { value?: number; displayValue?: string }[];
  statistics?: {
    categories?: {
      stats?: ESPNLinescoreStat[];
    }[];
  };
}

interface ESPNCompetitor {
  athlete: { displayName: string };
  status?: { type?: { name?: string } };
  score?: string;
  order?: number;
  linescores?: ESPNLinescore[];
  statistics?: unknown[];
}

interface ESPNResponse {
  events?: {
    competitions?: {
      competitors?: ESPNCompetitor[];
      status?: {
        period?: number;
      };
    }[];
  }[];
}

function extractThru(linescore: ESPNLinescore | undefined): string | null {
  if (!linescore) return null;
  const stats =
    linescore.statistics?.categories?.[0]?.stats ?? [];
  const holesStat = stats[5];
  const teeTimeStat = stats[6];
  const holesCompleted = holesStat?.value ?? 0;

  if (holesCompleted === 18) return "F";
  if (holesCompleted > 0) return String(holesCompleted);

  if (teeTimeStat?.displayValue) {
    const raw = teeTimeStat.displayValue;
    const match = raw.match(/(\d{1,2}):(\d{2}):\d{2}\s*(AM|PM|[A-Z]{3,})/i);
    if (match) {
      let hour = parseInt(match[1]);
      const min = match[2];
      const ampm = match[3];
      if (/PM/i.test(ampm) && hour < 12) hour += 12;
      if (/AM/i.test(ampm) && hour === 12) hour = 0;
      const h12 = hour % 12 || 12;
      const suffix = hour >= 12 ? "PM" : "AM";
      return `${h12}:${min} ${suffix}`;
    }
    return raw;
  }

  return null;
}

async function updateScores(tournamentId: string, espnEventId: string) {
  const supabase = createAdminClient();

  const { data: golfers, error: gError } = await supabase
    .from("golfers")
    .select("*")
    .eq("tournament_id", tournamentId);

  if (gError) throw gError;
  if (!golfers?.length) throw new Error("No golfers found");

  const url = `https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard?event=${espnEventId}`;
  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) throw new Error(`ESPN API returned ${res.status}`);

  const espn: ESPNResponse = await res.json();
  const competition = espn.events?.[0]?.competitions?.[0];
  const competitors = competition?.competitors || [];
  const currentPeriod = (competition?.status?.period ?? 1) - 1;

  let updated = 0;

  for (const golfer of golfers) {
    const match = competitors.find(
      (c) =>
        c.athlete.displayName.toLowerCase() === golfer.name.toLowerCase()
    );
    if (!match) continue;

    const statusName = match.status?.type?.name ?? "";
    const isCut = statusName === "cut";
    const isWD = statusName === "withdrawn";
    const isDQ = statusName === "disqualified";
    const linescores = match.linescores || [];

    const currentRound = linescores[currentPeriod];
    const todayDisplay = currentRound?.displayValue ?? null;
    const thru = extractThru(currentRound);
    const scoreToPar = typeof match.score === "string" ? match.score : null;
    const position = match.order ?? null;

    const totalScoreRaw = scoreToPar ? parseInt(scoreToPar) : null;
    const totalScore =
      scoreToPar === "E"
        ? 0
        : !isNaN(totalScoreRaw as number)
          ? totalScoreRaw
          : null;

    await supabase
      .from("golfers")
      .update({
        score_r1: linescores[0]?.value ?? null,
        score_r2: linescores[1]?.value ?? null,
        score_r3: linescores[2]?.value ?? null,
        score_r4: linescores[3]?.value ?? null,
        total_score: totalScore,
        score_to_par: scoreToPar,
        today_score: todayDisplay,
        thru,
        position,
        status: isCut
          ? "cut"
          : isWD
            ? "withdrawn"
            : isDQ
              ? "disqualified"
              : "active",
      })
      .eq("id", golfer.id);

    updated++;
  }

  await supabase
    .from("tournaments")
    .update({ scores_updated_at: new Date().toISOString() })
    .eq("id", tournamentId);

  return { updated, total: golfers.length, source: url };
}

/** GET — called by Supabase pg_cron every 5 minutes */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();

    const { data: tournament } = await supabase
      .from("tournaments")
      .select("*")
      .in("status", ["in_progress", "round1", "round2", "round3", "round4"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!tournament) {
      return NextResponse.json({ message: "No active tournament to update" });
    }

    const espnId = tournament.espn_event_id || MASTERS_2026_ESPN_ID;
    const result = await updateScores(tournament.id, espnId);

    return NextResponse.json({
      message: `Updated ${result.updated} of ${result.total} golfers`,
      tournament: tournament.name,
      source: result.source,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST — manual trigger */
export async function POST(request: Request) {
  try {
    const { tournament_id, espn_event_id } = await request.json();
    if (!tournament_id) {
      return NextResponse.json(
        { error: "tournament_id required" },
        { status: 400 }
      );
    }

    const result = await updateScores(
      tournament_id,
      espn_event_id || MASTERS_2026_ESPN_ID
    );

    return NextResponse.json({
      message: `Updated ${result.updated} of ${result.total} golfers`,
      source: result.source,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
