# Shortlist on iPhone & Android

The iOS and Android apps are **[Capacitor](https://capacitorjs.com)** projects,
committed in `ios/` and `android/`. They load the deployed web app, so every
screen (portfolio, markets, deal ticket, analytics, short scanner) is the same
code as the web, and they add native capabilities on top:

| Native capability | Plugin | Where it's used |
| --- | --- | --- |
| Face ID / Touch ID / fingerprint unlock | `@capgo/capacitor-native-biometric` | Settings → App lock (`src/lib/applock.ts`) |
| Phone notifications for price alerts, order fills, stop triggers, savings plans, dividends | `@capacitor/local-notifications` | `src/lib/native.ts` → `notify()` |
| Remote push (when the app is closed) | `@capacitor/push-notifications` | `src/components/NativeBridge.tsx` |
| Haptics on orders and tab changes | `@capacitor/haptics` | Deal ticket, bottom tab bar |
| In-app purchase for Pro | `@revenuecat/purchases-capacitor` | `/pricing` (`src/lib/iap.ts`) |
| Status bar, splash, Android back button, offline screen | `@capacitor/status-bar`, `splash-screen`, `app` | `NativeBridge.tsx`, `mobile/www/offline.html` |

The apps open straight into **Portfolio**, with a bottom tab bar and a
bottom-sheet deal ticket.

> You need a **Mac with Xcode 16+** to build and submit iOS, and **Android
> Studio** (with the Android SDK) for Android. Publishing needs an Apple
> Developer account ($99/yr) and a Google Play account ($25 once).

---

> **Builds in the cloud:** the `Android` and `iOS` GitHub Actions workflows
> build both apps for you, including signed store builds and TestFlight or
> Google Play uploads once the secrets are added. See **[GO-LIVE.md](./GO-LIVE.md)**,
> steps 5 and 6. The manual steps below are for building on your own Mac or PC.

## 1. Point the apps at your deployed site

Deploy the web app first (see `SETUP.md`). Then set its **https** address, in
your shell or in `.env.local`. The Capacitor config reads both.

```bash
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

The site must be publicly reachable. Turn off Vercel deployment protection for
the URL the apps use, or use a custom domain.

## 2. Sync and open

```bash
npm install
npm run cap:ios       # bakes the URL in, syncs plugins, opens Xcode
npm run cap:android   # same for Android Studio
```

Run on a simulator or device from there. Re-run `npm run cap:sync` whenever you
change `capacitor.config.ts`, add a plugin or change the URL. Web changes need
no app update, because the apps load the live site.

iOS uses Swift Package Manager, so CocoaPods is not needed.

## 3. Identity, icons and splash

- **Bundle id / package**: `com.shortlist.app`, set in `capacitor.config.ts`.
  Change it before the first store upload, then re-run `cap sync`.
- **Icons and splash screens** are already generated for both platforms from
  `resources/icon.png` (1024 × 1024) and `resources/splash.png` (2732 × 2732).
  After changing either, run `npm run cap:assets`.
- **Face ID permission text** is in `ios/App/App/Info.plist` under
  `NSFaceIDUsageDescription`.
- **Android notification icon**: `android/app/src/main/res/drawable/ic_stat_icon.xml`.

## 4. Push notifications (optional)

Local notifications work with no setup. Remote push, for alerts while the app is
closed, needs:

- **iOS**: in Xcode → *Signing & Capabilities* add **Push Notifications** and
  **Background Modes → Remote notifications**. Create an APNs key in the Apple
  Developer portal.
- **Android**: create a Firebase project, add the Android app
  (`com.shortlist.app`), and put `google-services.json` in `android/app/`.

## 5. In-app purchases (required for paid Pro)

Apple and Google require **IAP** for digital subscriptions sold in the app. Pro
goes through [RevenueCat](https://www.revenuecat.com) on mobile; the web keeps
Stripe.

1. Create a **Pro** auto-renewing subscription in App Store Connect and the Play Console.
2. In RevenueCat, add both apps and create an **entitlement called `pro`**.
   Attach the products and put them in the **default offering**.
3. Add the public SDK keys to Vercel and redeploy:

```
NEXT_PUBLIC_REVENUECAT_IOS_KEY=appl_xxx
NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxx
```

With these unset, the apps leave Pro unlocked (demo mode).

## 6. Store listing and screenshots

Copy for both stores is in **`store/LISTING.md`**. Screenshots at the exact sizes
the stores require are in `store/screenshots/`:

- `ios-6.9in/` — 1320 × 2868 (iPhone 6.9")
- `android-phone/` — 1080 × 2160

## 7. Submit

- **iOS**: in Xcode set the Team and version → *Product → Archive* → *Distribute
  App* → App Store Connect → TestFlight → *Submit for Review*.
- **Android**: *Build → Generate Signed App Bundle* (back up the keystore) →
  upload the `.aab` to the Play Console → internal testing → production.

### Review checklist

- **Paper trading, clearly labelled.** Apple only lets licensed firms offer real
  trading (guideline 3.2.1). Shortlist uses virtual money throughout. The
  "Paper money" label, the disclaimers and the App Review note in
  `store/LISTING.md` make that explicit. Don't remove them.
- **Account deletion** is in the account menu, as Apple requires.
- **IAP only** for Pro inside the apps. Never link to Stripe checkout there.
- **Privacy**: fill in App Privacy and Data Safety using the notes in
  `store/LISTING.md`, and link `/privacy`.
- **Minimum functionality (4.2)**: native biometrics, notifications, haptics,
  push and IAP put this well past a thin web wrapper.
