# Masters Fantasy Pool

A private fantasy golf pool for The Masters. Pick one golfer from each of 6 tiers, and your best 4 scores count. Lowest total wins.

## Rules

- **6 Tiers, Use 4**: Select one golfer from each of the 6 tiers (organized by world ranking)
- **Best 4 Count**: After the tournament, your best four scores are summed
- **Missed Cut**: Any golfer who misses the cut gets 80 for rounds 3 and 4
- **Tiebreaker**: Predict the winning score — closest guess wins ties

## Tech Stack

- **Next.js 16** (App Router)
- **Supabase** (Auth + Postgres)
- **Tailwind CSS 4**
- **Vercel** (Hosting)
- **ESPN API** (Live scores — free, no key required)

## Setup

### 1. Create a Supabase Project

Go to [supabase.com](https://supabase.com) and create a new project.

### 2. Run the Schema

Open the SQL Editor in your Supabase dashboard and paste the contents of `supabase-schema.sql`. Run it.

### 3. Configure Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

You'll find these in Supabase → Settings → API.

### 4. Create a Tournament

In the Supabase Table Editor, insert a row into `tournaments`:

| Column | Value |
|--------|-------|
| name | The Masters 2026 |
| year | 2026 |
| status | drafting |

### 5. Seed Golfers

```bash
curl -X POST http://localhost:3000/api/seed-golfers \
  -H "Content-Type: application/json" \
  -d '{"tournament_id": "YOUR_TOURNAMENT_UUID"}'
```

### 6. Run Locally

```bash
npm install
npm run dev
```

### 7. Deploy to Vercel

Push to GitHub and import the repo in [vercel.com](https://vercel.com). Add the same environment variables.

## Updating Live Scores

During the tournament, call the scores endpoint to pull from ESPN:

```bash
curl -X POST https://your-site.vercel.app/api/scores \
  -H "Content-Type: application/json" \
  -d '{"tournament_id": "YOUR_TOURNAMENT_UUID"}'
```

You can automate this with a Vercel Cron Job or simply call it manually.

## ESPN API (Free, No Key)

Live scores come from ESPN's public scoreboard API:

```
https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard
```

No API key required. The event ID for The Masters changes yearly — check ESPN's site or the API response to find the current one.
