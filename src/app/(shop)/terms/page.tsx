// src/app/(shop)/terms/page.tsx
import type { Metadata } from "next";
import LegalShell from "@/components/legal/LegalShell";
import { BRAND } from "@/lib/brand";
import { CURRENT_STOREFRONT } from "@/lib/market/current";
import { getPolicyContext } from "@/lib/legal/policy-context";
import { POLICY_LINKS } from "@/lib/legal/policy-links";

const POLICY = getPolicyContext();

export const metadata: Metadata = {
  title: `Terms & Conditions | ${BRAND.displayName}`,
  description: `Read the terms that govern the use of ${BRAND.displayName} in ${CURRENT_STOREFRONT.legalRegionLabel}.`,
};

export default function TermsPage() {
  const {
    isAu,
    isNz,
    isUs,
    isCa,
    legalRegionLabel,
    checkoutRegionLabel,
    supportRegionLabel,
    supportEmail,
    siteUrl,
  } = POLICY;

  return (
    <LegalShell
      title="Terms & Conditions"
      updatedAt="2026-03-30"
      intro={
        <>
          <p>
            These Terms &amp; Conditions govern your access to and use of{" "}
            <strong>{BRAND.displayName}</strong>, including browsing the site,
            placing orders, requesting returns, and using related services.
          </p>
          <p>
            This storefront currently offers sales and shipping only within{" "}
            <strong>{checkoutRegionLabel}</strong>.
          </p>
          <p>
            By using this website, you agree to these Terms &amp; Conditions to
            the extent permitted by applicable law in{" "}
            <strong>{legalRegionLabel}</strong>.
          </p>
        </>
      }
    >
      <section>
        <h2 className="text-base font-semibold text-foreground">
          1. About this storefront
        </h2>
        <p>
          This website is operated under the <strong>{BRAND.displayName}</strong>{" "}
          brand for customers in <strong>{legalRegionLabel}</strong>.
        </p>
        <p>
          The website address for this storefront is{" "}
          <a href={siteUrl} className="font-semibold underline">
            {siteUrl}
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          2. Eligibility and acceptable use
        </h2>
        <p>
          You must use this website only for lawful purposes and in a way that
          does not infringe the rights of others, interfere with the operation
          of the site, or attempt to misuse the storefront, checkout flow, user
          accounts, pricing, inventory, returns process, or related systems.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          3. Product information and availability
        </h2>
        <p>
          We aim to present product descriptions, prices, images, sizing
          information, and availability as accurately as reasonably possible.
        </p>
        <p>
          However, product presentation may vary by device, and stock
          availability, pricing, product details, shipping availability, and
          related content may change without notice.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          4. Orders and acceptance
        </h2>
        <p>
          When you place an order, you are making an offer to purchase goods
          from this storefront. We may accept, reject, cancel, or limit orders
          where reasonably necessary, including in cases involving payment
          issues, suspected fraud, pricing errors, stock problems, operational
          constraints, or other legitimate business reasons.
        </p>
        <p>
          An order confirmation email does not necessarily mean final acceptance
          if later review identifies an issue that requires cancellation or
          correction in accordance with applicable law.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          5. Pricing, currency, taxes, and delivery scope
        </h2>
        <p>
          Prices shown on this storefront are presented in the currency
          configured for this storefront.
        </p>
        <p>
          Delivery is currently limited to addresses within{" "}
          <strong>{checkoutRegionLabel}</strong>.
        </p>
        <p>
          Taxes, duties, shipping charges, and checkout disclosures may vary
          depending on the delivery destination and the configuration of this
          storefront.
        </p>
      </section>

      {isAu ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            6. Australia consumer context
          </h2>
          <p>
            Nothing in these Terms &amp; Conditions is intended to exclude,
            restrict, or modify any consumer rights or remedies that cannot be
            excluded under applicable consumer law in Australia.
          </p>
          <p>
            Any rights you may have under applicable law will continue to apply
            in addition to these Terms &amp; Conditions.
          </p>
        </section>
      ) : isNz ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            6. New Zealand consumer context
          </h2>
          <p>
            Nothing in these Terms &amp; Conditions is intended to exclude,
            restrict, or modify any consumer rights or remedies that cannot be
            excluded under applicable consumer law in New Zealand.
          </p>
          <p>
            Any rights you may have under applicable law will continue to apply
            in addition to these Terms &amp; Conditions.
          </p>
        </section>
      ) : isUs ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            6. United States storefront context
          </h2>
          <p>
            Consumer protection, returns, disclosures, and payment-related
            practices may vary depending on the jurisdiction served by this
            storefront.
          </p>
          <p>
            Additional storefront notices may appear on product pages, at
            checkout, or in supporting policy documents where needed.
          </p>
        </section>
      ) : isCa ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            6. Canada storefront context
          </h2>
          <p>
            Consumer protection, returns, disclosures, and payment-related
            practices may vary depending on the jurisdiction served by this
            storefront.
          </p>
          <p>
            Additional storefront notices may appear on product pages, at
            checkout, or in supporting policy documents where needed.
          </p>
        </section>
      ) : (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            6. Storefront-specific legal context
          </h2>
          <p>
            Legal requirements, disclosures, and customer rights may differ
            depending on the country or region served by this storefront.
          </p>
          <p>
            Where additional local wording is needed, it may be shown elsewhere
            on the site, at checkout, or in linked policies.
          </p>
        </section>
      )}

      <section>
        <h2 className="text-base font-semibold text-foreground">
          7. Returns, refunds, and cancellations
        </h2>
        <p>
          Returns, refunds, and any applicable cancellation rights are governed
          by our{" "}
          <a
            href={POLICY_LINKS.returnsPolicy}
            className="font-semibold underline"
          >
            Returns Policy
          </a>
          , together with any non-excludable consumer guarantees or statutory
          rights that apply in the jurisdiction served by this storefront.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          8. Intellectual property
        </h2>
        <p>
          Unless otherwise stated, content on this site, including text,
          product descriptions, graphics, logos, images, and site design
          elements, is owned by or licensed to the operator of this storefront
          and may not be copied, reproduced, distributed, or exploited without
          permission, except as allowed by law.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          9. Website operation and availability
        </h2>
        <p>
          We may update, suspend, withdraw, or modify parts of the storefront,
          features, inventory presentation, account functions, and support
          processes from time to time.
        </p>
        <p>
          We do not guarantee uninterrupted or error-free access to the site.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          10. Liability and legal rights
        </h2>
        <p>
          To the maximum extent permitted by law, and subject always to any
          rights that cannot be excluded, we are not liable for indirect or
          consequential loss arising from your use of the site or purchase of
          goods through the storefront.
        </p>
        <p>
          Nothing in these Terms &amp; Conditions excludes liability where such
          exclusion would be unlawful.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          11. Contact and support
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

      <section>
        <h2 className="text-base font-semibold text-foreground">
          12. Related policies
        </h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <a href={POLICY_LINKS.privacy} className="font-semibold underline">
              Privacy Policy
            </a>
          </li>
          <li>
            <a href={POLICY_LINKS.cookies} className="font-semibold underline">
              Cookie Policy
            </a>
          </li>
          <li>
            <a
              href={POLICY_LINKS.returnsPolicy}
              className="font-semibold underline"
            >
              Returns Policy
            </a>
          </li>
        </ul>
      </section>
    </LegalShell>
  );
}