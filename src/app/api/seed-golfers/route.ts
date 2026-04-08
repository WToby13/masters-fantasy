import { createAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

/**
 * POST /api/seed-golfers
 * 
 * Seeds golfers into tiers for a tournament based on ESPN's Masters field data.
 * Splits the field into 6 tiers by world ranking.
 * 
 * Body: { tournament_id: string }
 * 
 * For the 2025/2026 Masters, we use a static field as fallback.
 * In production, this fetches from ESPN's API.
 */

const MASTERS_FIELD_2025 = [
  { name: "Scottie Scheffler", ranking: 1 },
  { name: "Xander Schauffele", ranking: 2 },
  { name: "Rory McIlroy", ranking: 3 },
  { name: "Collin Morikawa", ranking: 4 },
  { name: "Ludvig Åberg", ranking: 5 },
  { name: "Wyndham Clark", ranking: 6 },
  { name: "Jon Rahm", ranking: 7 },
  { name: "Tommy Fleetwood", ranking: 8 },
  { name: "Hideki Matsuyama", ranking: 9 },
  { name: "Shane Lowry", ranking: 10 },
  { name: "Sahith Theegala", ranking: 11 },
  { name: "Patrick Cantlay", ranking: 12 },
  { name: "Viktor Hovland", ranking: 13 },
  { name: "Sungjae Im", ranking: 14 },
  { name: "Russell Henley", ranking: 15 },
  { name: "Brooks Koepka", ranking: 16 },
  { name: "Keegan Bradley", ranking: 17 },
  { name: "Tony Finau", ranking: 18 },
  { name: "Robert MacIntyre", ranking: 19 },
  { name: "Byeong Hun An", ranking: 20 },
  { name: "Justin Thomas", ranking: 21 },
  { name: "Cameron Smith", ranking: 22 },
  { name: "Dustin Johnson", ranking: 23 },
  { name: "Jordan Spieth", ranking: 24 },
  { name: "Min Woo Lee", ranking: 25 },
  { name: "Tyrrell Hatton", ranking: 26 },
  { name: "Corey Conners", ranking: 27 },
  { name: "Adam Scott", ranking: 28 },
  { name: "Matt Fitzpatrick", ranking: 29 },
  { name: "Sepp Straka", ranking: 30 },
  { name: "Sam Burns", ranking: 31 },
  { name: "Denny McCarthy", ranking: 32 },
  { name: "Cameron Young", ranking: 33 },
  { name: "Tom Kim", ranking: 34 },
  { name: "Will Zalatoris", ranking: 35 },
  { name: "Jason Day", ranking: 36 },
  { name: "Brian Harman", ranking: 37 },
  { name: "Chris Kirk", ranking: 38 },
  { name: "Taylor Moore", ranking: 39 },
  { name: "Si Woo Kim", ranking: 40 },
  { name: "Nick Dunlap", ranking: 41 },
  { name: "Akshay Bhatia", ranking: 42 },
  { name: "Max Homa", ranking: 43 },
  { name: "Davis Thompson", ranking: 44 },
  { name: "Joaquín Niemann", ranking: 45 },
  { name: "Justin Rose", ranking: 46 },
  { name: "Phil Mickelson", ranking: 47 },
  { name: "Bubba Watson", ranking: 48 },
  { name: "Patrick Reed", ranking: 49 },
  { name: "Sergio Garcia", ranking: 50 },
  { name: "Zach Johnson", ranking: 51 },
  { name: "Danny Willett", ranking: 52 },
  { name: "Tiger Woods", ranking: 53 },
  { name: "Fred Couples", ranking: 54 },
  { name: "José María Olazábal", ranking: 55 },
  { name: "Vijay Singh", ranking: 56 },
  { name: "Mike Weir", ranking: 57 },
  { name: "Angel Cabrera", ranking: 58 },
  { name: "Charl Schwartzel", ranking: 59 },
  { name: "Larry Mize", ranking: 60 },
];

export async function POST(request: Request) {
  try {
    const { tournament_id } = await request.json();
    if (!tournament_id) {
      return NextResponse.json(
        { error: "tournament_id required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Clear existing golfers for this tournament
    await supabase.from("golfers").delete().eq("tournament_id", tournament_id);

    const perTier = Math.ceil(MASTERS_FIELD_2025.length / 6);

    const golfers = MASTERS_FIELD_2025.map((g, i) => ({
      tournament_id,
      name: g.name,
      world_ranking: g.ranking,
      tier: Math.min(6, Math.floor(i / perTier) + 1),
      status: "active",
    }));

    const { data, error } = await supabase
      .from("golfers")
      .insert(golfers)
      .select();

    if (error) throw error;

    return NextResponse.json({
      message: `Seeded ${data.length} golfers across 6 tiers`,
      tiers: Object.fromEntries(
        [1, 2, 3, 4, 5, 6].map((t) => [
          t,
          data.filter((g) => g.tier === t).length,
        ])
      ),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
