# Shortlist — complete launch runbook

Work top to bottom. Each phase ends in a working state. Commands are copy-paste.
`🔑` = create an account / paste a key · `💻` = needs a Mac.

---

## Phase 0 — Local machine setup

Install Node 20+ and Git, then get the code.

```bash
# check versions (need Node >= 20)
node -v
git --version

# clone your repo and switch to the feature branch (or merge PR #3 to main first)
git clone https://github.com/TattonProjects7/gowthdesk.git
cd gowthdesk
git checkout claude/stock-trading-app-idea-aaj8rv

# install dependencies
npm install

# create your local env file
cp .env.local.example .env.local

# run it — everything works in demo mode with no keys yet
npm run dev
```

Open http://localhost:3000. You should see the landing page; `/scan` is the app.

Sanity checks any time:
```bash
npm test            # 21 unit tests
npx tsc --noEmit    # types
npm run build       # production build
```

---

## Phase 1 — Accounts + database (Supabase) 🔑

1. Go to https://supabase.com → **New project**. Pick a region near your users, set a strong DB password.
2. **SQL Editor → New query** → paste the entire contents of `supabase/migrations/0001_init.sql` → **Run**. (This creates the tables, security rules and the auto-profile trigger.)
3. **Project Settings → API** and copy three values into `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...        # "anon public"
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...            # "service_role" (keep secret)
```

4. **Authentication → URL Configuration**: set **Site URL** to `http://localhost:3000` and add `http://localhost:3000/auth/callback` under **Redirect URLs**.
5. Restart the dev server (`Ctrl+C`, then `npm run dev`).

**Test:** click **Sign in → Sign up**, create an account, track a short, refresh — it persists (now in Postgres, not just the browser).

---

## Phase 2 — Real market data + AI (optional) 🔑

```bash
# finnhub.io  → free API key (real-time quotes)
FINNHUB_API_KEY=xxxxx
# alphavantage.co/support/#api-key → free key (daily candles)
ALPHAVANTAGE_API_KEY=xxxxx
# platform.openai.com/api-keys → key (AI thesis; falls back to rules if absent)
OPENAI_API_KEY=sk-xxxxx
```

Add to `.env.local`, restart. The scanner header flips from **SIM** to **LIVE**.

---

## Phase 3 — Web payments (Stripe) 🔑

Do this in Stripe **Test mode** first (toggle top-right of the dashboard).

1. **Products → Add product**: name “Shortlist Pro”, add a **recurring** price (e.g. £12 / month). Copy the **price ID** (`price_...`).
2. **Developers → API keys**: copy the **Secret key** (`sk_test_...`).
3. Add to `.env.local`:

```bash
STRIPE_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_STRIPE_PRICE_ID=price_xxxxx
```

4. Install the Stripe CLI and forward webhooks to your local app:

```bash
# macOS
brew install stripe/stripe-cli/stripe
# then
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

The `listen` command prints a signing secret `whsec_...`. Add it and restart:

```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

**Test:** go to `/pricing → Upgrade`, pay with test card `4242 4242 4242 4242`, any future expiry / any CVC. After redirect, Pro unlocks (AI thesis + put alternative appear).

---

## Phase 4 — Deploy the web app (Vercel) 🔑

1. Push your branch to GitHub (already there). Go to https://vercel.com/new and **Import** the repo.
2. Before deploying, add **Environment Variables** (Settings → Environment Variables). Paste every key from your `.env.local`, and set:

```bash
NEXT_PUBLIC_APP_URL=https://YOUR-PROJECT.vercel.app
```

Full list to add:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
FINNHUB_API_KEY            (optional)
ALPHAVANTAGE_API_KEY       (optional)
OPENAI_API_KEY             (optional)
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PRICE_ID
STRIPE_WEBHOOK_SECRET      (set after step 4 below)
NEXT_PUBLIC_APP_URL
```

3. **Deploy.** Note your live URL.
4. **Point services at the live URL:**
   - Supabase → Authentication → URL Configuration: set Site URL to your Vercel URL and add `https://YOUR-PROJECT.vercel.app/auth/callback`.
   - Stripe → Developers → **Webhooks → Add endpoint**: URL `https://YOUR-PROJECT.vercel.app/api/stripe/webhook`, events `checkout.session.completed` and `customer.subscription.*`. Copy the new **signing secret** into the Vercel `STRIPE_WEBHOOK_SECRET` var.
