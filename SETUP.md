# Shortlist — going from demo to real product

The app runs with **zero configuration**: a simulated market, browser-local
storage, and all Pro features unlocked. Every real-backend feature is gated on
its environment variables, so you turn things on one at a time by adding keys.

This guide takes you from the local demo to a deployed product with accounts,
real data, and subscriptions. Budget ~20–30 minutes.

---

## 0. Run the demo locally

```bash
npm install
npm run dev          # http://localhost:3000
```

Copy `.env.local.example` to `.env.local` and fill in only the sections you want.

---

## 1. Real market data (optional)

| Provider | Env var | Free tier gives |
| --- | --- | --- |
| [Finnhub](https://finnhub.io) | `FINNHUB_API_KEY` | real-time quotes |
| [Alpha Vantage](https://www.alphavantage.co/support/#api-key) | `ALPHAVANTAGE_API_KEY` | daily candles |

With neither set the scanner uses the built-in simulator. The header shows
**LIVE** vs **SIM** so you always know which is active.

> Short-interest / borrow-fee figures in the Squeeze Radar are realistic
> baselines. To make them live, plug a short-interest feed (ORTEX, Fintel, or
> FINRA bi-monthly files) into `src/lib/squeeze.ts`.

## 2. AI thesis (optional)

Set `OPENAI_API_KEY` to generate the bear/bull thesis with GPT. Without it a
deterministic generator produces a solid version, so the feature always works.

---

## 3. Accounts + database (Supabase)

1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query** → paste `supabase/migrations/0001_init.sql` → Run.
   This creates the tables, row-level security, and the auto-profile trigger.
3. **Project Settings → API**, copy into `.env.local`:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret)
4. **Authentication → URL Configuration**: add your site URL and
   `<site>/auth/callback` as a redirect URL (use `http://localhost:3000` for dev).

Restart `npm run dev`. A **Sign in** button appears; tracked shorts now persist
to Postgres per user instead of localStorage.

---

## 4. Payments (Stripe)

1. In the [Stripe dashboard](https://dashboard.stripe.com) create a **Product**
   with a recurring **Price** (e.g. £12/mo). Copy the price id (`price_…`) into
   `NEXT_PUBLIC_STRIPE_PRICE_ID`.
2. Copy your **Secret key** into `STRIPE_SECRET_KEY`.
3. Create a **webhook** pointing at `<site>/api/stripe/webhook` for events
   `checkout.session.completed` and `customer.subscription.*`. Copy the signing
   secret into `STRIPE_WEBHOOK_SECRET`.
   - Local testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
4. Restart. `/pricing` now drives real Checkout; Pro unlocks the AI thesis and
   put structures. With Stripe unset, all Pro features stay unlocked (demo).

---

## 5. Deploy (Vercel)

1. Push this repo to GitHub (already done on your feature branch).
2. Import it at [vercel.com/new](https://vercel.com/new) — it autodetects Next.js.
3. Add **all** the env vars from `.env.local` in **Project → Settings →
   Environment Variables**, and set `NEXT_PUBLIC_APP_URL` to your Vercel URL.
4. Deploy. Then update Supabase redirect URLs and the Stripe webhook URL to the
   live domain.

That's it — accounts, real data, subscriptions, and alerts, live on the web.
