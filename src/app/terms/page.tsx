import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";

export const metadata: Metadata = { title: "Terms of Service — Shortlist" };

export default function Terms() {
  return (
    <LegalShell title="Terms of Service" updated="20 July 2026">
      <p>By using Shortlist you agree to these terms. If you do not agree, please do not use the app.</p>

      <h2>What Shortlist is</h2>
      <p>
        Shortlist is a research and education tool for short-selling ideas. It scans markets, scores setups, and helps
        you track hypothetical trades. <strong>It does not execute trades and is not a broker.</strong>
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

      <h2>Subscriptions & billing</h2>
      <ul>
        <li>Pro is a paid subscription. On the web, payments are processed by Stripe; in the mobile apps, by the Apple
          App Store or Google Play via in-app purchase.</li>
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
