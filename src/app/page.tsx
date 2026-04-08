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
      <section className="bg-masters-dark text-white">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <p className="text-masters-yellow text-[10px] font-semibold tracking-[0.35em] uppercase mb-3">
            A Tradition Unlike Any Other
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
            Masters Fantasy Pool
          </h1>
          <p className="text-green-200/80 text-sm max-w-md mx-auto">
            Seven tiers. Four scores count. Lowest total wins the jacket.
          </p>
          <div className="divider-gold max-w-48 mx-auto mt-8" />
        </div>
      </section>

      {/* How it works + Auth side by side */}
      <section className="max-w-5xl mx-auto px-6 py-12 flex-1 grid md:grid-cols-2 gap-10 items-start">
        {/* Left — Rules */}
        <div>
          <h2 className="text-lg font-bold text-masters-dark mb-6">
            How It Works
          </h2>
          <div className="space-y-4">
            {[
              {
                n: "1",
                title: "Draft Your Team",
                desc: "Pick one golfer from each of the 7 tiers — including a dedicated Canadian tier.",
              },
              {
                n: "2",
                title: "Best 4 Count",
                desc: "After the tournament, your best four scores are summed. Missed cuts score 80 for rounds 3 & 4.",
              },
              {
                n: "3",
                title: "Win the Jacket",
                desc: "Lowest total wins. Tiebreaker: closest prediction to the winner's final score.",
              },
            ].map((step) => (
              <div key={step.n} className="flex gap-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-masters-green text-white flex items-center justify-center text-xs font-bold">
                  {step.n}
                </span>
                <div>
                  <p className="text-sm font-semibold text-masters-dark">
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-4 gap-2">
            {[
              { label: "Tiers", value: "7" },
              { label: "Count", value: "Best 4" },
              { label: "Scoring", value: "Strokes" },
              { label: "Cut Rule", value: "80/rd" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="card px-3 py-2 text-center"
              >
                <p className="text-lg font-bold text-masters-green font-sans">
                  {stat.value}
                </p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Auth */}
        <AuthForm />
      </section>

      {/* Footer */}
      <footer className="bg-masters-dark text-green-200/50 text-center py-4 text-xs">
        Masters Fantasy Pool &middot; {new Date().getFullYear()}
      </footer>
    </main>
  );
}
