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
  description: `Read the terms that govern the use of ${BRAND.displayName} for customers using the ${CURRENT_STOREFRONT.legalRegionLabel} storefront.`,
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
      updatedAt="2026-04-17"
      intro={
        <>
          <p>
            These Terms &amp; Conditions govern your access to and use of{" "}
            <strong>{BRAND.displayName}</strong>, including browsing this
            website, creating an account, placing orders, requesting returns,
            and using related services.
          </p>
          <p>
            This storefront currently offers sales and delivery only within{" "}
            <strong>{checkoutRegionLabel}</strong>. Orders placed through this
            storefront are intended only for delivery addresses located in that
            region.
          </p>
          <p>
            By using this website or placing an order, you agree to these Terms
            &amp; Conditions, subject always to any rights that cannot lawfully
            be excluded in <strong>{legalRegionLabel}</strong>.
          </p>
        </>
      }
    >
      <section>
        <h2 className="text-base font-semibold text-foreground">
          1. About this storefront
        </h2>
        <p>
          This website is operated by <strong>Wenxuan Chen</strong>, trading as{" "}
          <strong>{BRAND.displayName}</strong>, for customers using the{" "}
          <strong>{legalRegionLabel}</strong> storefront.
        </p>
        <p>
          The website address for this storefront is{" "}
          <a href={siteUrl} className="font-semibold underline">
            {siteUrl}
          </a>
          .
        </p>
        <p>
          Business enquiries and customer support for this storefront may be
          directed to{" "}
          <a
            href="mailto:support@jevi.com"
            className="font-semibold underline"
          >
            support@jevi.com
          </a>
          .
        </p>
        <p>
          References in these Terms &amp; Conditions to “we”, “us”, and “our”
          refer to Wenxuan Chen trading as <strong>{BRAND.displayName}</strong>.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          2. Eligibility and acceptable use
        </h2>
        <p>
          You must use this website only for lawful purposes. You must not
          misuse the site, attempt to interfere with its operation, access data
          without authorisation, use automated means to extract content without
          permission, or engage in fraudulent, abusive, or misleading conduct in
          connection with orders, payments, returns, reviews, promotions, or
          accounts.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          3. Product information and availability
        </h2>
        <p>
          We aim to ensure that product descriptions, images, sizing guidance,
          prices, and availability information are presented as accurately as
          reasonably possible.
        </p>
        <p>
          However, colours and appearance may vary depending on your device, and
          inventory, pricing, promotions, shipping availability, and product
          details may change from time to time without notice.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          4. Orders, payment, and acceptance
        </h2>
        <p>
          When you place an order, you are making an offer to purchase goods
          from this storefront. We may accept, reject, cancel, or limit an order
          where reasonably necessary, including in cases involving suspected
          fraud, payment issues, pricing errors, stock unavailability, shipping
          restrictions, or other legitimate operational reasons.
        </p>
        <p>
          An acknowledgement or confirmation email does not necessarily mean that
          your order has been finally accepted if later review identifies an
          issue that requires cancellation, correction, or refund in accordance
          with applicable law.
        </p>
        <p>
          If we cannot fulfil your order after payment has been authorised or
          captured, we may cancel the affected order and arrange an appropriate
          refund or other remedy as required.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          5. Pricing, currency, taxes, and delivery scope
        </h2>
        <p>
          Prices displayed on this storefront are shown in the currency
          configured for this storefront.
        </p>
        <p>
          Delivery is currently limited to addresses within{" "}
          <strong>{checkoutRegionLabel}</strong>. We may refuse or cancel an
          order that uses a delivery address outside the supported delivery
          region for this storefront.
        </p>
        <p>
          Unless otherwise stated, product prices may exclude or include taxes,
          shipping charges, duties, or other checkout amounts depending on the
          configuration of the storefront and the applicable delivery location.
          Final payable amounts are shown during checkout before you submit your
          order.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          6. Shipping, delivery, and customer information
        </h2>
        <p>
          Delivery timeframes shown on this website are estimates only unless we
          expressly state otherwise. Delays may occur due to carrier issues,
          peak periods, address verification issues, customs or border processes
          where relevant, weather events, or other causes outside our reasonable
          control.
        </p>
        <p>
          You are responsible for providing accurate and complete order,
          shipping, and contact information. We are not responsible for delay,
          failed delivery, or additional cost resulting from incorrect or
          incomplete information supplied by you.
        </p>
      </section>

      {isAu ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            7. Australia consumer context
          </h2>
          <p>
            For customers using this Australia storefront, our goods and
            services may come with consumer guarantees that cannot be excluded
            under the Australian Consumer Law.
          </p>
          <p>
            Nothing in these Terms &amp; Conditions is intended to exclude,
            restrict, or modify any rights or remedies you may have under the
            Australian Consumer Law or any other law where those rights cannot
            lawfully be excluded.
          </p>
        </section>
      ) : isNz ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            7. New Zealand consumer context
          </h2>
          <p>
            For customers using this New Zealand storefront, nothing in these
            Terms &amp; Conditions is intended to exclude, restrict, or modify
            any rights or remedies you may have under the Consumer Guarantees
            Act 1993, the Fair Trading Act 1986, or any other applicable New
            Zealand law where those rights cannot lawfully be excluded.
          </p>
        </section>
      ) : isUs ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            7. United States storefront context
          </h2>
          <p>
            Consumer disclosures, returns handling, and payment practices may
            vary depending on the jurisdiction served by this storefront.
            Additional notices may appear on product pages, at checkout, or in
            related policy documents where needed.
          </p>
        </section>
      ) : isCa ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            7. Canada storefront context
          </h2>
          <p>
            Consumer disclosures, returns handling, and payment practices may
            vary depending on the province or territory served by this
            storefront. Additional notices may appear on product pages, at
            checkout, or in related policy documents where needed.
          </p>
        </section>
      ) : (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            7. Storefront-specific legal context
          </h2>
          <p>
            Legal requirements, disclosures, and customer rights may differ
            depending on the country or region served by this storefront.
          </p>
        </section>
      )}

      <section>
        <h2 className="text-base font-semibold text-foreground">
          8. Returns, refunds, and cancellations
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
          , together with any non-excludable statutory rights or consumer
          guarantees that apply to your purchase.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          9. Intellectual property
        </h2>
        <p>
          Unless otherwise stated, all content on this site, including text,
          graphics, product descriptions, logos, photographs, videos, layout,
          and design elements, is owned by or licensed to the operator of this
          storefront.
        </p>
        <p>
          You must not copy, reproduce, republish, distribute, modify, exploit,
          or otherwise use site content without prior written permission, except
          to the extent permitted by applicable law.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          10. Website operation and availability
        </h2>
        <p>
          We may update, suspend, withdraw, or change parts of the website,
          product range, pricing, features, account functions, or support
          processes from time to time.
        </p>
        <p>
          We do not promise that the website will always be available,
          uninterrupted, secure, or error-free, although we aim to maintain it
          with reasonable care.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          11. Liability and legal rights
        </h2>
        <p>
          To the maximum extent permitted by law, and subject always to any
          rights or remedies that cannot lawfully be excluded, we exclude
          liability for indirect, incidental, special, or consequential loss
          arising from your use of the website or purchase of goods through this
          storefront.
        </p>
        <p>
          Nothing in these Terms &amp; Conditions excludes liability where such
          exclusion would be unlawful, or excludes any non-excludable consumer
          rights or statutory guarantees that apply to you.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          12. Contact and support
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
          13. Related policies
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