5. **Redeploy** (Deployments → ⋯ → Redeploy) so the new vars apply.

**Test on the live URL:** sign up, upgrade with a test card, confirm Pro. When ready for real money, swap Stripe **live** keys and create a **live** webhook.

✅ **The web product is now live.**

---

## Phase 5 — Store prep (before touching Xcode)

- App icon already at `resources/icon.png` (regenerate if you rebrand).
- `/privacy` and `/terms` are live at your domain — you’ll paste the privacy URL into both stores. Have the wording reviewed by a professional.
- Confirm account deletion works (account menu → **Delete account**).

---

## Phase 6 — Generate the native apps 💻

On a Mac with **Xcode** and **Android Studio** installed. First set your live URL locally so the shell loads it:

```bash
# in .env.local
NEXT_PUBLIC_APP_URL=https://YOUR-PROJECT.vercel.app
```

```bash
# install CocoaPods once (iOS dependency manager)
brew install cocoapods

# create the native projects
npm install
npm run cap:add:ios
npm run cap:add:android
npm run cap:sync

# generate every icon + splash size from resources/
npm i -D @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor '#0d0f1a' --splashBackgroundColor '#0d0f1a'
```

Run it:
```bash
npm run cap:ios       # opens Xcode → pick a simulator → ▶
npm run cap:android   # opens Android Studio → pick an emulator → ▶
```

---

## Phase 7 — Push notifications 🔑💻

- **iOS**: in Xcode select the project → **Signing & Capabilities → + Capability** → add **Push Notifications** and **Background Modes** (tick *Remote notifications*). In the Apple Developer portal create an **APNs Auth Key**.
- **Android**: create a Firebase project (console.firebase.google.com), add an Android app with package `com.shortlist.app`, download **`google-services.json`** and drop it into `android/app/`.

The app already asks permission and registers; pushes appear in the in-app alert feed. Send them from your backend / FCM using the device token.

---

## Phase 8 — In-app purchases (RevenueCat) 🔑

Required for paid Pro on mobile.

1. **App Store Connect** and **Play Console**: create an auto-renewing subscription product (e.g. `pro_monthly`).
2. **RevenueCat** (app.revenuecat.com): add both apps, create an **Entitlement** named exactly `pro`, attach the products, add them to the **default Offering**. Copy the **public SDK keys**.
3. Because the native app loads your **deployed** web build, add the keys to **Vercel** (not just local) and redeploy:

```bash
NEXT_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxx
NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxx
```

4. Re-sync the native shells so the plugin is present:
```bash
npm run cap:sync
```

Now `/pricing` inside the apps sells Pro via native IAP with a **Restore purchases** option.

---

## Phase 9 — Submit 💻🔑

**iOS** — in Xcode set the Team and bump the version → **Product → Archive** → **Distribute App → App Store Connect** → in App Store Connect add it to **TestFlight**, fill in **App Privacy**, then **Submit for Review**.

**Android** — Android Studio → **Build → Generate Signed Bundle / APK → Android App Bundle**, create/keep a **keystore** (back it up!) → upload the `.aab` in the Play Console → **Internal testing** → then **Production**. Fill in **Data safety**.

**Both listings need:** screenshots (grab from a device, or the `/scan` and `/short/*` pages), description, support URL, and your **privacy policy URL** (`/privacy`).

### Review tips (avoid rejections)
- Digital subscriptions **must** use IAP inside the apps (already wired) — never link out to Stripe there.
- Keep the “not financial advice” disclaimer visible (it is).
- Provide in-app account deletion (it’s in the account menu).
- Complete App Privacy / Data Safety honestly (email + usage data).

---

## Accounts you’ll create
Vercel · Supabase · Stripe · Finnhub · Alpha Vantage · OpenAI (optional) ·
Apple Developer ($99/yr) · Google Play ($25 once) · RevenueCat · Firebase.

## If something breaks
- Build/type errors: `npx tsc --noEmit` and `npm run build` locally.
- Auth redirect loops: re-check Supabase Site URL + `/auth/callback` redirect.
- Webhook not updating Pro: confirm the endpoint URL + `STRIPE_WEBHOOK_SECRET` match the environment (test vs live).
- Native purchase does nothing: confirm the RevenueCat keys are in **Vercel** and you redeployed, then `npm run cap:sync`.
