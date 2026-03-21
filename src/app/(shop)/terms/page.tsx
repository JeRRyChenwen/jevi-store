// src/app/(shop)/terms/page.tsx
import type { Metadata } from "next";
import LegalShell from "@/components/legal/LegalShell";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Terms & Conditions | ${BRAND.displayName}`,
  description: `Read the terms that apply to your use of ${BRAND.displayName}, including orders, payments, shipping, and your consumer rights in Australia and New Zealand.`,
};

export default function TermsPage() {
  return (
    <LegalShell
      title="Terms & Conditions"
      updatedAt="2026-03-20"
      intro={
        <>
          <p>
            These Terms &amp; Conditions (“Terms”) apply to your use of the{" "}
            <strong>{BRAND.displayName}</strong> website (the “Website”) and to purchases made
            through the Website.
          </p>
          <p>
            By accessing this Website or placing an order with us, you agree to these Terms. If you
            do not agree, please do not use the Website.
          </p>
          <p>
            We currently sell and ship to customers in Australia and New Zealand. Additional terms
            may apply to certain promotions, products, or services where stated.
          </p>
        </>
      }
    >
      <section>
        <h2 className="text-base font-semibold text-foreground">1. About these Terms</h2>
        <p>
          These Terms govern your use of the Website, any account you create with us, and any order
          you place through the Website.
        </p>
        <p>
          We may update these Terms from time to time. If we make material changes, we will publish
          the updated version on this page. Your continued use of the Website after changes are
          published indicates your acceptance of the revised Terms.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">2. Eligibility and accounts</h2>
        <p>
          You may browse the Website without creating an account. To access certain features, you
          may need to register an account and provide accurate, current, and complete information.
        </p>
        <p>
          You are responsible for maintaining the confidentiality of your account details and for
          all activity that occurs under your account. Please contact us promptly if you believe
          your account has been accessed without your permission.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">3. Products, pricing and availability</h2>
        <p>
          We aim to ensure that product descriptions, images, sizing information, and prices are as
          accurate as possible. However, we do not guarantee that all Website content is always
          complete, current, or error-free.
        </p>
        <p>
          Product images are for general illustration only. Actual colours and appearance may vary
          depending on your screen, device settings, and lighting conditions.
        </p>
        <p>
          All products are subject to availability. We may update, withdraw, or discontinue
          products at any time without notice.
        </p>
        <p>
          Prices shown on the Website are displayed in the applicable currency and include GST where
          required by law, unless stated otherwise. We reserve the right to correct pricing,
          description, or publishing errors at any time.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">4. Orders and payment</h2>
        <p>
          When you place an order, you are making an offer to purchase the selected products subject
          to these Terms. Submission of an order does not guarantee acceptance of that order.
        </p>
        <p>
          We may decline or cancel an order where reasonably necessary, including where a product is
          unavailable, where there is an obvious pricing or listing error, where payment cannot be
          authorised, or where we reasonably suspect fraud or misuse of the Website.
        </p>
        <p>
          Payments are processed securely through third-party payment providers. By completing a
          purchase, you authorise the relevant payment provider to process your payment using your
          selected payment method.
        </p>
        <p>
          If we cancel an order after payment has been processed, we will arrange a refund of the
          amount paid through the original payment method, unless otherwise required by law.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">5. Shipping in Australia and New Zealand</h2>
        <p>
          We currently ship to addresses in Australia and New Zealand only.
        </p>
        <p>
          Delivery timeframes provided on the Website are estimates only and may vary depending on
          location, carrier delays, customs processing, peak periods, or other factors outside our
          reasonable control.
        </p>
        <p>
          Risk in products passes to you on delivery, to the extent permitted by applicable law.
          Ownership in products passes once full payment has been received and the order has been
          dispatched, unless otherwise required by law.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">6. Promotions and discount codes</h2>
        <p>
          From time to time, we may offer discount codes, promotional campaigns, or limited offers.
          Unless stated otherwise in the relevant promotion:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>discount codes are valid for one-time use only</li>
          <li>codes may be subject to expiry dates and minimum spend requirements</li>
          <li>codes cannot be combined with other offers unless expressly stated</li>
          <li>codes cannot be applied retrospectively after an order has been placed</li>
          <li>some exclusions may apply, including sale items, shipping fees, or selected products</li>
        </ul>
        <p>
          We may cancel or refuse promotional benefits where we reasonably believe a promotion has
          been used improperly, fraudulently, or contrary to its intended terms.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">7. Returns, refunds and consumer rights</h2>
        <p>
          Our returns process is described in our{" "}
          <a href="/returns-policy" className="font-semibold underline">
            Returns Policy
          </a>
          .
        </p>
        <p>
          Nothing in these Terms excludes, restricts, or modifies any rights or remedies you may
          have under the Australian Consumer Law, the New Zealand Consumer Guarantees Act, or any
          other rights that cannot be excluded by law.
        </p>
        <p>
          Where a product is faulty, unsafe, not of acceptable quality, or does not match its
          description, you may be entitled to a repair, replacement, refund, or other remedy in
          accordance with applicable law.
        </p>
        <p>
          Change-of-mind returns are not guaranteed unless expressly stated in our Returns Policy.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">8. Website use and intellectual property</h2>
        <p>
          You may use the Website for personal, lawful, and non-commercial purposes only. You must
          not misuse the Website, interfere with its operation, attempt unauthorised access, or use
          the Website in a way that infringes the rights of others.
        </p>
        <p>
          All content on the Website, including text, graphics, logos, images, branding, layouts,
          and software, is owned by or licensed to <strong>{BRAND.displayName}</strong> and is
          protected by applicable intellectual property laws.
        </p>
        <p>
          You must not reproduce, modify, republish, upload, distribute, or commercially exploit
          Website content without our prior written consent, except as permitted by law.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">9. Privacy and third-party services</h2>
        <p>
          We handle personal information in accordance with our{" "}
          <a href="/privacy" className="font-semibold underline">
            Privacy Policy
          </a>
          .
        </p>
        <p>
          The Website may rely on third-party services such as payment processors, delivery
          providers, analytics providers, or other service providers to help us operate our
          business. Your use of certain third-party services may also be subject to their own terms
          and privacy practices.
        </p>
        <p>
          The Website may contain links to third-party websites for convenience. We are not
          responsible for the content, availability, or practices of those third-party websites.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">10. Liability</h2>
        <p>
          To the maximum extent permitted by law, we do not guarantee that the Website will always
          be available, uninterrupted, secure, or free from errors, viruses, or other harmful
          components.
        </p>
        <p>
          To the maximum extent permitted by law, we are not liable for indirect, incidental,
          special, or consequential loss, or for loss of profit, revenue, opportunity, goodwill, or
          data arising from your use of, or inability to use, the Website.
        </p>
        <p>
          Nothing in these Terms excludes, restricts, or modifies any non-excludable rights,
          guarantees, or remedies available to you under applicable consumer law.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">11. Changes to the Website</h2>
        <p>
          We may update, suspend, withdraw, or change any part of the Website, including product
          listings, pricing, features, or availability, at any time and without notice.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">12. Governing law</h2>
        <p>
          These Terms are governed by the laws of Victoria, Australia, except to the extent that
          mandatory consumer protection laws in Australia or New Zealand apply to your purchase or
          use of the Website.
        </p>
        <p>
          Subject to any rights you may have under applicable law, you submit to the non-exclusive
          jurisdiction of the courts of Victoria, Australia.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">13. Contact us</h2>
        <p>
          If you have any questions about these Terms &amp; Conditions, please contact us at:
        </p>
        <p className="mt-2">
          <strong>Email:</strong>{" "}
          <a href={`mailto:${BRAND.supportEmail}`} className="underline">
            {BRAND.supportEmail}
          </a>
        </p>
      </section>
    </LegalShell>
  );
}