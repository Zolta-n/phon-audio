import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { SITE_OPERATOR, CONTACT_EMAIL, SITE_NAME, LEGAL_LAST_UPDATED } from "@/lib/legal";

export const metadata: Metadata = {
  title: `Terms of Use | ${SITE_NAME}`,
  description:
    "The terms governing use of Phon.Audio: what the compatibility engine is and is not, accounts, contributions, and limits of liability.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      kicker="Legal"
      title="Terms of Use"
      lede="The rules of the road — and an honest account of what this tool can and cannot tell you."
      updated={LEGAL_LAST_UPDATED}
    >
      <p>
        These terms govern your use of {SITE_NAME}, operated by {SITE_OPERATOR}. By using the site
        you accept them. If you do not, please do not use the service.
      </p>

      <h2>What the service does</h2>
      <p>
        {SITE_NAME} models the electrical relationships between audio components — impedance
        bridging, gain staging, power headroom, damping factor and related parameters — and reports
        where a proposed signal chain looks sound and where it looks problematic. It draws on a
        catalogue of published manufacturer specifications and third-party measurements.
      </p>

      <h2>What it is not</h2>
      <div className="pa-notice">
        <strong>The output is informational, not a guarantee.</strong> Verdicts are calculated from
        specification data that may be incomplete, out of date, or simply wrong. A &ldquo;pass&rdquo;
        is not a promise that two components will work well together, and a warning is not proof
        that they will not. Nothing here is professional advice, and it is no substitute for
        listening to equipment yourself or consulting the manufacturer.
      </div>
      <p>
        Audio equipment can be damaged by incorrect matching, and loud playback can damage hearing.
        You remain responsible for decisions you make about your own equipment. Purchasing decisions
        in particular are yours alone.
      </p>

      <h2>Catalogue accuracy</h2>
      <p>
        Catalogue entries are assembled from manufacturer documentation, published measurements and
        user contributions, partly with automated tooling. Entries are marked as reviewed only once
        a human has checked them; most have not been. Where a specification is unknown, the engine
        says so and skips the affected check rather than guessing. Treat every figure as something
        to verify against the manufacturer before you spend money.
      </p>

      <h2>Accounts</h2>
      <p>
        Some features require an account. You are responsible for activity under your account and
        for keeping access to your email address secure, since sign-in works by emailed link or
        code. Provide an address you actually control. We may suspend or remove accounts that abuse
        the service.
      </p>

      <h2>Paid features</h2>
      <p>
        Certain features — currently the ability to add and re-collect catalogue components, which
        consume paid third-party services on our side — are limited to paid accounts. Where a
        feature is paid, that will be evident before you use it. Terms specific to billing, renewal
        and refunds will be published here alongside the payment process when it launches.
      </p>

      <h2>Contributions</h2>
      <p>
        If you submit a component to the catalogue, you confirm that you are entitled to share the
        information and that it is accurate to the best of your knowledge. Submissions are reviewed
        before they become publicly visible, and we may edit, decline or remove any submission.
      </p>
      <p>
        By submitting, you grant us a non-exclusive, worldwide, royalty-free licence to store,
        display, adapt and distribute that contribution as part of the catalogue. Factual
        specifications are not owned by anyone; this licence covers the form of your contribution,
        not the underlying facts.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Do not attempt to gain unauthorised access to the service or other users&rsquo; data.</li>
        <li>
          Do not scrape, bulk-download or resell the catalogue, or use automated means to place
          disproportionate load on the service.
        </li>
        <li>Do not submit false, misleading or infringing information.</li>
        <li>Do not use the service unlawfully or to harm others.</li>
      </ul>

      <h2>Affiliate links</h2>
      <p>
        Some links to retailers are affiliate links, and we may earn a commission from qualifying
        purchases made through them. This never changes the price you pay, and it does not influence
        the engine&rsquo;s verdicts, which are calculated from specifications alone. See the{" "}
        <Link href="/disclosure">affiliate disclosure</Link> for detail.
      </p>

      <h2>Availability</h2>
      <p>
        The service is provided as-is and as-available. We may change, suspend or discontinue any
        part of it, and we do not promise uninterrupted or error-free operation.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, we are not liable for any indirect or consequential
        loss, nor for loss of profit, data, or damage to equipment, arising from your use of the
        service or from reliance on its output. Nothing in these terms excludes liability that
        cannot lawfully be excluded — including liability for death or personal injury caused by
        negligence, or for fraud. If you are a consumer, your statutory rights are unaffected.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the law of the country in which the operator is established,
        without prejudice to the mandatory consumer-protection rights available to you under the law
        of your own country of residence within the European Union.
      </p>

      <h2>Changes</h2>
      <p>
        We may revise these terms; the date at the top of this page shows the last revision.
        Continued use after a change means you accept the revised terms.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
