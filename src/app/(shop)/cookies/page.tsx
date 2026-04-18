import type { Metadata } from "next";
import LegalShell from "@/components/legal/LegalShell";
import CookieSettingsPanel from "@/components/legal/CookieSettingsPanel";
import { BRAND } from "@/lib/brand";
import { CURRENT_STOREFRONT } from "@/lib/market/current";
import { getPolicyContext } from "@/lib/legal/policy-context";
import { POLICY_LINKS } from "@/lib/legal/policy-links";

const POLICY = getPolicyContext();

export const metadata: Metadata = {
  title: `Cookie Policy & Cookie Settings | ${BRAND.displayName}`,
  description: `Learn how ${BRAND.displayName} uses cookies and similar technologies, and review your cookie settings for the ${CURRENT_STOREFRONT.legalRegionLabel} storefront.`,
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
      title="Cookie Policy & Cookie Settings"
      updatedAt="2026-04-17"
      intro={
        <>
          <p>
            This page explains how <strong>{BRAND.displayName}</strong> may use
            cookies and similar technologies when you visit, browse, or interact
            with our website.
          </p>
          <p>
            It also allows you to review or update your cookie settings for the
            storefront currently operated for <strong>{legalRegionLabel}</strong>.
          </p>
          <p>
            Depending on the configuration of this storefront, similar
            technologies may include cookies, pixels, tags, scripts, local
            storage, and related tools used to support site functionality,
            security, analytics, and user preferences.
          </p>
        </>
      }
    >
      <section>
        <h2 className="text-base font-semibold text-foreground">
          1. Cookie Settings
        </h2>
        <p className="mb-4">
          You can review or update your current cookie choice below.
        </p>
        <CookieSettingsPanel />
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          2. What cookies and similar technologies are
        </h2>
        <p>
          Cookies are small text files stored on your device when you visit a
          website. Similar technologies may include pixels, tags, scripts, local
          storage, SDK-like browser tools, and other technologies used to
          recognise a browser or device, remember preferences, maintain session
          state, measure usage, or support website operation.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          3. How we may use cookies
        </h2>
        <p>We may use cookies or similar technologies to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>keep the website functioning properly;</li>
          <li>maintain cart, checkout, login, or account-related functions;</li>
          <li>remember preferences, language, or session information;</li>
          <li>support security, fraud prevention, and site integrity;</li>
          <li>measure traffic, performance, and user interactions;</li>
          <li>understand how visitors use the storefront;</li>
          <li>improve the user experience; and</li>
          <li>support troubleshooting, diagnostics, and service improvement.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          4. Types of cookies we may use
        </h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Strictly necessary cookies</strong> used for core website
            operation, security, checkout, and session continuity.
          </li>
          <li>
            <strong>Functional or preference cookies</strong> used to remember
            settings and improve convenience.
          </li>
          <li>
            <strong>Analytics or performance cookies</strong> used to understand
            website traffic and usage patterns.
          </li>
          <li>
            <strong>Security-related cookies</strong> used to help detect abuse,
            suspicious activity, or technical issues.
          </li>
        </ul>
        <p>
          Some cookies may be first-party cookies set by this storefront, while
          others may be set by service providers that support hosting,
          analytics, security, customer experience, or related website
          functions.
        </p>
      </section>

      {isEu ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            5. Consent and controls for EU storefronts
          </h2>
          <p>
            For EU storefronts, non-essential cookies or similar technologies
            may be used only where and when valid consent has been obtained, to
            the extent required by applicable law.
          </p>
          <p>
            Strictly necessary cookies may still be used where they are required
            for the operation, security, or essential functionality of the
            website.
          </p>
          <p>
            Where available, you may manage cookie preferences through the
            cookie settings section on this page, a consent banner, browser
            settings, or other controls made available on the site.
          </p>
        </section>
      ) : isAu ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            5. Australia storefront notes
          </h2>
          <p>
            For this Australia storefront, cookie and tracking practices are
            intended to be disclosed in a way that is consistent with applicable
            privacy expectations and the technologies actually used on the site.
          </p>
          <p>
            If we introduce additional analytics, advertising, or third-party
            tracking tools in the future, we may update this policy and present
            additional notices or controls where appropriate.
          </p>
        </section>
      ) : isNz ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            5. New Zealand storefront notes
          </h2>
          <p>
            For this New Zealand storefront, cookie and tracking practices are
            intended to be disclosed in a way that is consistent with applicable
            privacy expectations and the technologies actually used on the site.
          </p>
          <p>
            If we introduce additional analytics, advertising, or third-party
            tracking tools in the future, we may update this policy and present
            additional notices or controls where appropriate.
          </p>
        </section>
      ) : isUs ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            5. United States storefront notes
          </h2>
          <p>
            Cookie and tracking disclosure obligations may vary depending on the
            jurisdiction served by this storefront and the technologies in use.
          </p>
          <p>
            We may provide additional notices, opt-out mechanisms, or controls
            where required by law or operational policy.
          </p>
        </section>
      ) : isCa ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            5. Canada storefront notes
          </h2>
          <p>
            Cookie and tracking disclosure obligations may vary depending on the
            province or territory served by this storefront and the technologies
            in use.
          </p>
          <p>
            We may provide additional notices or controls where required by law
            or operational policy.
          </p>
        </section>
      ) : (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            5. Storefront-specific notes
          </h2>
          <p>
            Cookie, privacy, consent, and tracking disclosure requirements may
            differ depending on the country or region served by this storefront.
          </p>
          <p>
            We may update this policy or provide additional notices where local
            requirements apply.
          </p>
        </section>
      )}

      <section>
        <h2 className="text-base font-semibold text-foreground">
          6. Managing cookies
        </h2>
        <p>
          Most browsers allow you to control cookies through browser settings.
          Depending on your browser, you may be able to block, delete, restrict,
          or receive alerts about cookies.
        </p>
        <p>
          Please note that blocking or disabling some cookies may affect website
          functionality, including cart, login, checkout, preference, or
          account-related features.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          7. Third-party services and future changes
        </h2>
        <p>
          Some cookies or similar technologies may be associated with third-party
          services that support hosting, analytics, security, customer support,
          or website performance.
        </p>
        <p>
          We may change the technologies used on this storefront from time to
          time. If we do, we may update this Cookie Policy and, where
          appropriate, provide updated notices or controls.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          8. Contact and related policies
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