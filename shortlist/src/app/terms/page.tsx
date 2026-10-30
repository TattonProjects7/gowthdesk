import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";

export const metadata: Metadata = { title: "Terms of Service — Shortlist" };

export default function Terms() {
  return (
    <LegalShell title="Terms of Service" updated="30 October 2026">
      <p>By using Shortlist you agree to these terms. If you do not agree, please do not use the app.</p>

      <h2>What Shortlist is</h2>
      <p>
        Shortlist is a research, education and trading app. In <strong>demo mode</strong> it runs a practice portfolio with{" "}
        <strong>virtual funds</strong> (including simulated ISA and SIPP accounts, orders, savings plans and rebalancing). In{" "}
        <strong>real mode</strong> it can send orders you confirm to your own brokerage account (currently Trading 212) using an
        API key you create. <strong>Shortlist is not a broker. It does not hold client money, keep custody of investments or
        execute trades itself.</strong> Simulated ISA/SIPP labels and allowances in demo mode are for practice only and have no
        tax effect.
      </p>

      <h2>Real mode and your broker</h2>
      <p>
        Real orders are placed in your Trading 212 account and are governed by Trading 212&apos;s own terms, fees and
        protections. You are responsible for every order you confirm, for keeping your API key secure, and for revoking it in
        Trading 212 if you think it has been exposed. Prices shown in Shortlist may be delayed or indicative; market orders
        fill at your broker&apos;s price. We are not responsible for losses caused by broker outages, rejected or delayed
        orders, or market movements. You can disconnect at any time in Settings.
      </p>

      <h2>Not investment advice — risk warning</h2>
      <p>
        Nothing in the app is investment, financial, legal or tax advice, or a recommendation to buy, sell or hold any
        security. Scores, theses and structures are informational only and may be wrong. Short selling carries
        <strong> uncapped risk</strong> unless a hard stop or defined-risk instrument is used, and you can lose more than
        your initial outlay. You are solely responsible for your own decisions. Past or simulated performance does not
        predict future results.
      </p>

      <h2>Accounts</h2>
      <p>
        You are responsible for your account credentials and activity. Provide accurate information and keep your login
        secure. You must be at least 18.
      </p>

      <h2>Adverts</h2>
      <p>
        The free version of Shortlist is supported by adverts from third parties. Adverts are not recommendations or
        endorsements by Shortlist, and we don&apos;t check the products they promote. Be especially careful with adverts for
        investments: check that any firm is authorised on the FCA register before you deal with it.
      </p>

      <h2>Subscriptions & billing</h2>
      <ul>
        <li>We offer two paid subscriptions: <strong>Ad-free</strong> (£6.99 a month), which removes adverts, and <strong>Pro</strong>,
          which adds the Pro tools and also removes adverts. On the web, payments are processed by Stripe; in the mobile
          apps, by the Apple App Store or Google Play via in-app purchase.</li>
        <li>A subscription belongs to your Shortlist account and applies on the web and in the apps wherever you are signed
          in. A subscription bought in an app while signed out applies only on that device until you sign in.</li>
        <li>Subscriptions renew automatically until cancelled. Manage or cancel via the billing portal (web) or your
          App Store / Google Play account (mobile).</li>
        <li>Refunds follow the policy of the relevant payment platform.</li>
      </ul>

      <h2>Acceptable use</h2>
      <p>Do not misuse the service — no reverse engineering, scraping at scale, reselling, or unlawful use.</p>

      <h2>Disclaimers & limitation of liability</h2>
      <p>
        The service is provided “as is” without warranties of any kind. To the fullest extent permitted by law, we are
        not liable for any trading losses or for indirect or consequential damages arising from your use of the app.
      </p>

      <h2>Termination</h2>
      <p>You may stop using the app and delete your account at any time. We may suspend access for breach of these terms.</p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of England and Wales.</p>

      <h2>Changes</h2>
      <p>We may update these terms; continued use after changes means you accept them.</p>

      <h2>Contact</h2>
      <p><a href="mailto:info@tattonprojects.co.uk">info@tattonprojects.co.uk</a></p>
    </LegalShell>
  );
}
