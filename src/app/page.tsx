import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <main className="min-h-screen flex flex-col bg-masters-cream">
      {/* Hero */}
      <section className="bg-masters-green text-white">
        <div className="max-w-3xl mx-auto px-6 py-14 text-center">
          <p className="text-masters-yellow text-[10px] font-semibold tracking-[0.35em] uppercase mb-2">
            A Tradition Unlike Any Other
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
            Masters Fantasy Pool
          </h1>
          <p className="text-white/60 text-sm max-w-md mx-auto">
            Seven tiers. Four scores count. Lowest total wins.
          </p>
          <div className="divider-gold max-w-48 mx-auto mt-8" />
        </div>
      </section>

      {/* Rules + Auth */}
      <section className="max-w-4xl mx-auto px-6 py-10 flex-1 grid md:grid-cols-2 gap-10 items-start">
        <div>
          <h2 className="text-sm font-bold text-masters-green mb-5 uppercase tracking-wider">
            How It Works
          </h2>
          <div className="space-y-4">
            {[
              {
                n: "1",
                title: "Draft Your Team",
                desc: "Pick one golfer from each of 7 tiers — including a dedicated Canadian tier.",
              },
              {
                n: "2",
                title: "Best 4 Count",
                desc: "Your four best scores are summed. Missed cuts get 80 for rounds 3 & 4.",
              },
              {
                n: "3",
                title: "Win the Jacket",
                desc: "Lowest total wins. Tiebreaker: closest to the winner's final score.",
              },
            ].map((step) => (
              <div key={step.n} className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-masters-green text-white flex items-center justify-center text-[10px] font-bold">
                  {step.n}
                </span>
                <div>
                  <p className="text-sm font-semibold text-masters-green">
                    {step.title}
                  </p>
                  <p className="text-xs text-masters-green/50 mt-0.5 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-4 gap-2">
            {[
              { label: "Tiers", value: "7" },
              { label: "Count", value: "Best 4" },
              { label: "Scoring", value: "Strokes" },
              { label: "Cut Penalty", value: "80/rd" },
            ].map((stat) => (
              <div key={stat.label} className="card px-2 py-2 text-center">
                <p className="text-base font-bold text-masters-green font-sans">
                  {stat.value}
                </p>
                <p className="text-[9px] text-masters-green/40 uppercase tracking-wider">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <AuthForm />
      </section>

      <footer className="bg-masters-green text-white/30 text-center py-4 text-xs">
        Masters Fantasy Pool &middot; {new Date().getFullYear()}
      </footer>
    </main>
  );
}
