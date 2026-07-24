// src/app/(shop)/privacy/page.tsx
import type { Metadata } from "next";
import LegalShell from "@/components/legal/LegalShell";
import { BRAND } from "@/lib/brand";
import { CURRENT_STOREFRONT } from "@/lib/market/current";
import { getPolicyContext } from "@/lib/legal/policy-context";
import { POLICY_LINKS } from "@/lib/legal/policy-links";

const POLICY = getPolicyContext();

const privacyDescription = `Learn how ${BRAND.displayName} collects, uses, stores, shares, and protects personal information for customers using the ${CURRENT_STOREFRONT.legalRegionLabel} storefront.`;

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: privacyDescription,

  alternates: {
    canonical: "/privacy",
  },

  openGraph: {
    type: "website",
    siteName: BRAND.displayName,
    title: `Privacy Policy | ${BRAND.displayName}`,
    description: privacyDescription,
    url: "/privacy",
  },

  twitter: {
    card: "summary",
    title: `Privacy Policy | ${BRAND.displayName}`,
    description: privacyDescription,
  },
};

export default function PrivacyPage() {
  const {
    isAu,
    isNz,
    isEu,
    isUs,
    isCa,
    legalRegionLabel,
    checkoutRegionLabel,
    supportRegionLabel,
    supportEmail,
    siteUrl,
    legalEntityName,
    legalEntityCountry,
    privacyContactEmail,
    cookieConsentMode,
  } = POLICY;

  return (
    <LegalShell
      title="Privacy Policy"
      updatedAt="2026-07-19"
      intro={
        <>
          <p>
            This Privacy Policy explains how <strong>{legalEntityName}</strong>{" "}
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
            this storefront is actually operated at{" "}
            <a href={siteUrl} className="font-semibold underline">
              {siteUrl}
            </a>
            .
          </p>
        </>
      }
    >
      <section>
        <h2 className="text-base font-semibold text-foreground">
          1. What information we may collect
        </h2>
        <p>
          Depending on how you interact with us, we may collect information such
          as:
        </p>
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
          <li>
            photos, descriptions, or other evidence you provide in support of a
            claim; and
          </li>
          <li>
            technical, device, browser, usage, and analytics-related information
            from website use.
          </li>
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
          <li>
            request a cancellation, return, refund, replacement, or exchange;
          </li>
          <li>contact customer support or send us an enquiry;</li>
          <li>
            subscribe to newsletters, product updates, or marketing, where
            offered;
          </li>
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
          <li>
            send transactional emails such as account notices, order
            confirmations, shipment updates, and return updates;
          </li>
          <li>
            detect, prevent, or investigate fraud, abuse, security incidents, or
            other misuse;
          </li>
          <li>analyse site performance and customer interactions;</li>
          <li>maintain business records and internal administration; and</li>
          <li>
            comply with legal, tax, accounting, regulatory, and enforcement
            obligations.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          4. Payment and PayPal information
        </h2>
        <p>
          Payments available through this storefront are processed using PayPal.
          When you choose PayPal at checkout, information required to complete
          and manage the transaction may be provided to PayPal.
        </p>
        <p>
          This information may include your name, email address, billing or
          shipping address, order value, currency, purchased items, shipping
          information, transaction references, and other information reasonably
          required to process the payment, prevent fraud, manage disputes, and
          provide PayPal services.
        </p>
        <p>
          We do not intentionally receive or store your PayPal account password
          or full payment card number on our own systems. We may retain PayPal
          order or transaction identifiers, payment and capture status, refund
          information, dispute or chargeback information, fraud-screening
          outcomes, and related order metadata where reasonably necessary for
          payment processing, accounting, record-keeping, fraud prevention, and
          customer support.
        </p>
        <p>
          PayPal handles personal information in accordance with its own terms
          and privacy practices. You can review the{" "}
          <a
            href="https://www.paypal.com/au/legalhub/paypal/privacy-full"
            target="_blank"
            rel="noreferrer"
            className="font-semibold underline"
          >
            PayPal Privacy Statement
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          5. Shipping, CJdropshipping, returns, and support data
        </h2>
        <p>
          We may use CJdropshipping as a third-party logistics, warehousing, and
          fulfilment provider for eligible orders. To prepare, dispatch, track,
          and deliver an order, we may provide CJdropshipping with information
          reasonably required for fulfilment.
        </p>
        <p>
          This information may include the recipient&apos;s name, delivery
          address, suburb or city, state or region, postcode, country, telephone
          number, email address where required, ordered products, product
          variants, quantities, order references, selected shipping method,
          tracking information, and relevant delivery instructions.
        </p>
        <p>
          CJdropshipping, delivery carriers, warehouse providers, and other
          logistics partners may use this information to process and pack the
          order, arrange transportation, provide tracking, complete delivery,
          investigate delivery issues, and assist with returns, reshipments,
          refunds, or fulfilment disputes.
        </p>
        <p>
          Where you submit a return, refund, replacement, or other claim, we may
          collect and review supporting information such as item photos,
          packaging photos, shipping labels, issue descriptions, and
          correspondence. Relevant information may be shared with
          CJdropshipping, the warehouse, or the delivery carrier where
          reasonably necessary to investigate and resolve the request.
        </p>
        <p>
          CJdropshipping handles personal information in accordance with its own
          terms and privacy practices. You can review the{" "}
          <a
            href="https://cjdropshipping.com/privacyPolicy"
            target="_blank"
            rel="noreferrer"
            className="font-semibold underline"
          >
            CJdropshipping Privacy Policy
          </a>
          .
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
          Depending on the storefront configuration and the legal requirements
          that apply, some non-essential cookies or similar technologies may be
          used only where an appropriate consent setting has been recorded.
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
          7. Email communications, Resend, and service providers
        </h2>
        <p>
          We use Resend as an email delivery service provider to send
          transactional communications such as account notices, order
          confirmations, payment updates, shipment notifications, return
          updates, and customer support messages.
        </p>
        <p>
          Where configured, Resend may also be used to receive, route, or
          process customer support emails and replies. Information processed
          through Resend may include your name, email address, message subject,
          message content, attachments, message identifiers, delivery status,
          bounce or complaint information, and other email-related metadata.
        </p>
        <p>
          If you subscribe to marketing communications, Resend may also be used
          to deliver those communications. Depending on the features enabled,
          email-related metadata may include information about delivery,
          opening, or interaction with links. You can unsubscribe from marketing
          communications using the unsubscribe method provided in the relevant
          message.
        </p>
        <p>
          Resend handles personal information in accordance with its own terms
          and privacy practices. You can review the{" "}
          <a
            href="https://resend.com/legal/privacy-policy"
            target="_blank"
            rel="noreferrer"
            className="font-semibold underline"
          >
            Resend Privacy Policy
          </a>
          .
        </p>
        <p>
          We may also disclose personal information to service providers,
          technology vendors, payment processors, hosting providers, cloud
          infrastructure providers, shipping partners, professional advisers,
          and regulators or authorities where reasonably necessary to operate
          the storefront, fulfil orders, manage disputes, enforce our terms,
          protect our rights, or comply with law.
        </p>
        <p>
          Depending on the storefront and the law that applies, we may also be
          required or permitted to provide additional notice about categories of
          recipients, service providers, operational partners, or other
          disclosures connected with the handling of personal information.
        </p>
        <p>
          We do not sell personal information in the ordinary sense of selling
          customer lists for unrelated third-party marketing.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          8. Cloudflare, hosting, and cross-border processing
        </h2>
        <p>
          We use or may use Cloudflare to provide domain name services, content
          delivery, website performance, traffic management, security
          protection, and related network services.
        </p>
        <p>
          When you access the website, Cloudflare and related infrastructure
          providers may process technical information such as your IP address,
          requested URL, browser and device information, request time, network
          information, security signals, and other data reasonably required to
          deliver and protect the website.
        </p>
        <p>
          Our storefront, administration platform, application programming
          interfaces, content management system, databases, email systems,
          uploaded files, logs, and backups may be hosted or operated using
          third-party virtual private servers, cloud infrastructure, database
          services, storage providers, or other technology providers.
        </p>
        <p>
          Information stored or processed through these systems may include
          account details, order records, delivery information, payment status,
          customer support communications, return requests, uploaded evidence,
          security logs, and other information described in this Privacy Policy.
        </p>
        <p>
          Because we operate from China and use international payment,
          fulfilment, email, hosting, security, and technology providers,
          personal information may be processed, stored, backed up, transmitted,
          or accessed outside the country in which you live or place an order.
          The countries involved may vary according to the provider, service,
          data centre, backup arrangement, and operational requirements.
        </p>
        <p>
          Where personal information is handled across borders, we seek to use
          reputable service providers and reasonable technical, organisational,
          and contractual safeguards appropriate to the nature of the
          information and the service being provided.
        </p>
        <p>
          Cloudflare handles personal information in accordance with its own
          terms and privacy practices. You can review the{" "}
          <a
            href="https://www.cloudflare.com/privacypolicy/"
            target="_blank"
            rel="noreferrer"
            className="font-semibold underline"
          >
            Cloudflare Privacy Policy
          </a>
          .
        </p>
      </section>

      {isAu ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            9. Australia privacy context
          </h2>
          <p>
            For customers using this Australia storefront,{" "}
            <strong>{legalEntityName}</strong> intends to handle personal
            information in a manner that is consistent with applicable
            Australian privacy obligations, taking into account the nature and
            scale of this business.
          </p>
          <p>
            You may contact us if you would like to request access to personal
            information we hold about you, request correction of information
            that is inaccurate, out of date, incomplete, irrelevant, or
            misleading, or raise a privacy concern or complaint.
          </p>
          <p>
            We may need to verify your identity before providing access, making
            a correction, or otherwise responding to a privacy-related request.
          </p>
        </section>
      ) : isNz ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            9. New Zealand privacy context
          </h2>
          <p>
            For customers using this New Zealand storefront,{" "}
            <strong>{legalEntityName}</strong> intends to handle personal
            information in a manner that is consistent with applicable New
            Zealand privacy obligations, taking into account the nature and
            scale of this business.
          </p>
          <p>
            You may contact us to request access to personal information we hold
            about you, request correction, or raise a privacy concern or
            complaint.
          </p>
          <p>
            Where required or appropriate, privacy enquiries may also be handled
            through the person responsible for the privacy function for this
            storefront, and we may need to verify your identity before taking
            action on a request.
          </p>
        </section>
      ) : isEu ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            9. European storefront privacy context
          </h2>
          <p>
            For customers using this European storefront, privacy notice,
            transparency, consent, and individual rights requirements may apply
            differently depending on the relevant European destination and the
            circumstances in which personal information is collected and used.
          </p>
          <p>
            The legal entity currently operating this storefront is{" "}
            <strong>{legalEntityName}</strong> in{" "}
            <strong>{legalEntityCountry}</strong>.
          </p>
          <p>
            Cookie consent mode for this storefront is currently{" "}
            <strong>{cookieConsentMode}</strong>. Where consent is required for
            certain non-essential cookies or similar technologies, we intend to
            rely on the relevant consent setting before using them.
          </p>
          <p>
            You may contact us to request access, correction, or to raise a
            privacy concern or complaint. We may also present additional
            storefront-specific notices at checkout, on forms, or in local
            policy updates where required.
          </p>
        </section>
      ) : isUs ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            9. United States storefront privacy context
          </h2>
          <p>
            For customers using this United States storefront, privacy notice,
            disclosure, cookie, and consumer rights expectations may vary
            depending on the state or jurisdiction involved and the way personal
            information is collected, used, disclosed, retained, or made
            available to service providers and operational partners.
          </p>
          <p>
            The legal entity currently operating this storefront is{" "}
            <strong>{legalEntityName}</strong> in{" "}
            <strong>{legalEntityCountry}</strong>.
          </p>
          <p>
            Cookie consent mode for this storefront is currently{" "}
            <strong>{cookieConsentMode}</strong>. Where required by applicable
            law or operational policy, we may present additional notices,
            opt-out choices, or other privacy-related controls.
          </p>
          <p>
            Depending on the law of the relevant state or jurisdiction, you may
            also be entitled to receive additional disclosures or exercise
            additional privacy-related choices in relation to how certain
            personal information is handled.
          </p>
          <p>
            You may contact us to request access, correction, or to raise a
            privacy concern or complaint. We may also provide additional
            storefront-specific or jurisdiction-specific notices where required.
          </p>
        </section>
      ) : isCa ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            9. Canada storefront privacy context
          </h2>
          <p>
            For customers using this Canada storefront, privacy notice,
            transparency, consent, and complaint-handling expectations may vary
            depending on the province or territory involved and the way personal
            information is collected, used, disclosed, retained, or handled by
            service providers acting for this storefront.
          </p>
          <p>
            The legal entity currently operating this storefront is{" "}
            <strong>{legalEntityName}</strong> in{" "}
            <strong>{legalEntityCountry}</strong>.
          </p>
          <p>
            Cookie consent mode for this storefront is currently{" "}
            <strong>{cookieConsentMode}</strong>. Where appropriate, we may
            provide additional notices, consent prompts, or other
            privacy-related controls for this storefront.
          </p>
          <p>
            Depending on the law of the relevant province or territory, you may
            also be entitled to additional transparency, consent, access,
            correction, or complaint-handling protections in relation to how
            your personal information is handled.
          </p>
          <p>
            You may contact us to request access, correction, or to raise a
            privacy concern or complaint. We may also provide additional
            storefront-specific or province-specific notices where required.
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
            The legal entity currently operating this storefront is{" "}
            <strong>{legalEntityName}</strong> in{" "}
            <strong>{legalEntityCountry}</strong>.
          </p>
          <p>
            Cookie consent mode for this storefront is currently{" "}
            <strong>{cookieConsentMode}</strong>. Where storefront-specific
            privacy wording differs, we may present additional notices at
            checkout, on forms, or in local policy updates.
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
          information we hold about you, request correction of information that
          is inaccurate or incomplete, or raise a privacy concern or complaint.
        </p>
        <p>
          Privacy support for this storefront is currently managed for{" "}
          <strong>{supportRegionLabel}</strong> by{" "}
          <strong>{legalEntityName}</strong>.
        </p>
        <p>
          We may ask you to provide information reasonably necessary to verify
          your identity and locate the relevant records before responding to an
          access, correction, deletion, or privacy-related request.
        </p>
        <p>
          We will review privacy enquiries and complaints in good faith and aim
          to acknowledge and respond within a reasonable period, taking into
          account the nature and complexity of the request. If additional time
          or information is required, we may contact you with an update.
        </p>
        <p>
          Depending on the storefront and the law that applies, you may also
          have additional rights in relation to how your personal information is
          handled. We may provide additional disclosures, choices, review
          pathways, or complaint pathways where required.
        </p>
        <p className="mt-2">
          <strong>Privacy contact email:</strong>{" "}
          <a
            href={`mailto:${privacyContactEmail}`}
            className="font-semibold underline"
          >
            {privacyContactEmail}
          </a>
        </p>
        <p className="mt-2">
          <strong>General support email:</strong>{" "}
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
          13. Contact and related policies
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <a href={POLICY_LINKS.contact} className="font-semibold underline">
              Contact Us
            </a>
          </li>
          <li>
            <a href={POLICY_LINKS.terms} className="font-semibold underline">
              Terms &amp; Conditions
            </a>
          </li>
          <li>
            <a
              href={POLICY_LINKS.shippingPolicy}
              className="font-semibold underline"
            >
              Shipping Policy
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
          <li>
            <a href={POLICY_LINKS.cookies} className="font-semibold underline">
              Cookie Policy
            </a>
          </li>
        </ul>
      </section>
    </LegalShell>
  );
}
