import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
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

  const typedPool = pool as Pool;

  if (user) {
    const { data: existing } = await supabase
      .from("pool_members")
      .select("id")
      .eq("pool_id", typedPool.id)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      redirect(`/pool/${typedPool.id}`);
    }

    const admin = createAdminClient();
    await admin.from("pool_members").insert({
      pool_id: typedPool.id,
      user_id: user.id,
    });
    redirect(`/pool/${typedPool.id}`);
  }

  return <JoinClient pool={typedPool} />;
}
