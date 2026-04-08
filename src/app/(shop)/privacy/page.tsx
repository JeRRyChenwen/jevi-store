// src/app/(shop)/privacy/page.tsx
import type { Metadata } from "next";
import LegalShell from "@/components/legal/LegalShell";
import { BRAND } from "@/lib/brand";
import { CURRENT_STOREFRONT } from "@/lib/market/current";
import { getPolicyContext } from "@/lib/legal/policy-context";
import { POLICY_LINKS } from "@/lib/legal/policy-links";

const POLICY = getPolicyContext();

export const metadata: Metadata = {
  title: `Privacy Policy | ${BRAND.displayName}`,
  description: `Learn how ${BRAND.displayName} collects, uses, stores, and protects personal information for customers in ${CURRENT_STOREFRONT.legalRegionLabel}.`,
};

export default function PrivacyPage() {
  const {
    isAu,
    isNz,
    legalRegionLabel,
    checkoutRegionLabel,
    supportRegionLabel,
    supportEmail,
  } = POLICY;

  return (
    <LegalShell
      title="Privacy Policy"
      updatedAt="2026-03-30"
      intro={
        <>
          <p>
            This Privacy Policy explains how <strong>{BRAND.displayName}</strong>{" "}
            collects, uses, stores, and discloses personal information when you
            visit our website, place an order, contact us, submit a return
            request, or otherwise interact with our services.
          </p>
          <p>
            We currently provide storefront services and shipping only within{" "}
            <strong>{checkoutRegionLabel}</strong>.
          </p>
          <p>
            This Privacy Policy is intended to operate in a way that is
            consistent with applicable privacy and consumer protection
            requirements in <strong>{legalRegionLabel}</strong>.
          </p>
        </>
      }
    >
      <section>
        <h2 className="text-base font-semibold text-foreground">
          1. What information we may collect
        </h2>
        <p>We may collect information such as:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>your name</li>
          <li>email address</li>
          <li>phone number</li>
          <li>billing and shipping address</li>
          <li>order details and payment-related information</li>
          <li>communications with us</li>
          <li>return, refund, and support request details</li>
          <li>technical and device-related information from website usage</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          2. How we collect information
        </h2>
        <p>We may collect personal information when you:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>browse or use our website</li>
          <li>create an account or sign in</li>
          <li>place an order</li>
          <li>request a cancellation, return, refund, or exchange</li>
          <li>contact customer support</li>
          <li>subscribe to updates or marketing, where offered</li>
          <li>interact with cookies or similar technologies on our site</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          3. How we use personal information
        </h2>
        <p>We may use personal information to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>process and fulfil orders</li>
          <li>arrange shipping and delivery</li>
          <li>provide customer service and support</li>
          <li>handle returns, refunds, and related enquiries</li>
          <li>
            send transactional emails such as order confirmations and shipment
            updates
          </li>
          <li>maintain site security and prevent fraud or misuse</li>
          <li>improve our website, products, and services</li>
          <li>comply with legal and regulatory obligations</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          4. Payment and transaction information
        </h2>
        <p>
          Payments may be processed through third-party payment providers. We do
          not necessarily store full card details on our own systems.
        </p>
        <p>
          We may retain order references, payment status information, and other
          transaction metadata necessary for order processing, fraud prevention,
          accounting, dispute handling, and customer support.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          5. Shipping, returns, and support data
        </h2>
        <p>
          To fulfil orders and support after-sales service, we may share
          relevant information with delivery providers, logistics partners,
          service providers, and support systems used to process orders and
          returns.
        </p>
        <p>
          Where you submit a return or refund request, we may also collect
          supporting information such as item photos, issue descriptions, and
          correspondence relevant to assessing the request.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          6. Cookies and similar technologies
        </h2>
        <p>
          We may use cookies or similar technologies to support essential site
          functions, remember preferences, improve performance, analyse traffic,
          and help protect the website from abuse.
        </p>
        <p>
          For more detail, please see our{" "}
          <a href={POLICY_LINKS.cookies} className="font-semibold underline">
            Cookie Policy
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          7. When we may disclose information
        </h2>
        <p>
          We may disclose personal information to service providers, technology
          vendors, payment processors, shipping partners, professional advisers,
          or authorities where reasonably necessary to operate the storefront,
          fulfil orders, manage disputes, enforce our terms, or comply with law.
        </p>
        <p>
          We do not sell personal information in the ordinary sense of selling
          customer lists for unrelated third-party marketing.
        </p>
      </section>

      {isAu ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            8. Australia privacy context
          </h2>
          <p>
            If you are located in Australia, your personal information may be
            handled in a manner intended to be consistent with applicable
            privacy obligations in Australia, taking into account the nature and
            scale of this storefront.
          </p>
          <p>
            Depending on how our systems and providers are configured, some data
            may be processed or stored outside Australia. Where this occurs, we
            take reasonable steps to work with providers and operational
            arrangements that support secure handling of personal information.
          </p>
        </section>
      ) : isNz ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            8. New Zealand privacy context
          </h2>
          <p>
            If you are located in New Zealand, your personal information may be
            handled in a manner intended to be consistent with applicable
            privacy obligations in New Zealand, taking into account the nature
            and scale of this storefront.
          </p>
          <p>
            Depending on how our systems and providers are configured, some data
            may be processed or stored outside New Zealand. Where this occurs,
            we take reasonable steps to work with providers and operational
            arrangements that support secure handling of personal information.
          </p>
        </section>
      ) : (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            8. Storefront-specific privacy notes
          </h2>
          <p>
            Privacy obligations and disclosure requirements may vary depending on
            the country or region served by this storefront and the services
            used to operate the site.
          </p>
          <p>
            Where storefront-specific privacy wording differs, we may present
            additional notices at checkout, on forms, or in local policy
            updates.
          </p>
        </section>
      )}

      <section>
        <h2 className="text-base font-semibold text-foreground">
          9. Data security
        </h2>
        <p>
          We take reasonable technical and organisational steps to protect
          personal information against misuse, interference, loss, unauthorised
          access, modification, or disclosure.
        </p>
        <p>
          However, no online system or transmission method can be guaranteed to
          be completely secure.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          10. Retention
        </h2>
        <p>
          We keep personal information for as long as reasonably necessary for
          order fulfilment, record-keeping, customer service, returns handling,
          legal compliance, dispute resolution, fraud prevention, and legitimate
          business operations.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          11. Access, correction, and enquiries
        </h2>
        <p>
          You may contact us if you would like to request access to personal
          information we hold about you, request corrections, or raise a
          privacy concern.
        </p>
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
            <a href={POLICY_LINKS.terms} className="font-semibold underline">
              Terms &amp; Conditions
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