# Go live: web, iPhone and Android

Everything in the code is ready. The steps below are the ones that need your
accounts, payment details or legal sign-off, in the order to do them.

| Piece | Status |
| --- | --- |
| Web app | Ready. Needs a Vercel project and environment variables (step 1). |
| Demo mode | Works with zero setup. |
| Real mode (Trading 212) | Ready. Needs `BROKER_SECRET` on the server (step 2). |
| Live prices | Simulated until you add a market-data key (step 3). |
| Accounts and sync | Needs a Supabase project. The free plan is full (step 4). |
| Android app | Built by GitHub Actions. Needs a Play account and signing key (step 5). |
| iPhone app | Compiled by GitHub Actions. Needs an Apple Developer account (step 6). |

---

## 1. Put the web app live (about 10 minutes)

The existing Vercel project `gowthdesk` serves the GrowthDesk app from `main`.
**Do not merge PR #3 into `main` as it stands**, or it replaces GrowthDesk.
Give Shortlist its own Vercel project instead:

1. Vercel → **Add New → Project** → import `TattonProjects7/gowthdesk`.
2. Name it `shortlist`. Framework: **Next.js**. Root directory: `.`
3. Add the environment variables below, then **Deploy**. This first deploy
   builds `main` (GrowthDesk), which is expected. Ignore it.
4. Project → **Settings → Git → Production Branch**: set it to
   `claude/stock-trading-app-idea-aaj8rv` and save.
5. **Deployments → Create Deployment** → enter
   `claude/stock-trading-app-idea-aaj8rv` → **Create**. From now on every push
   to that branch updates the live site.
6. Optional: **Settings → Domains** → add your own domain.

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Your live address, e.g. `https://shortlist.vercel.app`. The apps load this. |
| `BROKER_SECRET` | A long random string, needed for real mode. Mac: `openssl rand -base64 48`. Windows: see below. |
| `ANTHROPIC_API_KEY` | Turns on the live AI coach and digests. Optional. |
| `FINNHUB_API_KEY` | Live prices and live company fundamentals for the screener. Strongly recommended before real mode. |
| `ALPHAVANTAGE_API_KEY` | Daily price history. Optional. |

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

Add `FINNHUB_API_KEY` (free at finnhub.io) for real-time quotes and live
fundamentals for US companies (P/E, margins, growth, analyst ratings) in the
screener. UK and other non-US companies, and everything when there's no key,
show sample fundamentals labelled "demo". Calls are
cached on the server and spread out to stay within the free tier's rate limit,
so after a fresh deploy the cache fills as people use the app: every quote
within a few minutes, every company's fundamentals within about 20. The free tier
covers US shares and crypto. London-listed quotes need a paid Finnhub plan.
Add `ALPHAVANTAGE_API_KEY` for daily candles.

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
   package name `com.shortlist.app`.
2. GitHub → repo **Settings → Secrets and variables → Actions → Variables** →
   add `APP_URL` = your live address from step 1.
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
5. GitHub → **Actions → Android** → open the latest run → **Re-run all jobs**.
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

Every Android run also produces `shortlist-debug-apk`, which you can install on
any Android phone to test straight away.

> The **Run workflow** button only appears once these workflows are on `main`.
> Until then, re-run the latest run, which uses your current secrets and
> variables.

## 6. iPhone (App Store)

1. Join the Apple Developer Program **as an organisation**, not an individual.
   Apps that offer real-money trading must be submitted by a legal entity
   (App Review Guideline 5.1.1(ix)).
2. In the developer portal, **Certificates, Identifiers & Profiles →
   Identifiers → +** → App ID `com.shortlist.app`, with Push Notifications
   ticked. Then, in App Store Connect, create the app with that bundle ID.
3. **Users and Access → Integrations → App Store Connect API** → generate a key
   with the **Admin** role, so the build can create its own signing
   certificate. Add repository secrets: `ASC_KEY_ID`,
   `ASC_ISSUER_ID`, `ASC_KEY_P8` (the full contents of the .p8 file) and
   `APPLE_TEAM_ID` (from your Membership page).
4. Add the repository variable `TESTFLIGHT_AUTO_UPLOAD` = `true`. Then
   GitHub → **Actions → iOS** → open the latest run → **Re-run all jobs**. The
   build appears in TestFlight after processing.
5. Test it in TestFlight, then submit for review with the screenshots in
   `store/screenshots/ios-6.9in` and the copy in `store/LISTING.md`. In the
   review notes, give Apple a Trading 212 **practice** API key, so they can
   try real mode without real money.

The iOS workflow also compiles the app for the simulator on every native
change, with no Apple account needed, so build breaks show up early.

---

## Secrets and variables at a glance

| Where | Name | Used for |
| --- | --- | --- |
| Vercel | `NEXT_PUBLIC_APP_URL` | Live address, also loaded by the apps |
| Vercel | `BROKER_SECRET` | Encrypting Trading 212 keys (real mode) |
| Vercel | `FINNHUB_API_KEY`, `ALPHAVANTAGE_API_KEY` | Live prices and screener fundamentals |
| Vercel | `ANTHROPIC_API_KEY` | AI coach and digests |
| GitHub variable | `APP_URL` | Address the native apps open |
| GitHub variable | `PLAY_AUTO_UPLOAD`, `PLAY_TRACK`, `TESTFLIGHT_AUTO_UPLOAD` | Turning store uploads on |
| GitHub secret | `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` | Signing the Play bundle |
| GitHub secret | `PLAY_SERVICE_ACCOUNT_JSON` | Uploading to Google Play |
| GitHub secret | `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8`, `APPLE_TEAM_ID` | Signing and uploading to TestFlight |
