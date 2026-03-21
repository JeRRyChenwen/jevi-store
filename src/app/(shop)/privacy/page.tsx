// src/app/(shop)/privacy/page.tsx
import type { Metadata } from "next";
import LegalShell from "@/components/legal/LegalShell";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Privacy Policy | ${BRAND.displayName}`,
  description: `Learn how ${BRAND.displayName} collects, uses, stores, and shares personal information when you use our Website and services.`,
};

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy Policy"
      updatedAt="2026-03-20"
      intro={
        <>
          <p>
            This Privacy Policy explains how <strong>{BRAND.displayName}</strong> (“we”, “us”, or “our”)
            collects, uses, stores, and shares personal information when you use our Website and
            related services.
          </p>
          <p>
            We currently sell and ship to customers in Australia and New Zealand. We are committed
            to handling personal information in an open and transparent way and in accordance with
            applicable privacy requirements that apply to our business.
          </p>
        </>
      }
    >
      <section>
        <h2 className="text-base font-semibold text-foreground">1. What information we collect</h2>
        <p>Depending on how you interact with us, we may collect personal information such as:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>your name, email address, phone number, and delivery address</li>
          <li>account details and login information</li>
          <li>order, transaction, and customer service information</li>
          <li>payment-related information provided through our payment providers</li>
          <li>communications you send to us, including support enquiries</li>
          <li>device, browser, IP, and usage information collected when you use the Website</li>
          <li>cookie and similar technology data, as described in our{" "}
            <a href="/cookies" className="font-semibold underline">
              Cookie Policy
            </a>
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">2. How we collect information</h2>
        <p>We may collect personal information in several ways, including when you:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>create an account or sign in to the Website</li>
          <li>place an order or begin the checkout process</li>
          <li>subscribe to emails or marketing communications</li>
          <li>contact us with a question, request, or complaint</li>
          <li>browse the Website and interact with our pages, features, or tools</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">3. How we use information</h2>
        <p>We may use personal information for purposes such as:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>providing our Website and customer services</li>
          <li>processing orders, payments, delivery, returns, and refunds</li>
          <li>communicating with you about your orders, account, or enquiries</li>
          <li>sending service-related notices and customer support responses</li>
          <li>sending marketing communications where permitted or where you have subscribed</li>
          <li>improving Website functionality, security, and performance</li>
          <li>detecting fraud, misuse, or other unlawful activity</li>
          <li>meeting legal, regulatory, and record-keeping obligations</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">4. Marketing communications</h2>
        <p>
          If you subscribe to our marketing emails, we may send you updates, promotions, and other
          information about our products and services. You can unsubscribe at any time by using the
          unsubscribe link in the email or by contacting us at{" "}
          <a href={`mailto:${BRAND.supportEmail}`} className="font-semibold underline">
            {BRAND.supportEmail}
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">5. Cookies and similar technologies</h2>
        <p>
          We use cookies and similar technologies to help operate the Website, remember preferences,
          support account and checkout functions, and understand Website usage.
        </p>
        <p>
          For more information about how we use cookies and how you can manage them, please see our{" "}
          <a href="/cookies" className="font-semibold underline">
            Cookie Policy
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">6. When we share information</h2>
        <p>
          We may share personal information with trusted third parties where reasonably necessary to
          operate our business, including:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>payment processors and payment service providers</li>
          <li>delivery, shipping, and logistics providers</li>
          <li>email, hosting, infrastructure, and technology service providers</li>
          <li>analytics, security, fraud prevention, or support service providers</li>
          <li>professional advisers or regulators where required</li>
        </ul>
        <p>
          We may also disclose personal information where required by law, to respond to lawful
          requests, or to protect our rights, customers, or business operations.
        </p>
        <p>
          We do not sell personal information to third parties for their own direct marketing.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">7. Storage, security, and overseas processing</h2>
        <p>
          We take reasonable steps to protect personal information from misuse, interference, loss,
          and unauthorised access, modification, or disclosure.
        </p>
        <p>
          No method of transmission over the internet or electronic storage is completely secure, so
          we cannot guarantee absolute security.
        </p>
        <p>
          Depending on the service providers we use, personal information may be stored or processed
          in Australia, New Zealand, or other countries where those providers operate. Where this
          occurs, we take reasonable steps to ensure your information is handled appropriately.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">8. Access, correction, and privacy requests</h2>
        <p>
          You may request access to personal information we hold about you and ask us to correct
          information that is inaccurate, incomplete, or out of date, subject to any legal
          exceptions.
        </p>
        <p>
          You may also contact us if you have a privacy question, concern, or complaint, or if you
          would like to opt out of marketing communications.
        </p>
        <p>
          To make a privacy request, please contact us at{" "}
          <a href={`mailto:${BRAND.supportEmail}`} className="font-semibold underline">
            {BRAND.supportEmail}
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">9. Data retention</h2>
        <p>
          We retain personal information for as long as reasonably necessary for the purposes
          described in this Privacy Policy, including to provide our services, maintain business and
          legal records, resolve disputes, and comply with applicable legal obligations.
        </p>
        <p>
          When personal information is no longer reasonably required, we may delete it, de-identify
          it, or otherwise handle it in accordance with applicable requirements.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">10. Changes to this Privacy Policy</h2>
        <p>
          We may update this Privacy Policy from time to time to reflect changes to our Website,
          services, legal obligations, or privacy practices. The latest version will always be
          published on this page together with its effective date.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">11. Contact us</h2>
        <p>
          If you have any questions, concerns, or complaints about this Privacy Policy or how we
          handle personal information, please contact us at:
        </p>
        <p className="mt-2">
          <strong>Email:</strong>{" "}
          <a href={`mailto:${BRAND.supportEmail}`} className="font-semibold underline">
            {BRAND.supportEmail}
          </a>
        </p>
      </section>
    </LegalShell>
  );
}