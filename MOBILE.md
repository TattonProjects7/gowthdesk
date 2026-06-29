# Shipping Shortlist to the App Store & Google Play

The iOS and Android apps are **[Capacitor](https://capacitorjs.com)** shells that
load the deployed web app, so they reuse the entire product (UI, server routes,
auth) and add native push notifications and in-app purchases. The native
projects are generated on your machine — this repo holds the config.

> You need a **Mac + Xcode** to build/submit iOS, and **Android Studio** for
> Android. An Apple Developer account ($99/yr) and Google Play account ($25 once)
> are required to publish.

---

## 1. Point the app at your deployed site

Capacitor loads `NEXT_PUBLIC_APP_URL` (must be **https**). Deploy the web app
first (see `SETUP.md`), then set it in `.env.local`:

```
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

## 2. Generate the native projects

```bash
npm install
npm run cap:add:ios       # creates ios/
npm run cap:add:android   # creates android/
npm run cap:sync          # copies config + plugins into both
```

`ios/` and `android/` are normal native projects you can commit or keep local.

## 3. App icon & splash screen

Drop a 1024×1024 `icon.png` (and optional `splash.png`) in `resources/`, then:

```bash
npm i -D @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor '#0d0f1a' --splashBackgroundColor '#0d0f1a'
```

This produces every icon/splash size for both platforms.

## 4. Run it

```bash
npm run cap:ios       # opens Xcode  → run on a simulator/device
npm run cap:android   # opens Android Studio → run on an emulator/device
```

---

## 5. Push notifications

- **iOS**: in Xcode enable the *Push Notifications* and *Background Modes →
  Remote notifications* capabilities. Create an APNs key in the Apple Developer
  portal.
- **Android**: create a Firebase project, add the Android app
  (`com.shortlist.app`), and drop `google-services.json` into `android/app/`.
- The app already requests permission and registers (`NativeBridge.tsx`).
  Incoming pushes surface in the in-app alert feed. Send pushes from your
  backend (or a service like FCM/OneSignal) using the device token.

## 6. In-app purchases (required for paid Pro)

Apple and Google require **IAP** for digital subscriptions sold in-app, so
mobile Pro goes through [RevenueCat](https://www.revenuecat.com) (the web keeps
Stripe). Already wired in `src/lib/iap.ts`.

1. Create a **Pro** auto-renewing subscription in **App Store Connect** and in
   the **Play Console**.
2. In RevenueCat: add both apps, create an **entitlement called `pro`**, attach
   the products, and put them in the **default offering**.
3. Add the RevenueCat public SDK keys to `.env.local`, redeploy, and `cap sync`:

```
NEXT_PUBLIC_REVENUECAT_IOS_KEY=appl_xxx
NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxx
```

The `/pricing` page then sells Pro via native IAP and offers *Restore
purchases*. With these unset, the apps simply leave Pro unlocked (demo).

---

## 7. Submit

**iOS** — set the bundle id (`com.shortlist.app`), team and version in Xcode →
*Product → Archive* → upload to App Store Connect → TestFlight → submit for
review.

**Android** — in Android Studio *Build → Generate Signed Bundle (.aab)* with a
keystore (keep it safe!) → upload in the Play Console → internal testing →
production.

### Review checklist (avoids common rejections)
- **Account deletion**: Apple requires in-app account deletion if you have
  accounts — add a delete option to the account menu before submitting.
- **Not financial advice**: keep the disclaimer visible (it is, in the footer
  and scanner). Position as research/education, not trade execution or signals
  to act on.
- **IAP only**: never link to external/Stripe checkout for digital goods inside
  the app — the native build already routes Pro through IAP.
- **Privacy**: complete the App Privacy / Data Safety forms (auth email,
  usage data). Provide a privacy policy URL.
- **Minimum functionality (Apple 4.2)**: the native push + IAP + interactive
  tooling put this well past a thin webview wrapper.

## Changing the app identity

Edit `appId` / `appName` in `capacitor.config.ts`, then re-run `cap sync` (or
regenerate the platforms) so both stores use your bundle id and name.
