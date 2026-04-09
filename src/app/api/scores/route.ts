import { createAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

/**
 * Fetches live scores from ESPN's public leaderboard API and updates golfer records.
 *
 * GET  /api/scores  — called by Supabase pg_cron (requires Authorization: Bearer <CRON_SECRET>)
 * POST /api/scores  — manual trigger (body: { tournament_id, espn_event_id? })
 */

const MASTERS_2026_ESPN_ID = "401811941";

interface ESPNCompetitor {
  athlete: { displayName: string };
  status: { type: { name: string } };
  score: { displayValue: string };
  linescores?: { value: number }[];
}

interface ESPNEvent {
  competitions: {
    competitors: ESPNCompetitor[];
  }[];
}

interface ESPNResponse {
  events: ESPNEvent[];
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
  const competitors =
    espn.events?.[0]?.competitions?.[0]?.competitors || [];

  let updated = 0;

  for (const golfer of golfers) {
    const match = competitors.find(
      (c: ESPNCompetitor) =>
        c.athlete.displayName.toLowerCase() === golfer.name.toLowerCase()
    );
    if (!match) continue;

    const isCut = match.status?.type?.name === "cut";
    const isWD = match.status?.type?.name === "withdrawn";
    const isDQ = match.status?.type?.name === "disqualified";
    const linescores = match.linescores || [];
    const totalDisplay = match.score?.displayValue;
    const totalScore = totalDisplay ? parseInt(totalDisplay) : null;

    await supabase
      .from("golfers")
      .update({
        score_r1: linescores[0]?.value ?? null,
        score_r2: linescores[1]?.value ?? null,
        score_r3: linescores[2]?.value ?? null,
        score_r4: linescores[3]?.value ?? null,
        total_score: totalScore,
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
