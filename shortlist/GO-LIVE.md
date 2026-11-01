# Go live: web, iPhone and Android

Everything in the code is ready. The steps below are the ones that need your
accounts, payment details or legal sign-off, in the order to do them.

| Piece | Status |
| --- | --- |
| Web app | Ready. Needs a Vercel project and environment variables (step 1). |
| Demo mode | Works with zero setup. |
| Real mode (Trading 212) | Ready. Needs `BROKER_SECRET` on the server (step 2). |
| Live prices | Crypto streams in real time with no setup. US shares stream with a free Finnhub key; UK shares need a paid feed (step 3). |
| Accounts and sync | Needs a Supabase project. The free plan is full (step 4). |
| Android app | Built by GitHub Actions. Needs a Play account and signing key (step 5). |
| iPhone app | Compiled by GitHub Actions. Needs an Apple Developer account (step 6). |
| Adverts | Built in. Shortlist promos fill the ad spaces until Google approves AdSense / AdMob (step 7). |
| Ad-free plan (£6.99/month) | Built in. Needs Stripe, App Store / Google Play products and RevenueCat (step 8). |

---

## 1. Put the web app live (about 10 minutes)

Shortlist lives in the `shortlist/` folder of the `TattonProjects7/gowthdesk`
repository, next to GrowthDesk and SiteCalc. The existing Vercel project
`gowthdesk` keeps serving GrowthDesk from the repository root. Shortlist gets
its own Vercel project, pointed at the `shortlist/` folder:

1. Merge PR #3 into `main`. It only adds the `shortlist/` folder and its build
   workflows (and tells GrowthDesk's TypeScript settings to ignore that
   folder), so GrowthDesk and SiteCalc carry on exactly as before.
2. Vercel → **Add New → Project** → import `TattonProjects7/gowthdesk`.
3. Name it `shortlist`. Framework: **Next.js**. Next to **Root Directory**,
   click **Edit** and choose `shortlist`.
4. Add the environment variables below, then **Deploy**. From now on every
   push to `main` updates the live site.
5. Optional: **Settings → Git → Ignored Build Step** → "Only build if there are
   changes in a folder", so each project only rebuilds when its own code
   changes. Do the same on the `gowthdesk` project if you like.
6. Optional: **Settings → Domains** → add your own domain.
7. Upgrade the Vercel team to **Pro** before you switch adverts or payments
   on. The free Hobby plan is for non-commercial use only, and Shortlist earns
   money from ads and subscriptions.

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Your live address, e.g. `https://shortlist.vercel.app`. The apps load this. |
| `BROKER_SECRET` | A long random string, needed for real mode. Mac: `openssl rand -base64 48`. Windows: see below. |
| `ANTHROPIC_API_KEY` | Turns on the live AI coach and digests. Optional. |
| `FINNHUB_API_KEY` | Real-time US share prices, delayed quotes and live company fundamentals. Strongly recommended before real mode. |
| `TWELVEDATA_API_KEY` | Real daily price history for US shares and ETFs (charts and indicators). Optional. |
| `ALPHAVANTAGE_API_KEY` | Daily price history for the short-scanner names. Optional. |

**Making `BROKER_SECRET` on Windows:** open PowerShell and run:

```powershell
$b = New-Object byte[] 48; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)
```

Supabase, Stripe and RevenueCat variables are in `.env.local.example` and
`SETUP.md`. The app runs without them.

## 2. Real trading with Trading 212

Users connect their own Trading 212 **Invest** or **Stocks ISA** account in
**Settings → Real trading**, or by tapping **Real** in the top bar.

- In the Trading 212 app: **Settings → API (Beta) → Generate key**. Start with
  the **practice** account, which uses Trading 212's free virtual money.
- The key is checked with Trading 212, then encrypted into an httpOnly cookie
  on the user's device. It is never stored in a database, and page scripts
  can't read it.
- Supported: shares and ETFs, with market, limit and stop orders. Crypto is
  not available through Trading 212's API, so it stays demo-only.
- Every real order has a review screen first. Live orders carry a real-money
  warning, and live connection needs an explicit acknowledgement.

Before you offer real mode to the public:

- **Get UK regulatory advice.** An app that sends orders to a broker may be
  "arranging deals in investments" under FCA rules. Ask a regulatory lawyer
  whether you need authorisation, an appointed-representative arrangement, or
  fall under an exclusion.
- **Read Trading 212's API terms.** The API is still marked beta.
- **Add live prices** (step 3). Until then the ticket labels prices as
  indicative, and market orders fill at Trading 212's live price.

