import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import JoinClient from "@/components/JoinClient";
import type { Pool } from "@/lib/types";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: pool } = await supabase
    .from("pools")
    .select("*")
    .eq("invite_code", code.toUpperCase())
    .single();

  if (!pool) redirect("/dashboard");

  if (user) {
    const { data: existing } = await supabase
      .from("pool_members")
      .select("id")
      .eq("pool_id", (pool as Pool).id)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      redirect(`/pool/${(pool as Pool).id}`);
    }
  }

  return <JoinClient pool={pool as Pool} isLoggedIn={!!user} />;
}
