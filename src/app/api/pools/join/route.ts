import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { invite_code } = await request.json();
    if (!invite_code) {
      return NextResponse.json(
        { error: "invite_code required" },
        { status: 400 }
      );
    }

    const { data: pool, error: poolErr } = await supabase
      .from("pools")
      .select("*")
      .eq("invite_code", invite_code.toUpperCase().trim())
      .single();

    if (poolErr || !pool) {
      return NextResponse.json(
        { error: "Pool not found. Check the invite code." },
        { status: 404 }
      );
    }

    const { error: joinErr } = await supabase
      .from("pool_members")
      .insert({ pool_id: pool.id, user_id: user.id });

    if (joinErr) {
      if (joinErr.code === "23505") {
        return NextResponse.json(pool);
      }
      throw joinErr;
    }

    return NextResponse.json(pool);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