## 3. Live prices

Every price carries a label, so nobody mistakes sample data for real:
**Real-time** (streaming trade by trade), **Delayed** (a real quote refreshed
every few minutes), **Market closed** (the last real price) or **Simulated**.

| What | Real-time source | Setup | Cost |
| --- | --- | --- | --- |
| Crypto (BTC, ETH, SOL, XRP, DOGE) | Coinbase public feed, 24/7 | None, works straight away | Free |
| Crypto price history | Coinbase daily candles | None | Free |
| US shares | Finnhub WebSocket, during US market hours | `FINNHUB_API_KEY` (free at finnhub.io) | Free plan: 50 shares at a time |
| Every other US share | Finnhub delayed quotes, refreshed in rotation | Same key | Free |
| US price history | Twelve Data daily candles | `TWELVEDATA_API_KEY` (free at twelvedata.com) | Free plan: 800 calls a day |
| UK shares and London-listed ETFs | Needs a paid London feed | See below | Paid |

How the 50 free US slots are used: the shares people are looking at right now
(quote page, watchlist, holdings, charts) get slots first; the rest go to the
largest companies. Everything else shows a delayed quote.

The stream runs through `/api/stream` on your own server, so keys never reach
the browser. The app holds one connection to each provider per server and
shares it between viewers. It closes while the app is in the background, to
save battery and data.

**Before you scale up:**

- **Commercial use.** Free data plans are for personal use. Once Shortlist has
  paying users or adverts, move to each provider's commercial plan (Finnhub,
  Twelve Data), and check Coinbase's market-data terms.
- **UK real-time.** Real-time London Stock Exchange prices need an LSE
  data licence through a vendor. Ask Finnhub, Twelve Data or EODHD for their
  London real-time plans and the LSE's display licence terms. Until then, UK
  shares show simulated prices, or delayed ones on a paid Finnhub plan.
- **Many users at once.** Each server instance opens its own upstream
  connection. Finnhub's free plan allows one connection per key, so at
  higher traffic either upgrade, or move the relay to one always-on server.

After a fresh deploy, quotes fill within a few minutes and US company
fundamentals within about 20, as the server spreads requests across the free
tier's limit.

## 4. Accounts and cross-device sync (optional)

Your Supabase organisation is on the free plan, which allows two active
projects. Both are in use, by EstiMate and Apex. Either upgrade the
organisation to Pro, or pause a project you no longer need. Then:

1. Create a project called `Shortlist`.
2. Run `supabase/migrations/0001_init.sql` and `0002_user_state.sql`.
3. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
   `SUPABASE_SERVICE_ROLE_KEY` to Vercel.

Without this, everything still works and each user's data stays on their device.

## 5. Android (Google Play)

1. Create a Google Play developer account (one-off fee) and a new app with the
   package name `uk.co.tattonprojects.shortlist`.
