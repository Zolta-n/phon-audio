import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import {
  SITE_NAME,
  CONTACT_EMAIL,
  LEGAL_LAST_UPDATED,
  AMAZON_DISCLOSURE,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: `Affiliate Disclosure | ${SITE_NAME}`,
  description:
    "How Phon.Audio makes money, which links earn commission, and why affiliate relationships do not influence the compatibility engine's verdicts.",
  alternates: { canonical: "/disclosure" },
};

export default function DisclosurePage() {
  return (
    <LegalPage
      kicker="Legal"
      title="Affiliate Disclosure"
      lede="How this site makes money, and why that does not change what the engine tells you."
      updated={LEGAL_LAST_UPDATED}
    >
      <div className="pa-notice">
        <strong>{AMAZON_DISCLOSURE}</strong>
      </div>

      <p>
        {SITE_NAME} takes part in affiliate programmes. When you follow certain links from this site
        to a retailer and go on to buy something, we may receive a commission on that purchase.
      </p>

      <h2>What this costs you</h2>
      <p>
        Nothing. Affiliate commission is paid by the retailer out of its own margin. You pay exactly
        the same price you would have paid arriving at the retailer directly, and no discount is
        lost by using our link.
      </p>

      <h2>Which links are affiliate links</h2>
      <p>
        Affiliate links appear as the <strong>Buy</strong> button on component pages. Links within
        explanatory text — to manufacturer documentation, measurement databases or reference
        material — are ordinary links and earn us nothing.
      </p>

      <h2>Why it does not skew the results</h2>
      <p>
        This matters more here than on a review site, so it is worth being precise about it. The
        compatibility engine is deterministic: it takes published specifications as input and
        applies fixed electrical rules to them. It has no knowledge of which components carry an
        affiliate link, and commission is not an input to any calculation, ranking or recommendation
        it produces.
      </p>
      <p>
        A component with no affiliate link is treated exactly like one that has a lucrative one. If
        the engine warns you against a pairing, that verdict is unchanged by whether we would have
        earned anything from it. You can check this claim yourself — every check the engine runs is
        documented in the <Link href="/learn">reference section</Link>.
      </p>

      <h2>Editorial independence</h2>
      <p>
        We are not paid to include, exclude, rank or favour any manufacturer or product. No
        manufacturer has editorial input into the catalogue or the engine. Where a specification is
        unknown, we say so rather than filling the gap with a flattering guess.
      </p>

      <h2>Questions</h2>
      <p>
        If anything here is unclear, or you think a link is not properly disclosed, tell us:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. See also our{" "}
        <Link href="/terms">terms of use</Link> and <Link href="/privacy">privacy policy</Link>.
      </p>
    </LegalPage>
  );
}
