// src/app/(shop)/returns-policy/page.tsx
import type { Metadata } from "next";
import LegalShell from "@/components/legal/LegalShell";
import { BRAND } from "@/lib/brand";
import { CURRENT_STOREFRONT } from "@/lib/market/current";
import { getPolicyContext } from "@/lib/legal/policy-context";
import { POLICY_LINKS } from "@/lib/legal/policy-links";

const POLICY = getPolicyContext();

export const metadata: Metadata = {
  title: `Returns Policy | ${BRAND.displayName}`,
  description: `Read the returns, refunds, and after-sales policy for customers using the ${CURRENT_STOREFRONT.legalRegionLabel} storefront.`,
};

export default function ReturnsPolicyPage() {
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
      title="Returns Policy"
      updatedAt="2026-04-17"
      intro={
        <>
          <p>
            This Returns Policy explains how return requests, refunds,
            replacements, and other after-sales outcomes are handled for orders
            placed through <strong>{BRAND.displayName}</strong>.
          </p>
          <p>
            This storefront currently accepts orders and offers delivery only
            within <strong>{checkoutRegionLabel}</strong>. Orders placed through
            this storefront are intended for customers with delivery addresses in
            that region only.
          </p>
          <p>
            This policy does not limit any rights you may have under applicable
            consumer law in <strong>{legalRegionLabel}</strong>.
          </p>
        </>
      }
    >
      <section>
        <h2 className="text-base font-semibold text-foreground">
          1. Change-of-mind returns
        </h2>
        <p>
          We do not automatically accept returns for change of mind. If we agree
          to a change-of-mind return, the item must usually be returned in
          saleable condition, unworn, unused, unwashed, with original tags
          attached, and in the original packaging.
        </p>
        <p>
          Unless we state otherwise in writing, any approved change-of-mind
          return request must be submitted within <strong>14 days</strong> after
          delivery.
        </p>
        <p>
          Original shipping charges are generally non-refundable for
          change-of-mind returns, and return shipping costs are usually the
          customer&apos;s responsibility unless we choose otherwise.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          2. Items that may not be eligible for return
        </h2>
        <p>
          We may refuse a return where permitted by law if the item has been
          worn outside normal try-on, washed, altered, damaged after delivery,
          is missing tags or original packaging, or is otherwise not in
          re-saleable condition.
        </p>
        <p>
          We may also refuse change-of-mind returns for final sale, clearance,
          promotional, personalised, or hygiene-sensitive items where this is
          clearly stated at the time of purchase or otherwise permitted by law.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          3. Faulty, damaged, incorrect, or not-as-described items
        </h2>
        <p>
          If your item arrives faulty, damaged, incorrect, or materially
          different from its description, please contact us as soon as
          reasonably possible.
        </p>
        <p>
          Where a product does not meet applicable consumer guarantees or other
          non-excludable rights, you may be entitled to an appropriate remedy,
          which may include repair, replacement, refund, or another remedy
          depending on the nature of the issue and the law that applies.
        </p>
        <p>
          We may ask for reasonable supporting information, including your order
          number, a description of the issue, and photos of the item and
          packaging, so that we can assess the claim efficiently.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          4. How to request a return
        </h2>
        <p>
          To request a return or after-sales review, please use the return
          request process available on our website or contact our support team
          using the details below.
        </p>
        <p>
          To help us process your request, please include:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>your order number;</li>
          <li>the name used for the order;</li>
          <li>the email address used at checkout;</li>
          <li>the item or items you want to return; and</li>
          <li>the reason for the request, including photos where relevant.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          5. Return shipping
        </h2>
        <p>
          For approved change-of-mind returns, the customer is generally
          responsible for arranging and paying for return shipping.
        </p>
        <p>
          If we confirm that an item is faulty, damaged, incorrect, or otherwise
          eligible for a remedy under applicable law, we may provide return
          instructions, a return label, reimbursement of reasonable return
          postage, or another suitable return arrangement depending on the
          circumstances.
        </p>
      </section>

      {isAu ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            6. Australia storefront notes
          </h2>
          <p>
            For customers using this Australia storefront, our goods come with
            guarantees that cannot be excluded under the Australian Consumer
            Law.
          </p>
          <p>
            If a product has a major problem, you may be entitled to choose a
            refund or replacement. If the problem is not major, you may be
            entitled to have the item repaired, replaced, or otherwise remedied
            in accordance with applicable law.
          </p>
          <p>
            Nothing in this Returns Policy is intended to exclude, restrict, or
            modify any rights or remedies that cannot be excluded under
            Australian law.
          </p>
        </section>
      ) : isNz ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            6. New Zealand storefront notes
          </h2>
          <p>
            For customers using this New Zealand storefront, your rights may be
            affected by the Consumer Guarantees Act 1993 and other applicable New
            Zealand consumer laws.
          </p>
          <p>
            Change-of-mind returns are not automatically available unless we
            choose to offer them. However, if goods do not meet applicable
            consumer guarantees, you may be entitled to a repair, replacement,
            refund, or another remedy depending on the circumstances.
          </p>
        </section>
      ) : (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            6. Storefront-specific notes
          </h2>
          <p>
            Return rights, refund options, and return logistics may vary
            depending on the country or region served by this storefront and the
            laws that apply to that transaction.
          </p>
          <p>
            We may provide additional storefront-specific instructions where
            needed.
          </p>
        </section>
      )}

      <section>
        <h2 className="text-base font-semibold text-foreground">
          7. Refund timing and method
        </h2>
        <p>
          If a refund is approved, it will generally be issued to your original
          payment method unless another method is required or agreed.
        </p>
        <p>
          Refund processing times may vary depending on your payment provider,
          bank, and the type of payment used at checkout.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          8. Misuse, abnormal wear, and unsupported claims
        </h2>
        <p>
          Where permitted by law, we may refuse or limit a return, refund, or
          replacement request if the issue results from misuse, accidental
          damage, abnormal wear and tear, unauthorised modification, failure to
          follow care instructions, or insufficient evidence of the claimed
          issue.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          9. Contact and related policies
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
            <a href={POLICY_LINKS.terms} className="font-semibold underline">
              Terms &amp; Conditions
            </a>
          </li>
          <li>
            <a href={POLICY_LINKS.privacy} className="font-semibold underline">
              Privacy Policy
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