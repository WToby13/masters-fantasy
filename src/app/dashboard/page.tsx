import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import PoolLobby from "@/components/PoolLobby";
import type { Tournament, Profile, Pool, PoolMember } from "@/lib/types";

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

  let userPools: (PoolMember & { pool: Pool })[] = [];

  if (tournament) {
    const { data: memberships } = await supabase
      .from("pool_members")
      .select("*, pool:pools(*)")
      .eq("user_id", user.id);

    userPools = ((memberships || []) as (PoolMember & { pool: Pool })[]).filter(
      (m) => m.pool?.tournament_id === tournament?.id
    );
  }

  return (
    <PoolLobby
      user={user}
      profile={profile as Profile}
      tournament={tournament || null}
      userPools={userPools}
    />
  );
}
