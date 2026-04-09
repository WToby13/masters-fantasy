"use client";

import { useRouter } from "next/navigation";
import type { Pool } from "@/lib/types";

export default function JoinClient({ pool }: { pool: Pool }) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-masters-cream flex flex-col items-center justify-center px-4">
      <div className="card p-8 max-w-sm w-full text-center">
        <p className="text-[10px] text-masters-gold font-semibold tracking-[0.2em] uppercase mb-2">
          You&apos;re invited to
        </p>
        <h1 className="text-2xl font-bold text-masters-green mb-1">
          {pool.name}
        </h1>
        <p className="text-xs text-masters-green/40 mb-6">
          Masters Fantasy Pool
        </p>

        <div className="space-y-3">
          <button
            onClick={() => router.push(`/?next=/join/${pool.invite_code}`)}
            className="btn-primary w-full"
          >
            Sign up to Join
          </button>
          <p className="text-[11px] text-masters-green/40">
            Already have an account?{" "}
            <button
              onClick={() =>
                router.push(`/?next=/join/${pool.invite_code}`)
              }
              className="text-masters-green underline underline-offset-2"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
