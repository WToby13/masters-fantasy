import { createAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

/**
 * POST /api/seed-golfers
 *
 * Seeds the 2026 Masters field (91 players) into 7 tiers.
 * Tiers 1-6 are non-Canadian golfers ranked by NBC Sports power ranking.
 * Tier 7 is the Canadian tier (Conners, Taylor, Weir).
 *
 * Body: { tournament_id: string }
 */

const MASTERS_FIELD_2026: { name: string; ranking: number; tier: number }[] = [
  // TIER 1 — Elite (NBC ranks 1-15)
  { name: "Matt Fitzpatrick", ranking: 1, tier: 1 },
  { name: "Ludvig Åberg", ranking: 2, tier: 1 },
  { name: "Robert MacIntyre", ranking: 3, tier: 1 },
  { name: "Jon Rahm", ranking: 4, tier: 1 },
  { name: "Xander Schauffele", ranking: 5, tier: 1 },
  { name: "Scottie Scheffler", ranking: 6, tier: 1 },
  { name: "Tommy Fleetwood", ranking: 7, tier: 1 },
  { name: "Rory McIlroy", ranking: 8, tier: 1 },
  { name: "Bryson DeChambeau", ranking: 9, tier: 1 },
  { name: "Jacob Bridgeman", ranking: 10, tier: 1 },
  { name: "Si Woo Kim", ranking: 11, tier: 1 },
  { name: "Cameron Smith", ranking: 13, tier: 1 },
  { name: "Gary Woodland", ranking: 14, tier: 1 },
  { name: "Chris Gotterup", ranking: 15, tier: 1 },
  { name: "Shane Lowry", ranking: 16, tier: 1 },

  // TIER 2 — Contenders (NBC ranks 17-30)
  { name: "Patrick Reed", ranking: 17, tier: 2 },
  { name: "Min Woo Lee", ranking: 18, tier: 2 },
  { name: "Akshay Bhatia", ranking: 19, tier: 2 },
  { name: "Sepp Straka", ranking: 20, tier: 2 },
  { name: "Cameron Young", ranking: 21, tier: 2 },
  { name: "Brooks Koepka", ranking: 22, tier: 2 },
  { name: "Hideki Matsuyama", ranking: 23, tier: 2 },
  { name: "Justin Rose", ranking: 24, tier: 2 },
  { name: "Sungjae Im", ranking: 25, tier: 2 },
  { name: "Russell Henley", ranking: 26, tier: 2 },
  { name: "J.J. Spaun", ranking: 27, tier: 2 },
  { name: "Collin Morikawa", ranking: 28, tier: 2 },
  { name: "Jake Knapp", ranking: 29, tier: 2 },
  { name: "Viktor Hovland", ranking: 30, tier: 2 },

  // TIER 3 — Sleepers (NBC ranks 31-45)
  { name: "Tyrrell Hatton", ranking: 31, tier: 3 },
  { name: "Harris English", ranking: 32, tier: 3 },
  { name: "Patrick Cantlay", ranking: 33, tier: 3 },
  { name: "Ben Griffin", ranking: 34, tier: 3 },
  { name: "Justin Thomas", ranking: 35, tier: 3 },
  { name: "Jason Day", ranking: 36, tier: 3 },
  { name: "Adam Scott", ranking: 37, tier: 3 },
  { name: "Matt McCarty", ranking: 38, tier: 3 },
  { name: "Jordan Spieth", ranking: 39, tier: 3 },
  { name: "Ryan Fox", ranking: 40, tier: 3 },
  { name: "Sam Burns", ranking: 41, tier: 3 },
  { name: "Max Homa", ranking: 42, tier: 3 },
  { name: "Nicolai Højgaard", ranking: 43, tier: 3 },
  { name: "Maverick McNealy", ranking: 44, tier: 3 },
  { name: "Nico Echavarría", ranking: 45, tier: 3 },

  // TIER 4 — Long Shots (NBC ranks 46-60)
  { name: "Michael Kim", ranking: 46, tier: 4 },
  { name: "Johnny Keefer", ranking: 47, tier: 4 },
  { name: "Ryan Gerard", ranking: 48, tier: 4 },
  { name: "Daniel Berger", ranking: 49, tier: 4 },
  { name: "Aaron Rai", ranking: 50, tier: 4 },
  { name: "Harry Hall", ranking: 51, tier: 4 },
  { name: "Kurt Kitayama", ranking: 52, tier: 4 },
  { name: "Haotong Li", ranking: 53, tier: 4 },
  { name: "Max Greyserman", ranking: 54, tier: 4 },
  { name: "Marco Penge", ranking: 55, tier: 4 },
  { name: "Brian Harman", ranking: 56, tier: 4 },
  { name: "Wyndham Clark", ranking: 57, tier: 4 },
  { name: "Samuel Stevens", ranking: 58, tier: 4 },
  { name: "Carlos Ortiz", ranking: 59, tier: 4 },
  { name: "Alex Noren", ranking: 60, tier: 4 },

  // TIER 5 — Dark Horses (NBC ranks 61-75)
  { name: "Rasmus Højgaard", ranking: 61, tier: 5 },
  { name: "Dustin Johnson", ranking: 62, tier: 5 },
  { name: "Brian Campbell", ranking: 63, tier: 5 },
  { name: "Keegan Bradley", ranking: 64, tier: 5 },
  { name: "Aldrich Potgieter", ranking: 65, tier: 5 },
  { name: "Sergio Garcia", ranking: 66, tier: 5 },
  { name: "Davis Riley", ranking: 67, tier: 5 },
  { name: "Casey Jarvis", ranking: 69, tier: 5 },
  { name: "Sami Valimaki", ranking: 70, tier: 5 },
  { name: "Ethan Fang", ranking: 71, tier: 5 },
  { name: "Andrew Novak", ranking: 72, tier: 5 },
  { name: "Mason Howell", ranking: 73, tier: 5 },
  { name: "Tom McKibbin", ranking: 74, tier: 5 },
  { name: "Danny Willett", ranking: 75, tier: 5 },

  // TIER 6 — The Field (NBC ranks 76-90)
  { name: "Jackson Herrington", ranking: 76, tier: 6 },
  { name: "Rasmus Neergaard-Petersen", ranking: 77, tier: 6 },
  { name: "Zach Johnson", ranking: 78, tier: 6 },
  { name: "Michael Brennan", ranking: 79, tier: 6 },
  { name: "Charl Schwartzel", ranking: 80, tier: 6 },
  { name: "Fred Couples", ranking: 81, tier: 6 },
  { name: "Kristoffer Reitan", ranking: 82, tier: 6 },
  { name: "Brandon Holtz", ranking: 83, tier: 6 },
  { name: "Bubba Watson", ranking: 84, tier: 6 },
  { name: "Mateo Pulcini", ranking: 85, tier: 6 },
  { name: "Fifa Laopakdee", ranking: 86, tier: 6 },
  { name: "Naoyuki Kataoka", ranking: 87, tier: 6 },
  { name: "Ángel Cabrera", ranking: 88, tier: 6 },
  { name: "José María Olazábal", ranking: 89, tier: 6 },
  { name: "Vijay Singh", ranking: 90, tier: 6 },

  // TIER 7 — Canadians
  { name: "Corey Conners", ranking: 12, tier: 7 },
  { name: "Nick Taylor", ranking: 68, tier: 7 },
  { name: "Mike Weir", ranking: 91, tier: 7 },
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

    await supabase.from("golfers").delete().eq("tournament_id", tournament_id);

    const golfers = MASTERS_FIELD_2026.map((g) => ({
      tournament_id,
      name: g.name,
      world_ranking: g.ranking,
      tier: g.tier,
      status: "active",
    }));

    const { data, error } = await supabase
      .from("golfers")
      .insert(golfers)
      .select();

    if (error) throw error;

    return NextResponse.json({
      message: `Seeded ${data.length} golfers across 7 tiers`,
      tiers: Object.fromEntries(
        [1, 2, 3, 4, 5, 6, 7].map((t) => [
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
