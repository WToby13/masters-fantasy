import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/DashboardClient";
import type { Tournament, Golfer, Profile, Pick } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("*")
    .order("year", { ascending: false })
    .limit(1);

  const tournament = tournaments?.[0] as Tournament | undefined;

  let golfers: Golfer[] = [];
  let userPicks: Pick[] = [];
  let allPicks: (Pick & { golfer: Golfer; profile: Profile })[] = [];
  let allProfiles: Profile[] = [];

  if (tournament) {
    const { data: g } = await supabase
      .from("golfers")
      .select("*")
      .eq("tournament_id", tournament.id)
      .order("world_ranking", { ascending: true });
    golfers = (g as Golfer[]) || [];

    const { data: p } = await supabase
      .from("picks")
      .select("*")
      .eq("tournament_id", tournament.id)
      .eq("user_id", user.id);
    userPicks = (p as Pick[]) || [];

    const { data: ap } = await supabase
      .from("picks")
      .select("*, golfer:golfers(*)")
      .eq("tournament_id", tournament.id);
    allPicks = (ap as (Pick & { golfer: Golfer; profile: Profile })[]) || [];

    const { data: profs } = await supabase.from("profiles").select("*");
    allProfiles = (profs as Profile[]) || [];
  }

  return (
    <DashboardClient
      user={user}
      profile={profile as Profile}
      tournament={tournament || null}
      golfers={golfers}
      userPicks={userPicks}
      allPicks={allPicks}
      allProfiles={allProfiles}
    />
  );
}
