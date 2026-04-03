// src/app/(shop)/terms/page.tsx
import type { Metadata } from "next";
import LegalShell from "@/components/legal/LegalShell";
import { BRAND } from "@/lib/brand";
import { CURRENT_MARKET } from "@/lib/market/current";
import { getPolicyContext } from "@/lib/legal/policy-context";
import { POLICY_LINKS } from "@/lib/legal/policy-links";

const POLICY = getPolicyContext();

export const metadata: Metadata = {
  title: `Terms & Conditions | ${BRAND.displayName}`,
  description: `Read the website, ordering, payment, shipping, and returns terms for ${BRAND.displayName} in ${CURRENT_MARKET.legalRegionLabel}.`,
};

export default function TermsPage() {
  const {
    isAuNz,
    legalRegionLabel,
    checkoutRegionLabel,
    supportRegionLabel,
    supportEmail,
  } = POLICY;

  return (
    <LegalShell
      title="Terms & Conditions"
      updatedAt="2026-03-30"
      intro={
        <>
          <p>
            These Terms &amp; Conditions govern your use of the{" "}
            <strong>{BRAND.displayName}</strong> website and any orders placed
            through this storefront.
          </p>
          <p>
            We currently offer sales and shipping only within{" "}
            <strong>{checkoutRegionLabel}</strong>.
          </p>
          <p>
            By accessing this website or placing an order, you agree to these
            Terms &amp; Conditions together with our{" "}
            <a href={POLICY_LINKS.privacy} className="font-semibold underline">
              Privacy Policy
            </a>
            ,{" "}
            <a
              href={POLICY_LINKS.cookies}
              className="font-semibold underline"
            >
              Cookie Policy
            </a>
            , and{" "}
            <a
              href={POLICY_LINKS.returnsPolicy}
              className="font-semibold underline"
            >
              Returns Policy
            </a>
            .
          </p>
        </>
      }
    >
      <section>
        <h2 className="text-base font-semibold text-foreground">
          1. Eligibility and use of the site
        </h2>
        <p>
          You must use this website only for lawful purposes and in a manner
          that does not infringe the rights of others, damage the site, or
          interfere with its normal operation.
        </p>
        <p>
          You must not misuse the website, attempt unauthorised access, upload
          malicious material, or use automated means in a way that disrupts our
          systems or services.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          2. Product information and availability
        </h2>
        <p>
          We aim to present products, descriptions, images, sizes, pricing, and
          availability as accurately as reasonably possible. However, colours,
          materials, sizing, and display appearance may vary depending on the
          device or screen used.
        </p>
        <p>
          Product availability, stock levels, product assortment, pricing, and
          shipping options may change at any time without prior notice.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          3. Orders and acceptance
        </h2>
        <p>
          Placing an order does not necessarily mean the order has been finally
          accepted. We may need to review payment status, stock availability,
          shipping eligibility, pricing issues, fraud or risk checks, or other
          operational matters before the order is confirmed.
        </p>
        <p>
          If we are unable to accept an order, we may cancel it and provide an
          appropriate refund where payment has already been captured.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          4. Shipping regions and address restrictions
        </h2>
        <p>
          This storefront currently accepts delivery addresses only within{" "}
          <strong>{checkoutRegionLabel}</strong>.
        </p>
        <p>
          We may reject, cancel, or refuse to fulfil orders that include
          ineligible shipping destinations, incomplete address information,
          operational fulfilment issues, or other circumstances that prevent us
          from completing delivery.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          5. Pricing, taxes, and currency
        </h2>
        <p>
          Prices shown on the storefront are presented in the currency selected
          for the active market configuration. Taxes, duties, and similar
          charges may depend on the destination country, market rules, and how
          the storefront is configured at the time of purchase.
        </p>
        <p>
          Shipping fees, if applicable, are shown during checkout before you
          complete payment.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          6. Payment methods
        </h2>
        <p>
          Available payment methods may vary depending on the active market,
          country, device, payment provider configuration, fraud controls, and
          operational availability at the time of checkout.
        </p>
        <p>
          We may suspend, remove, or limit payment methods at any time where
          reasonably necessary for security, compliance, provider availability,
          or operational reasons.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          7. Cancellations, returns, and refunds
        </h2>
        <p>
          Pre-dispatch cancellations, faulty-item returns, refund processing,
          and change-of-mind rules are governed by our{" "}
          <a
            href={POLICY_LINKS.returnsPolicy}
            className="font-semibold underline"
          >
            Returns Policy
          </a>
          .
        </p>
        <p>
          Nothing in these Terms &amp; Conditions is intended to exclude any
          non-excludable rights you may have under applicable consumer law in{" "}
          <strong>{legalRegionLabel}</strong>.
        </p>
      </section>

      {isAuNz ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            8. Australia and New Zealand consumer law context
          </h2>
          <p>
            If you are purchasing from Australia or New Zealand, mandatory
            consumer rights may apply under the laws of your jurisdiction,
            including rights relating to faulty goods, remedies, and guarantees
            that cannot be excluded by contract.
          </p>
          <p>
            To the extent any part of these Terms &amp; Conditions conflicts
            with non-excludable consumer rights, those rights will prevail.
          </p>
        </section>
      ) : (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            8. Market-specific legal notes
          </h2>
          <p>
            Some legal wording, taxes, payment availability, or fulfilment rules
            may differ depending on the country within the active market.
          </p>
          <p>
            Where country-level differences apply, we may provide supplementary
            notices during checkout, in emails, or in country-specific policy
            wording.
          </p>
        </section>
      )}

      <section>
        <h2 className="text-base font-semibold text-foreground">
          9. Intellectual property
        </h2>
        <p>
          Website content, branding, product imagery, text, layout, graphics,
          and other materials on this storefront are owned by us, licensed to
          us, or otherwise protected by applicable intellectual property laws.
        </p>
        <p>
          You must not copy, reproduce, distribute, republish, scrape, or use
          such content for commercial purposes without prior written permission,
          except to the extent permitted by law.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          10. Website availability and liability
        </h2>
        <p>
          We aim to keep the website available and functioning properly, but we
          do not guarantee uninterrupted access, continuous availability, or the
          absence of errors, delays, or third-party service failures.
        </p>
        <p>
          To the extent permitted by law, we are not liable for indirect,
          incidental, special, or consequential loss arising from the use of the
          website or delays outside our reasonable control. Nothing in these
          Terms &amp; Conditions excludes liability that cannot lawfully be
          excluded.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          11. Changes to the site or terms
        </h2>
        <p>
          We may update this website, its features, the active market
          configuration, shipping eligibility, or these Terms &amp; Conditions
          from time to time.
        </p>
        <p>
          The version displayed on this page applies from the date shown at the
          top of the document, unless otherwise stated.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          12. Contact
        </h2>
        <p>
          Support for this storefront is currently managed for{" "}
          <strong>{supportRegionLabel}</strong>.
        </p>
        <p className="mt-2">
          <strong>Email:</strong>{" "}
          <a
            href={`mailto:${supportEmail}`}
            className="font-semibold underline"
          >
            {supportEmail}
          </a>
        </p>
      </section>
    </LegalShell>
  );
}