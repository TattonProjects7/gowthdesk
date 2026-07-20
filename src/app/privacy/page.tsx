import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";

export const metadata: Metadata = { title: "Privacy Policy — Shortlist" };

export default function Privacy() {
  return (
    <LegalShell title="Privacy Policy" updated="20 July 2026">
      <p>
        Shortlist (“we”, “us”) is a stock-shorting research and education tool. This policy explains what personal data
        we collect, why, and your choices. We do not sell your personal data.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li><strong>Account data</strong> — your email address and authentication details, if you create an account.</li>
        <li><strong>Your content</strong> — the shorts you choose to track and related settings, stored against your account.</li>
        <li><strong>Purchase data</strong> — subscription status. Card details are handled by our payment providers, not by us.</li>
        <li><strong>Device data</strong> — on mobile, a push-notification token if you enable notifications, and basic diagnostics.</li>
        <li><strong>Local storage</strong> — if you use the app without an account, your tracked shorts and alerts stay in your browser only.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To provide the service — scanning, tracking, alerts and your account.</li>
        <li>To process subscriptions and unlock Pro features.</li>
        <li>To send notifications you have opted into.</li>
        <li>To maintain security and improve the product.</li>
      </ul>

      <h2>Service providers</h2>
      <p>We share data only with providers that help us run the app:</p>
      <ul>
        <li><a href="https://supabase.com/privacy">Supabase</a> — authentication and database hosting.</li>
        <li><a href="https://stripe.com/privacy">Stripe</a> — web payments.</li>
        <li><a href="https://www.revenuecat.com/privacy">RevenueCat</a> and the Apple App Store / Google Play — mobile in-app purchases.</li>
        <li>Market-data providers (e.g. Finnhub, Alpha Vantage) — to display prices. Requests are for ticker data, not about you.</li>
        <li><a href="https://openai.com/policies/privacy-policy">OpenAI</a> — to generate the optional AI thesis; only the trade setup, never your identity, is sent.</li>
      </ul>

      <h2>Data retention & deletion</h2>
      <p>
        We keep account data while your account is active. You can <strong>delete your account</strong> at any time from
        the in-app account menu, which permanently removes your profile, tracked shorts and alerts. You can also email us
        to request deletion.
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on where you live (including the UK/EU under UK GDPR/GDPR), you may have rights to access, correct,
        export or delete your data, and to object to certain processing. Contact us to exercise them.
      </p>

      <h2>Children</h2>
      <p>Shortlist is not intended for anyone under 18, and we do not knowingly collect data from children.</p>

      <h2>Not financial advice</h2>
      <p>
        Shortlist provides research and educational tooling only. It is not investment advice and we do not execute
        trades. See our <a href="/terms">Terms</a>.
      </p>

      <h2>Changes</h2>
      <p>We may update this policy; we will change the “last updated” date above when we do.</p>

      <h2>Contact</h2>
      <p>Questions or requests: <a href="mailto:info@tattonprojects.co.uk">info@tattonprojects.co.uk</a>.</p>
    </LegalShell>
  );
}
