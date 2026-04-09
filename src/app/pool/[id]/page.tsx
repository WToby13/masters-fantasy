import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/DashboardClient";
import type { Tournament, Golfer, Profile, Pick, Pool } from "@/lib/types";

export default async function PoolPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: poolId } = await params;
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

  const { data: pool } = await supabase
    .from("pools")
    .select("*")
    .eq("id", poolId)
    .single();

  if (!pool) redirect("/dashboard");

  const { data: membership } = await supabase
    .from("pool_members")
    .select("id")
    .eq("pool_id", poolId)
    .eq("user_id", user.id)
    .single();

  if (!membership) redirect("/dashboard");

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", (pool as Pool).tournament_id)
    .single();

  if (!tournament) redirect("/dashboard");

  const typedTournament = tournament as Tournament;

  const { data: g } = await supabase
    .from("golfers")
    .select("*")
    .eq("tournament_id", typedTournament.id)
    .order("world_ranking", { ascending: true });
  const golfers = (g as Golfer[]) || [];

  const { data: p } = await supabase
    .from("picks")
    .select("*")
    .eq("pool_id", poolId)
    .eq("user_id", user.id);
  const userPicks = (p as Pick[]) || [];

  const { data: members } = await supabase
    .from("pool_members")
    .select("user_id")
    .eq("pool_id", poolId);
  const memberIds = (members || []).map((m) => m.user_id);

  const { data: ap } = await supabase
    .from("picks")
    .select("*, golfer:golfers(*)")
    .eq("pool_id", poolId)
    .in("user_id", memberIds);
  const allPicks =
    (ap as (Pick & { golfer: Golfer; profile: Profile })[]) || [];

  const { data: profs } = await supabase
    .from("profiles")
    .select("*")
    .in("id", memberIds);
  const allProfiles = (profs as Profile[]) || [];

  return (
    <DashboardClient
      user={user}
      profile={profile as Profile}
      tournament={typedTournament}
      golfers={golfers}
      userPicks={userPicks}
      allPicks={allPicks}
      allProfiles={allProfiles}
      pool={pool as Pool}
    />
  );
}
