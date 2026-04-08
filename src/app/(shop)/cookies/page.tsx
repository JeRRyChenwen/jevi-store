// src/app/(shop)/cookies/page.tsx
import type { Metadata } from "next";
import LegalShell from "@/components/legal/LegalShell";
import { BRAND } from "@/lib/brand";
import { CURRENT_STOREFRONT } from "@/lib/market/current";
import { getPolicyContext } from "@/lib/legal/policy-context";
import { POLICY_LINKS } from "@/lib/legal/policy-links";

const POLICY = getPolicyContext();

export const metadata: Metadata = {
  title: `Cookie Policy | ${BRAND.displayName}`,
  description: `Learn how ${BRAND.displayName} uses cookies and similar technologies for customers in ${CURRENT_STOREFRONT.legalRegionLabel}.`,
};

export default function CookiePolicyPage() {
  const {
    isAu,
    isNz,
    isEu,
    isUs,
    isCa,
    legalRegionLabel,
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
            may use cookies and similar technologies when you visit or interact
            with our website.
          </p>
          <p>
            This policy applies to the storefront currently operated for{" "}
            <strong>{legalRegionLabel}</strong>.
          </p>
        </>
      }
    >
      <section>
        <h2 className="text-base font-semibold text-foreground">
          1. What cookies are
        </h2>
        <p>
          Cookies are small text files placed on your device when you visit a
          website. Similar technologies may include pixels, tags, scripts, local
          storage, and other tools used to recognise devices, remember
          preferences, support functionality, analyse traffic, or improve the
          operation of the site.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          2. How we may use cookies
        </h2>
        <p>We may use cookies or similar technologies to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>keep the website functioning properly</li>
          <li>remember preferences or session information</li>
          <li>support login, cart, checkout, or account-related functions</li>
          <li>measure traffic and site performance</li>
          <li>help detect fraud, abuse, or technical issues</li>
          <li>improve the user experience</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          3. Types of cookies we may use
        </h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>strictly necessary cookies</li>
          <li>functional or preference cookies</li>
          <li>analytics or performance cookies</li>
          <li>security-related cookies</li>
        </ul>
        <p>
          Some cookies may be first-party cookies set by this storefront, while
          others may be set by service providers supporting website functions or
          analytics.
        </p>
      </section>

      {isEu ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            4. Consent and controls for EU storefronts
          </h2>
          <p>
            Where required by applicable law, we may request cookie consent
            before using non-essential cookies or similar technologies.
          </p>
          <p>
            You may also be able to adjust cookie preferences through browser
            settings or any cookie controls made available on the site.
          </p>
        </section>
      ) : isAu ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            4. Australia storefront notes
          </h2>
          <p>
            Cookie disclosure practices may reflect privacy and consumer
            expectations relevant to Australia, depending on the configuration
            of this storefront and the technologies in use.
          </p>
          <p>
            If we introduce additional tracking or analytics tools in the
            future, we may update this policy and present further notices where
            appropriate.
          </p>
        </section>
      ) : isNz ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            4. New Zealand storefront notes
          </h2>
          <p>
            Cookie disclosure practices may reflect privacy and consumer
            expectations relevant to New Zealand, depending on the
            configuration of this storefront and the technologies in use.
          </p>
          <p>
            If we introduce additional tracking or analytics tools in the
            future, we may update this policy and present further notices where
            appropriate.
          </p>
        </section>
      ) : isUs ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            4. United States storefront notes
          </h2>
          <p>
            Cookie and tracking disclosure obligations may vary depending on the
            jurisdiction served by this storefront and the technologies used.
          </p>
          <p>
            We may provide additional notices or controls if required by law or
            operational policy.
          </p>
        </section>
      ) : isCa ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            4. Canada storefront notes
          </h2>
          <p>
            Cookie and tracking disclosure obligations may vary depending on the
            jurisdiction served by this storefront and the technologies used.
          </p>
          <p>
            We may provide additional notices or controls if required by law or
            operational policy.
          </p>
        </section>
      ) : (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            4. Storefront-specific notes
          </h2>
          <p>
            Cookie, privacy, and consent requirements may differ depending on
            the country or region served by this storefront.
          </p>
          <p>
            We may update this policy or provide extra notices where local
            requirements apply.
          </p>
        </section>
      )}

      <section>
        <h2 className="text-base font-semibold text-foreground">
          5. Managing cookies
        </h2>
        <p>
          Most browsers allow you to control cookies through browser settings.
          You may be able to block, delete, or restrict cookies, although doing
          so may affect some website functionality.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          6. Updates to this policy
        </h2>
        <p>
          We may update this Cookie Policy from time to time to reflect changes
          in law, technology, service providers, or the way the storefront
          operates.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          7. Contact and related policies
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
        <ul className="mt-4 list-disc pl-5 space-y-1">
          <li>
            <a href={POLICY_LINKS.privacy} className="font-semibold underline">
              Privacy Policy
            </a>
          </li>
          <li>
            <a href={POLICY_LINKS.terms} className="font-semibold underline">
              Terms &amp; Conditions
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