2. The apps open `https://gowthdesk-jpim.vercel.app` (the Shortlist Vercel
   project's address) out of the box. To point them somewhere else, such as
   a custom domain, set the GitHub repository variable `APP_URL` (repo
   **Settings → Secrets and variables → Actions → Variables**).
3. Create an upload key on your computer and keep it safe. Losing it locks you
   out of updates:

   ```bash
   keytool -genkey -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
   base64 -w0 upload.jks   # on macOS: base64 -i upload.jks
   ```

   On Windows, install Java first (Temurin JDK from adoptium.net, with "Add to
   PATH" ticked). Then, in PowerShell:

   ```powershell
   keytool -genkey -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("$PWD\upload.jks")) | Set-Clipboard
   ```

   The second line copies the base64 text to your clipboard, ready to paste.

4. Add these repository **secrets**: `ANDROID_KEYSTORE_BASE64` (the base64
   output), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`upload`) and
   `ANDROID_KEY_PASSWORD`.
5. GitHub → **Actions → Shortlist Android** → open the latest run → **Re-run all jobs**.
   Download `shortlist-release-aab` from the run, and upload it in the Play
   Console as your first release. Turn on Play App Signing when asked.
6. Later releases can go up automatically. Create a Play service account with
   release permissions and add its JSON as the `PLAY_SERVICE_ACCOUNT_JSON`
   secret. Add the repository variable `PLAY_AUTO_UPLOAD` = `true`, then
   re-run the latest Android run. Each build is uploaded as a draft on the
   internal track, or the track in the variable `PLAY_TRACK`.
7. In the Play Console, complete Data safety, content rating (18+), the
   Financial features declaration and the store listing. Copy and
   screenshots are in `store/`.
8. A new **personal** Play developer account has to run a closed test with
   at least 12 testers for 14 days before it can publish. Organisation
   accounts skip this, so register as Tatton Projects if you can.

Every Android run also produces `shortlist-debug-apk`, which you can install on
any Android phone to test straight away.

> The **Run workflow** button only appears once these workflows are on `main`
> (after PR #3 is merged).
> Until then, re-run the latest run, which uses your current secrets and
> variables.

## 6. iPhone (App Store)

1. Join the Apple Developer Program **as an organisation**, not an individual.
   Apps that offer real-money trading must be submitted by a legal entity
   (App Review Guideline 5.1.1(ix)).
2. In the developer portal, **Certificates, Identifiers & Profiles →
   Identifiers → +** → App ID `uk.co.tattonprojects.shortlist`, with Push Notifications
   ticked. Then, in App Store Connect, create the app with that bundle ID.
3. **Users and Access → Integrations → App Store Connect API** → generate a key
   with the **Admin** role, so the build can create its own signing
   certificate. Add three repository secrets: `ASC_KEY_ID`,
   `ASC_ISSUER_ID` and `ASC_KEY_P8` (the full contents of the .p8 file). The
   Tatton Projects team ID (`UJ6WA4G6H9`) is already in the workflow; an
   `APPLE_TEAM_ID` secret overrides it.
4. Add the repository variable `TESTFLIGHT_AUTO_UPLOAD` = `true`. Then
   GitHub → **Actions → Shortlist iOS** → open the latest run → **Re-run all jobs**. The
   build appears in TestFlight after processing.
5. Test it in TestFlight, then submit for review with the screenshots in
   `store/screenshots/ios-6.9in` and the copy in `store/LISTING.md`. In the
   review notes, give Apple a Trading 212 **practice** API key, so they can
   try real mode without real money.

The iOS workflow also compiles the app for the simulator on every native
change, with no Apple account needed, so build breaks show up early.

## 7. Adverts (web and apps)

Ads appear on research and learning screens: Markets, Screener, Heatmap,
Groups, Charts, News, Calendar, Watchlist, Learn, and quote pages on the web.
They never appear on trading, portfolio, account, sign-in or legal screens,
inside a lesson, or anywhere while someone is in real-money mode. Ad-free and
Pro subscribers see none, and the ad scripts aren't even loaded for them.
Until the ad networks approve you, those spaces show Shortlist promos.

**Website: Google AdSense**

1. Sign up at **adsense.google.com** with your business details and add your
   live website address. Google reviews the site, which can take a few days.
2. When approved, go to **Ads → By ad unit → Display ads**. Create a
   responsive unit called "Shortlist display" and copy its **slot ID** (the
   number in `data-ad-slot`).
3. In Vercel, add `NEXT_PUBLIC_ADSENSE_CLIENT` (your `ca-pub-…` ID) and
   `NEXT_PUBLIC_ADSENSE_SLOT`, then redeploy. `yoursite/ads.txt` is generated
   automatically from your publisher ID.
4. **Privacy & messaging → European regulations**: create and publish the
   consent message. It's required to show personalised ads in the UK and EU.
5. **Blocking controls**: block gambling, "get rich quick" and other sensitive
   categories. Consider blocking crypto and CFD advertisers too: adverts sit
   next to an investing app.

**Apps: Google AdMob** (AdSense isn't allowed inside apps)

1. At **admob.google.com**, add two apps, Shortlist for iOS and Shortlist for
   Android, and create a **banner** ad unit in each. Note each app's **App ID**
   (`ca-app-pub-…~…`) and each banner's **ad unit ID** (`ca-app-pub-…/…`).
2. GitHub → **Settings → Secrets and variables → Actions → Variables**: add
   `ADMOB_APP_ID_ANDROID` and `ADMOB_APP_ID_IOS` (the App IDs).
3. Vercel: add `NEXT_PUBLIC_ADMOB_BANNER_ANDROID` and
   `NEXT_PUBLIC_ADMOB_BANNER_IOS` (the ad unit IDs), then redeploy.
4. AdMob → **Privacy & messaging**: publish the European regulations message
   and the iOS "IDFA explainer". The app shows Google's consent form and then
   Apple's tracking prompt before the first ad.
5. List your website on both store listings. AdMob checks
   `yoursite/app-ads.txt`, which is generated automatically.
6. Re-run the Android and iOS builds so the App IDs are baked in.
7. To check everything before launch, set `NEXT_PUBLIC_ADMOB_TEST=1` in Vercel
   for Google's test ads. Remove it before release.

**Store declarations (required)**

- **Google Play**: App content → **Ads → "Yes, my app contains ads"**. In Data
  safety, declare **Device or other IDs** collected and shared for
  **Advertising**.
- **App Store**: App Privacy → **Identifiers → Device ID**, used for
  **Third-Party Advertising** and **tracking**. The tracking prompt text is
  already in the app.

## 8. The ad-free plan (£6.99 a month)

One purchase removes ads on the web and in both apps for that person's account,
so it needs accounts (step 4). Pro (£12) includes ad-free.

1. **Supabase**: run `supabase/migrations/0003_entitlements.sql` in the SQL
   editor.
2. **Stripe (web)**: Products → **Add product** "Shortlist Ad-free", recurring,
   **£6.99 monthly**. Copy its price ID (`price_…`) into Vercel as
   `NEXT_PUBLIC_STRIPE_ADFREE_PRICE_ID`. Make sure your Stripe webhook (pointing
   at `/api/stripe/webhook`) sends `checkout.session.completed` and
   `customer.subscription.*` events.
3. **App Store Connect (iPhone)**: your app → **Subscriptions** → create a
   group "Shortlist" and an auto-renewable subscription, product ID
   `shortlist_adfree_monthly`, price **£6.99**, duration 1 month.
4. **Google Play Console (Android)**: Monetise → **Subscriptions** → create
   `shortlist_adfree_monthly` with a monthly base plan at **£6.99**.
5. **RevenueCat**:
   - Add both store products.
   - Create an **entitlement** called `ad_free` and attach both products.
   - Create an **offering** with the identifier `ad_free`, containing a monthly
     package with both products.
   - Under **Integrations → Webhooks**, add `https://yoursite/api/revenuecat/webhook`
     with an Authorization header value of your choice, then put the same value
     in Vercel as `REVENUECAT_WEBHOOK_AUTH`.
6. Redeploy. The **Ad-free** card on the Pricing page and Settings → Adverts
   switch from "Coming soon" to a working purchase button.

Subscribers manage or cancel on the web from Settings → Adverts → Manage
(Stripe portal), and in the apps from their App Store or Google Play
subscriptions.

---

## Secrets and variables at a glance

| Where | Name | Used for |
| --- | --- | --- |
| Vercel | `NEXT_PUBLIC_APP_URL` | Live address, also loaded by the apps |
| Vercel | `BROKER_SECRET` | Encrypting Trading 212 keys (real mode) |
| Vercel | `FINNHUB_API_KEY` | Real-time US prices, delayed quotes and screener fundamentals |
| Vercel | `TWELVEDATA_API_KEY`, `ALPHAVANTAGE_API_KEY` | Real daily price history |
| Vercel | `FINNHUB_WS_SYMBOLS` (optional, default 50), `LIVE_STREAM=off` (optional) | Streaming slots on a paid plan, or turning streaming off |
| Vercel | `ANTHROPIC_API_KEY` | AI coach and digests |
| GitHub variable | `APP_URL` | Address the native apps open |
| GitHub variable | `PLAY_AUTO_UPLOAD`, `PLAY_TRACK`, `TESTFLIGHT_AUTO_UPLOAD` | Turning store uploads on |
| GitHub secret | `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` | Signing the Play bundle |
| GitHub secret | `PLAY_SERVICE_ACCOUNT_JSON` | Uploading to Google Play |
| GitHub secret | `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8`, `APPLE_TEAM_ID` | Signing and uploading to TestFlight |
| Vercel | `NEXT_PUBLIC_ADSENSE_CLIENT`, `NEXT_PUBLIC_ADSENSE_SLOT` (+ optional `NEXT_PUBLIC_ADSENSE_INFEED_SLOT`) | Website adverts (AdSense) |
| Vercel | `NEXT_PUBLIC_ADMOB_BANNER_IOS`, `NEXT_PUBLIC_ADMOB_BANNER_ANDROID` (+ `NEXT_PUBLIC_ADMOB_TEST=1` for test ads) | App adverts (AdMob) |
| GitHub variable | `ADMOB_APP_ID_IOS`, `ADMOB_APP_ID_ANDROID` | AdMob app IDs baked into the app builds |
| Vercel | `NEXT_PUBLIC_STRIPE_ADFREE_PRICE_ID` | The £6.99 ad-free plan on the web |
| Vercel | `REVENUECAT_WEBHOOK_AUTH` | Lets app-store purchases remove ads on the web |
