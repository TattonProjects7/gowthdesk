# Launch checklist

The single ordered path from this repo to a live product on the web and both app
stores. Detailed steps live in [SETUP.md](./SETUP.md) (web) and
[MOBILE.md](./MOBILE.md) (apps); this ties them together in the right sequence.

Legend: ⏱️ rough time · 🔑 needs an account/keys · 💻 needs a Mac

---

## Phase 1 — Web app live (⏱️ ~30 min)

- [ ] **Deploy to Vercel.** Import the repo, deploy. Note the URL. 🔑
- [ ] **Supabase** — create project, run `supabase/migrations/0001_init.sql`, copy the URL + anon + service_role keys into Vercel env. Add `<url>/auth/callback` to Auth redirect URLs. 🔑
- [ ] **Market data** — add `FINNHUB_API_KEY` and `ALPHAVANTAGE_API_KEY` (optional but makes it real). 🔑
- [ ] **AI thesis** — add `OPENAI_API_KEY` (optional; falls back to rules). 🔑
- [ ] **Stripe** — create the £12/mo price, add `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PRICE_ID`; add the webhook to `<url>/api/stripe/webhook` and set `STRIPE_WEBHOOK_SECRET`. 🔑
- [ ] Set `NEXT_PUBLIC_APP_URL` to your live URL and redeploy.
- [ ] **Smoke test**: sign up, track a short (persists), upgrade with a Stripe test card, confirm Pro unlocks.

✅ At this point the web product is fully live.

## Phase 2 — Store readiness

- [ ] App icon is in `resources/icon.png` (regenerate if you rebrand).
- [ ] `/privacy` and `/terms` are live — you'll paste the privacy URL into both stores. **Have a professional review the wording before launch.**
- [ ] Account deletion works (account menu → Delete account).
- [ ] Confirm the "not financial advice" disclaimer is visible.

## Phase 3 — Mobile apps (💻 Mac required)

- [ ] `npm run cap:add:ios && npm run cap:add:android && npm run cap:sync`
- [ ] Generate icons/splash: `npx capacitor-assets generate` (uses `resources/`).
- [ ] **Push**: APNs key (iOS) + Firebase `google-services.json` (Android). 🔑
- [ ] **In-app purchases**: create the Pro subscription in App Store Connect + Play Console, wire RevenueCat with a `pro` entitlement, add `NEXT_PUBLIC_REVENUECAT_IOS_KEY` / `_ANDROID_KEY`, redeploy web, `cap sync`. 🔑
- [ ] Test on a real device (purchase + restore).

## Phase 4 — Submit

- [ ] **iOS**: Xcode → Archive → App Store Connect → TestFlight → submit. Fill in App Privacy. 🔑💻
- [ ] **Android**: signed `.aab` → Play Console → internal testing → production. Fill in Data Safety. 🔑💻
- [ ] Store listings: screenshots (grab from a device or the `/scan` and `/short/*` pages), description, keywords, support + privacy URLs.

---

### Provider accounts you'll need
Vercel · Supabase · Stripe · Finnhub · Alpha Vantage · OpenAI (optional) ·
Apple Developer ($99/yr) · Google Play ($25 once) · RevenueCat · Firebase.

### Health checks
- CI (`.github/workflows/ci.yml`) runs typecheck + tests + build on every push.
- Locally: `npm test`, `npx tsc --noEmit`, `npm run build`.
