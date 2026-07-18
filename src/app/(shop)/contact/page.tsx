// src/app/(shop)/contact/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { CURRENT_STOREFRONT } from "@/lib/market/current";
import { POLICY_LINKS } from "@/lib/legal/policy-links";

export const metadata: Metadata = {
  title: `Contact Us | ${BRAND.displayName}`,
  description: `Contact ${BRAND.displayName} for order, delivery, return, product, and general customer support enquiries.`,
};

export default function ContactPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="space-y-10">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Contact Us
          </h1>

          <p className="text-sm leading-6 text-muted-foreground">
            Contact <strong>{BRAND.displayName}</strong> for help with orders,
            delivery, returns, product information, account enquiries, or other
            customer support matters.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">
            Customer support
          </h2>

          <p className="text-sm leading-6 text-muted-foreground">
            Customer support for this storefront is currently provided by email.
          </p>

          <p className="text-sm leading-6 text-muted-foreground">
            <strong className="text-foreground">Email:</strong>{" "}
            <a
              href={`mailto:${BRAND.supportEmail}`}
              className="font-semibold text-foreground underline"
            >
              {BRAND.supportEmail}
            </a>
          </p>

          <p className="text-sm leading-6 text-muted-foreground">
            This storefront currently serves customers in{" "}
            <strong>{CURRENT_STOREFRONT.supportRegionLabel}</strong>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">
            Order enquiries
          </h2>

          <p className="text-sm leading-6 text-muted-foreground">
            When contacting us about an existing order, please include the
            following information where available:
          </p>

          <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
            <li>your order number;</li>
            <li>the name used for the order;</li>
            <li>the email address used at checkout;</li>
            <li>a description of the issue; and</li>
            <li>photos or supporting information where relevant.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">
            Returns and damaged items
          </h2>

          <p className="text-sm leading-6 text-muted-foreground">
            To request a return, refund, replacement, or review of a faulty,
            damaged, incorrect, or not-as-described item, please use our online
            return request page.
          </p>

          <p>
            <Link
              href={POLICY_LINKS.returnsRequest}
              className="text-sm font-semibold text-foreground underline"
            >
              Submit a return request
            </Link>
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">
            Related information
          </h2>

          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>
              <Link
                href={POLICY_LINKS.shippingPolicy}
                className="font-semibold text-foreground underline"
              >
                Shipping Policy
              </Link>
            </li>

            <li>
              <Link
                href={POLICY_LINKS.returnsPolicy}
                className="font-semibold text-foreground underline"
              >
                Returns Policy
              </Link>
            </li>

            <li>
              <Link
                href={POLICY_LINKS.terms}
                className="font-semibold text-foreground underline"
              >
                Terms &amp; Conditions
              </Link>
            </li>

            <li>
              <Link
                href={POLICY_LINKS.privacy}
                className="font-semibold text-foreground underline"
              >
                Privacy Policy
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
