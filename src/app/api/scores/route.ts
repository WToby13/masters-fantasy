import { createAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

/**
 * POST /api/scores
 * 
 * Fetches live scores from ESPN's public leaderboard API and updates golfer records.
 * ESPN endpoint: https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard
 * 
 * Body: { tournament_id: string, espn_event_id?: string }
 * 
 * The espn_event_id for The Masters 2025 is "401703504" (update yearly).
 */

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

export async function POST(request: Request) {
  try {
    const { tournament_id, espn_event_id } = await request.json();
    if (!tournament_id) {
      return NextResponse.json(
        { error: "tournament_id required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Fetch current golfers for this tournament
    const { data: golfers, error: gError } = await supabase
      .from("golfers")
      .select("*")
      .eq("tournament_id", tournament_id);

    if (gError) throw gError;
    if (!golfers?.length)
      return NextResponse.json({ error: "No golfers found" }, { status: 404 });

    // Fetch from ESPN public API
    const eventId = espn_event_id || "401703504";
    const url = `https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard?event=${eventId}`;
    const res = await fetch(url, { next: { revalidate: 0 } });

    if (!res.ok) {
      return NextResponse.json(
        { error: `ESPN API returned ${res.status}` },
        { status: 502 }
      );
    }

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

      const updateData: Record<string, unknown> = {
        score_r1: linescores[0]?.value ?? null,
        score_r2: linescores[1]?.value ?? null,
        score_r3: linescores[2]?.value ?? null,
        score_r4: linescores[3]?.value ?? null,
        total_score: totalScore,
        status: isCut ? "cut" : isWD ? "withdrawn" : isDQ ? "disqualified" : "active",
      };

      await supabase
        .from("golfers")
        .update(updateData)
        .eq("id", golfer.id);

      updated++;
    }

    return NextResponse.json({
      message: `Updated ${updated} of ${golfers.length} golfers`,
      source: url,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
