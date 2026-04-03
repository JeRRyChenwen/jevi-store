// src/app/(shop)/cookies/page.tsx
import type { Metadata } from "next";
import LegalShell from "@/components/legal/LegalShell";
import { BRAND } from "@/lib/brand";
import { CURRENT_MARKET } from "@/lib/market/current";
import { getPolicyContext } from "@/lib/legal/policy-context";
import { POLICY_LINKS } from "@/lib/legal/policy-links";

const POLICY = getPolicyContext();

export const metadata: Metadata = {
  title: `Cookie Policy | ${BRAND.displayName}`,
  description: `Learn how ${BRAND.displayName} uses cookies and similar technologies for customers in ${CURRENT_MARKET.legalRegionLabel}.`,
};

export default function CookiesPage() {
  const {
    isAuNz,
    legalRegionLabel,
    checkoutRegionLabel,
    supportRegionLabel,
    supportEmail,
  } = POLICY;

  return (
    <LegalShell
      title="Cookie Policy"
      updatedAt="2026-03-30"
      intro={
        <>
          <p>
            This Cookie Policy explains how <strong>{BRAND.displayName}</strong>{" "}
            uses cookies and similar technologies on this website.
          </p>
          <p>
            We currently operate this storefront for customers in{" "}
            <strong>{checkoutRegionLabel}</strong>.
          </p>
          <p>
            This Cookie Policy should be read together with our{" "}
            <a href={POLICY_LINKS.privacy} className="font-semibold underline">
              Privacy Policy
            </a>
            .
          </p>
        </>
      }
    >
      <section>
        <h2 className="text-base font-semibold text-foreground">
          1. What cookies are
        </h2>
        <p>
          Cookies are small text files or similar technologies that may be
          stored on your device when you visit a website. They can help the site
          remember actions, preferences, technical session data, and other
          information relevant to your browsing experience.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          2. How we may use cookies
        </h2>
        <p>We may use cookies and similar technologies to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>keep the site functioning properly</li>
          <li>support login or session continuity</li>
          <li>remember user preferences or cart-related state</li>
          <li>help secure the storefront and reduce abuse</li>
          <li>measure site performance and improve user experience</li>
          <li>support analytics or diagnostics</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          3. Types of cookies we may use
        </h2>
        <p>Depending on how the site is configured, we may use:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Essential cookies</strong> for core website operation</li>
          <li><strong>Preference cookies</strong> for remembering settings</li>
          <li><strong>Analytics cookies</strong> for usage measurement and diagnostics</li>
          <li><strong>Security-related cookies</strong> for fraud or abuse prevention</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          4. Third-party technologies
        </h2>
        <p>
          Some site features, payment flows, embedded services, analytics tools,
          or infrastructure providers may place or read cookies or similar
          identifiers through their own systems, subject to their own policies
          and configurations.
        </p>
      </section>

      {isAuNz ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            5. Australia and New Zealand note
          </h2>
          <p>
            For this AU/NZ storefront phase, cookie usage is primarily intended
            to support website operation, order flow, user experience, security,
            and limited analytics or diagnostics where enabled.
          </p>
        </section>
      ) : (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            5. Market-specific cookie notes
          </h2>
          <p>
            Cookie disclosures, consent mechanisms, and analytics wording may
            need to vary depending on the country within the active market and
            the laws that apply there.
          </p>
        </section>
      )}

      <section>
        <h2 className="text-base font-semibold text-foreground">
          6. Managing cookies
        </h2>
        <p>
          You can usually control or delete cookies through your browser or
          device settings. Blocking some cookies may affect how parts of the
          website function, including checkout, account access, or preference
          retention.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          7. Updates to this Cookie Policy
        </h2>
        <p>
          We may update this Cookie Policy from time to time to reflect changes
          to our website, technology stack, service providers, analytics setup,
          legal obligations, or market configuration.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          8. Contact
        </h2>
        <p>
          If you have questions about cookie usage, privacy, or related policy
          matters for this storefront in <strong>{legalRegionLabel}</strong>,
          please contact us.
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
    </LegalShell>
  );
}