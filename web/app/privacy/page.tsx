import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import {
  SITE_OPERATOR,
  CONTACT_EMAIL,
  POSTAL_ADDRESS,
  SITE_NAME,
  LEGAL_LAST_UPDATED,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: `Privacy Policy | ${SITE_NAME}`,
  description:
    "What data Phon.Audio collects, why, how long it is kept, and the rights you have over it under the GDPR.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      kicker="Legal"
      title="Privacy Policy"
      lede="What we collect, why, and what you can ask us to do about it."
      updated={LEGAL_LAST_UPDATED}
    >
      <p>
        This policy explains what personal data {SITE_NAME} collects, why it is collected, how long
        it is kept, and the rights you have over it under the EU General Data Protection Regulation
        (GDPR).
      </p>

      <h2>Who is responsible</h2>
      <p>
        {SITE_NAME} is operated by {SITE_OPERATOR} as an individual, who is the data controller for
        the purposes of the GDPR.
      </p>
      <p>
        Contact: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        {POSTAL_ADDRESS ? <> · {POSTAL_ADDRESS}</> : null}
      </p>

      <h2>What we collect</h2>
      <p>
        We deliberately collect as little as possible. There is no advertising network, no tracking
        pixel, and no analytics product on this site.
      </p>

      <h3>If you do not sign in</h3>
      <p>
        Nothing that identifies you personally. You can browse the component catalogue, use the
        chain builder and read the reference pages without an account. Your browser stores your
        favourites locally on your own device; that data never reaches us.
      </p>

      <h3>If you create an account</h3>
      <ul>
        <li>
          <strong>Your email address</strong> — needed to sign you in, because authentication works
          by emailing you a one-time link or code. There is no password to store.
        </li>
        <li>
          <strong>Your saved chains</strong> — the component combinations and listening settings you
          choose to save, so they are available when you return.
        </li>
        <li>
          <strong>Your favourites</strong> — once signed in, favourites are stored against your
          account so they follow you between devices.
        </li>
        <li>
          <strong>Components you submit</strong> — if you add a component to the catalogue, the
          submission is recorded against your account so it can be reviewed and attributed.
        </li>
      </ul>

      <h3>Server logs</h3>
      <p>
        Our hosting provider records standard technical request data, including IP address, for
        security and reliability purposes. We do not use these logs to build profiles of visitors.
      </p>

      <h2>Why we are allowed to process it</h2>
      <ul>
        <li>
          <strong>Performance of a contract</strong> — your email address and saved data are
          processed to provide the account features you asked for.
        </li>
        <li>
          <strong>Legitimate interests</strong> — keeping the service secure, available and free
          from abuse.
        </li>
      </ul>

      <h2>Cookies</h2>
      <p>
        {SITE_NAME} sets cookies only where they are strictly necessary to deliver a function you
        have requested. In practice this means session cookies that keep you signed in after you
        authenticate. There are no advertising, profiling or analytics cookies, which is why you are
        not shown a consent banner — under the ePrivacy rules, strictly necessary cookies do not
        require consent.
      </p>
      <p>
        Your browser also stores favourites locally when you are signed out. That is local storage
        on your own device rather than a cookie, and it is never transmitted to us.
      </p>

      <h2>Who else sees your data</h2>
      <p>
        We do not sell personal data or share it for marketing. Data is processed on our behalf by:
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> — database and authentication.
        </li>
        <li>
          <strong>Vercel</strong> — application hosting and delivery.
        </li>
        <li>
          <strong>Brevo</strong> — delivery of authentication emails.
        </li>
      </ul>
      <p>
        Where a provider processes data outside the European Economic Area, that transfer relies on
        the safeguards offered by the provider, such as the European Commission&rsquo;s standard
        contractual clauses.
      </p>
      <p>
        If you follow an affiliate link from this site to a retailer, that retailer&rsquo;s own
        privacy policy governs what happens next. See our{" "}
        <Link href="/disclosure">affiliate disclosure</Link>.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Account data is kept for as long as your account exists. Delete your account and the
        associated email address, saved chains and favourites are removed. Components you have
        contributed to the public catalogue may remain, since other people&rsquo;s saved chains may
        depend on them, but they are no longer linked to you.
      </p>

      <h2>Your rights</h2>
      <p>Under the GDPR you may ask us to:</p>
      <ul>
        <li>confirm what personal data we hold about you, and give you a copy;</li>
        <li>correct data that is wrong or incomplete;</li>
        <li>delete your data;</li>
        <li>restrict or object to how we process it;</li>
        <li>provide your data in a portable, machine-readable form.</li>
      </ul>
      <p>
        Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we will respond within one
        month. If you believe we have handled your data improperly, you are entitled to complain to
        the data protection supervisory authority in the EU country where you live or work.
      </p>

      <h2>Children</h2>
      <p>
        This service is not directed at children and we do not knowingly collect data from anyone
        under 16.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes materially we will update the date at the top of this page. Continued
        use of the site after a change means you accept the revised policy.
      </p>
    </LegalPage>
  );
}
