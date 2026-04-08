import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { TreePine } from "lucide-react";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <main className="flex-1 flex flex-col">
      {/* Hero */}
      <section className="relative bg-masters-green text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-transparent" />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 py-20 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <TreePine className="w-8 h-8 text-masters-yellow" />
            <span className="text-masters-yellow text-sm font-semibold tracking-[0.3em] uppercase">
              A Tradition Unlike Any Other
            </span>
            <TreePine className="w-8 h-8 text-masters-yellow" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4">
            Masters Fantasy Pool
          </h1>
          <p className="text-lg text-green-100 max-w-2xl mx-auto mb-2">
            Draft your team across six tiers. Your best four scores count.
            <br />
            Lowest total wins the green jacket.
          </p>
          <div className="azalea-divider max-w-xs mx-auto mt-8" />
        </div>
      </section>

      {/* How it Works */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-center text-2xl font-bold text-masters-dark mb-10">
          How It Works
        </h2>
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="text-center">
            <div className="w-12 h-12 bg-masters-green text-white rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold font-sans">
              1
            </div>
            <h3 className="font-bold text-lg mb-2">Draft Your Team</h3>
            <p className="text-gray-600 text-sm">
              Pick one golfer from each of the 6 tiers, ranked by world
              standings.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-masters-green text-white rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold font-sans">
              2
            </div>
            <h3 className="font-bold text-lg mb-2">Best 4 Count</h3>
            <p className="text-gray-600 text-sm">
              After the tournament, your best four scores are summed. Missed
              cuts score 80 for rounds 3 &amp; 4.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-masters-green text-white rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold font-sans">
              3
            </div>
            <h3 className="font-bold text-lg mb-2">Win the Jacket</h3>
            <p className="text-gray-600 text-sm">
              Lowest total wins. Tiebreaker: closest prediction to the
              winner&apos;s final score.
            </p>
          </div>
        </div>
      </section>

      {/* Auth */}
      <section className="bg-masters-sand/50 py-16 px-6 flex-1">
        <AuthForm />
      </section>

      {/* Footer */}
      <footer className="bg-masters-dark text-green-200 text-center py-6 text-sm">
        <p>Masters Fantasy Pool &middot; {new Date().getFullYear()}</p>
      </footer>
    </main>
  );
}
