// src/app/(shop)/cookies/page.tsx
import type { Metadata } from "next";
import LegalShell from "@/components/legal/LegalShell";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Cookie Policy | ${BRAND.displayName}`,
  description: `Learn how ${BRAND.displayName} uses cookies and similar technologies on our Website.`,
};

export default function CookiesPage() {
  return (
    <LegalShell
      title="Cookie Policy"
      updatedAt="2026-03-20"
      intro={
        <>
          <p>
            This Cookie Policy explains how <strong>{BRAND.displayName}</strong> uses cookies and
            similar technologies on our Website.
          </p>
          <p>
            We currently sell and ship to customers in Australia and New Zealand. This policy
            explains what cookies are, why we use them, and how you can manage them.
          </p>
        </>
      }
    >
      <section>
        <h2 className="text-base font-semibold text-foreground">1. What cookies are</h2>
        <p>
          Cookies are small text files placed on your browser or device when you visit a website.
          They help websites function properly, remember certain preferences, and understand how
          visitors use the site.
        </p>
        <p>
          We may also use similar technologies such as local storage and, where enabled, analytics
          or measurement tools that help us operate and improve the Website.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">2. How we use cookies</h2>
        <p>We use cookies and similar technologies for purposes such as:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>keeping the Website secure and functioning properly</li>
          <li>remembering items in your cart and preserving checkout state</li>
          <li>helping you stay signed in to your account</li>
          <li>remembering certain preferences or settings</li>
          <li>understanding how visitors use the Website so we can improve performance and usability</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">3. Types of cookies we may use</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Essential cookies</strong> – These are necessary for core Website functions such
            as page navigation, account login, cart functionality, security, and checkout.
          </li>
          <li>
            <strong>Preference cookies</strong> – These help remember your settings and preferences,
            where available, so your experience is more consistent on future visits.
          </li>
          <li>
            <strong>Analytics cookies</strong> – Where enabled, these help us understand traffic,
            usage patterns, and Website performance so we can improve the customer experience.
          </li>
          <li>
            <strong>Marketing or advertising cookies</strong> – Where enabled, these may help us
            measure campaign performance or show more relevant promotions through our advertising
            partners.
          </li>
        </ul>
        <p>
          Not all of these cookies will necessarily be active at all times. The cookies used on the
          Website may vary depending on the features and tools currently enabled.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">4. Third-party tools and services</h2>
        <p>
          We may use third-party service providers to support payment processing, delivery,
          analytics, security, or Website performance.
        </p>
        <p>
          Where third-party analytics or advertising tools are enabled, those providers may place
          or access cookies or similar technologies in accordance with their own terms and privacy
          practices.
        </p>
        <p>
          For more information about how we handle personal information, please see our{" "}
          <a href="/privacy" className="font-semibold underline">
            Privacy Policy
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">5. Managing cookies</h2>
        <p>
          You can usually control, block, or delete cookies through your browser settings. Most
          browsers allow you to:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>delete existing cookies</li>
          <li>block some or all cookies</li>
          <li>set preferences for certain websites</li>
          <li>receive notifications when cookies are being placed</li>
        </ul>
        <p>
          Please note that if you disable essential cookies, some parts of the Website may not work
          correctly, including account login, cart functions, or checkout.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">6. Updates to this Cookie Policy</h2>
        <p>
          We may update this Cookie Policy from time to time to reflect changes to our Website,
          technology, legal requirements, or data practices. The latest version will always be
          available on this page together with its effective date.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">7. Contact us</h2>
        <p>
          If you have any questions about this Cookie Policy or our use of cookies and similar
          technologies, please contact us at:
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