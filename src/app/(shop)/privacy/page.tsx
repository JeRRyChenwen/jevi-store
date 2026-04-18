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
  description: `Learn how ${BRAND.displayName} collects, uses, stores, shares, and protects personal information for customers using the ${CURRENT_STOREFRONT.legalRegionLabel} storefront.`,
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
      updatedAt="2026-04-17"
      intro={
        <>
          <p>
            This Privacy Policy explains how <strong>{BRAND.displayName}</strong>{" "}
            collects, uses, stores, discloses, and otherwise handles personal
            information when you visit our website, create an account, place an
            order, contact us, submit a return request, subscribe to updates, or
            otherwise interact with our services.
          </p>
          <p>
            This storefront currently provides sales and delivery only within{" "}
            <strong>{checkoutRegionLabel}</strong>. This policy is intended for
            customers using that storefront.
          </p>
          <p>
            This Privacy Policy is intended to operate in a way that is
            consistent with applicable privacy requirements in{" "}
            <strong>{legalRegionLabel}</strong>, while also reflecting the way
            this storefront is actually operated.
          </p>
        </>
      }
    >
      <section>
        <h2 className="text-base font-semibold text-foreground">
          1. What information we may collect
        </h2>
        <p>Depending on how you interact with us, we may collect information such as:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>your name;</li>
          <li>email address;</li>
          <li>phone number;</li>
          <li>billing and shipping address;</li>
          <li>account details and login-related information;</li>
          <li>order history, order contents, and transaction references;</li>
          <li>payment status and limited payment-related metadata;</li>
          <li>communications with us, including customer support messages;</li>
          <li>return, refund, exchange, and complaint details;</li>
          <li>photos, descriptions, or other evidence you provide in support of a claim; and</li>
          <li>technical, device, browser, usage, and analytics-related information from website use.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          2. How we collect information
        </h2>
        <p>We may collect personal information when you:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>browse or use our website;</li>
          <li>create an account, sign in, or manage account details;</li>
          <li>add items to cart or begin checkout;</li>
          <li>place or attempt to place an order;</li>
          <li>request a cancellation, return, refund, replacement, or exchange;</li>
          <li>contact customer support or send us an enquiry;</li>
          <li>subscribe to newsletters, product updates, or marketing, where offered;</li>
          <li>enter a promotion, campaign, or other optional activity; or</li>
          <li>interact with cookies or similar technologies on our site.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          3. Why we use personal information
        </h2>
        <p>We may use personal information to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>provide, operate, and improve the storefront;</li>
          <li>process and fulfil orders;</li>
          <li>arrange shipping and delivery;</li>
          <li>provide customer service and after-sales support;</li>
          <li>handle returns, refunds, exchanges, complaints, and disputes;</li>
          <li>send transactional emails such as account notices, order confirmations, shipment updates, and return updates;</li>
          <li>detect, prevent, or investigate fraud, abuse, security incidents, or other misuse;</li>
          <li>analyse site performance and customer interactions;</li>
          <li>maintain business records and internal administration; and</li>
          <li>comply with legal, tax, accounting, regulatory, and enforcement obligations.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          4. Payment and transaction information
        </h2>
        <p>
          Payments may be processed through third-party payment providers. We do
          not necessarily store full payment card details on our own systems.
        </p>
        <p>
          We may retain transaction identifiers, payment status, fraud-screening
          outcomes, chargeback or dispute information, and related order
          metadata where reasonably necessary for payment processing, fraud
          prevention, accounting, record-keeping, and customer support.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          5. Shipping, returns, and support data
        </h2>
        <p>
          To fulfil orders and provide after-sales service, we may share
          relevant information with delivery providers, logistics partners,
          returns handlers, customer service tools, and other service providers
          involved in order processing, fulfilment, returns, and support.
        </p>
        <p>
          Where you submit a return, refund, or other claim, we may collect and
          review supporting information such as item photos, packaging photos,
          issue descriptions, and correspondence relevant to assessing the
          request.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          6. Cookies and similar technologies
        </h2>
        <p>
          We may use cookies, pixels, local storage, or similar technologies to
          support essential site functions, remember preferences, maintain cart
          or session state, improve performance, understand traffic patterns,
          measure engagement, and help protect the website from abuse.
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
          vendors, payment processors, hosting providers, cloud infrastructure
          providers, shipping partners, professional advisers, and regulators or
          authorities where reasonably necessary to operate the storefront,
          fulfil orders, manage disputes, enforce our terms, protect our rights,
          or comply with law.
        </p>
        <p>
          We do not sell personal information in the ordinary sense of selling
          customer lists for unrelated third-party marketing.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          8. Cross-border handling and service providers
        </h2>
        <p>
          Depending on how our systems and providers are configured, personal
          information may be processed, stored, backed up, transmitted, or
          accessed outside the country in which the storefront is primarily
          operated.
        </p>
        <p>
          Where this occurs, we seek to work with service providers and
          operational arrangements that support reasonable safeguards for the
          handling of personal information.
        </p>
      </section>

      {isAu ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            9. Australia privacy context
          </h2>
          <p>
            For customers using this Australia storefront, we intend to manage
            personal information in a manner that is consistent with applicable
            Australian privacy obligations, taking into account the nature and
            scale of this business.
          </p>
          <p>
            You may contact us if you would like to request access to personal
            information we hold about you, request correction of information that
            is inaccurate, out of date, incomplete, irrelevant, or misleading,
            or raise a privacy concern.
          </p>
        </section>
      ) : isNz ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            9. New Zealand privacy context
          </h2>
          <p>
            For customers using this New Zealand storefront, we intend to manage
            personal information in a manner that is consistent with applicable
            New Zealand privacy obligations, taking into account the nature and
            scale of this business.
          </p>
          <p>
            You may contact us to request access to personal information, request
            correction, or raise a privacy concern. Where required, privacy
            enquiries may also be handled through the person responsible for the
            privacy function for this storefront.
          </p>
        </section>
      ) : (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            9. Storefront-specific privacy notes
          </h2>
          <p>
            Privacy rights, disclosure obligations, and notice requirements may
            vary depending on the country or region served by this storefront.
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
          10. Data security
        </h2>
        <p>
          We take reasonable technical and organisational steps to protect
          personal information against misuse, interference, loss, unauthorised
          access, modification, or disclosure.
        </p>
        <p>
          However, no online service, storage environment, or transmission
          method can be guaranteed to be completely secure.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          11. Retention
        </h2>
        <p>
          We keep personal information for as long as reasonably necessary for
          order fulfilment, customer service, returns handling, record-keeping,
          legal compliance, accounting, dispute resolution, fraud prevention,
          security monitoring, and legitimate business operations.
        </p>
        <p>
          When personal information is no longer reasonably required, we may
          delete it, de-identify it, or otherwise handle it in accordance with
          applicable law and our operational requirements.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          12. Access, correction, and privacy enquiries
        </h2>
        <p>
          You may contact us if you would like to request access to personal
          information we hold about you, request a correction, or raise a
          privacy concern or complaint.
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
          13. Related policies
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