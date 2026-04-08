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
  description: `Read the returns, refund, and cancellation policy for customers in ${CURRENT_STOREFRONT.legalRegionLabel}.`,
};

export default function ReturnsPolicyPage() {
  const {
    isAu,
    isNz,
    legalRegionLabel,
    checkoutRegionLabel,
    supportRegionLabel,
    supportEmail,
    auTaxLabel,
    nzTaxLabel,
    auReturnsPolicyLabel,
    nzReturnsPolicyLabel,
  } = POLICY;

  return (
    <LegalShell
      title="Returns Policy"
      updatedAt="2026-03-30"
      intro={
        <>
          <p>
            This Returns Policy explains how return requests, refunds,
            replacement outcomes, and related after-sales support may be handled
            for orders placed through <strong>{BRAND.displayName}</strong>.
          </p>
          <p>
            This storefront currently accepts orders and offers delivery only
            within <strong>{checkoutRegionLabel}</strong>.
          </p>
          <p>
            This policy is intended to operate consistently with applicable
            consumer protection expectations in{" "}
            <strong>{legalRegionLabel}</strong>.
          </p>
        </>
      }
    >
      <section>
        <h2 className="text-base font-semibold text-foreground">
          1. Change-of-mind returns
        </h2>
        <p>
          Unless otherwise stated, we may choose not to accept returns for
          change of mind. Where we do allow a change-of-mind return, additional
          conditions may apply, including that the item is unused, in original
          condition, in original packaging, and returned within any stated time
          frame.
        </p>
        <p>
          If a change-of-mind return is accepted, original shipping charges may
          be non-refundable unless required by law.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          2. Faulty, damaged, incorrect, or not-as-described items
        </h2>
        <p>
          If an item arrives faulty, damaged, materially different from its
          description, or otherwise does not meet applicable consumer guarantees
          or non-excludable rights, you may be entitled to a repair,
          replacement, refund, or other remedy depending on the nature of the
          issue and applicable law.
        </p>
        <p>
          We may ask for reasonable supporting information, such as photos,
          order details, and a description of the problem, to assess the claim.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          3. Return request process
        </h2>
        <p>
          To request a return, refund, or related after-sales review, please use
          the return request process made available on our website or contact
          support using the details below.
        </p>
        <p>
          We may ask for order information, contact details, the reason for the
          request, and relevant evidence before determining the appropriate
          outcome.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          4. Return shipping and handling
        </h2>
        <p>
          Responsibility for return shipping costs may depend on the reason for
          the return, the condition of the item, and the rights that apply under
          the law governing the transaction.
        </p>
        <p>
          Where a product issue is verified and a remedy is approved, we may
          provide return instructions, a return label, reimbursement, or another
          reasonable return arrangement depending on the circumstances.
        </p>
      </section>

      {isAu ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            5. Australia storefront notes
          </h2>
          <p>
            For customers using this Australia storefront, remedies may be
            affected by applicable consumer guarantee principles, and pricing or
            tax disclosures may refer to <strong>{auTaxLabel}</strong>.
          </p>
          <p>
            Any Australia-specific return handling guidance for this storefront
            may also be described as <strong>{auReturnsPolicyLabel}</strong>.
          </p>
        </section>
      ) : isNz ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            5. New Zealand storefront notes
          </h2>
          <p>
            For customers using this New Zealand storefront, remedies,
            delivery-related handling, or tax treatment may differ depending on
            local legal and operational requirements, including references to{" "}
            <strong>{nzTaxLabel}</strong>.
          </p>
          <p>
            Any New Zealand-specific return handling guidance for this
            storefront may also be described as{" "}
            <strong>{nzReturnsPolicyLabel}</strong>.
          </p>
        </section>
      ) : (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            5. Storefront-specific notes
          </h2>
          <p>
            Refund rights, return procedures, taxes, and logistics arrangements
            may vary depending on the country or region served by this
            storefront.
          </p>
          <p>
            We may provide additional location-specific instructions during the
            return process where needed.
          </p>
        </section>
      )}

      <section>
        <h2 className="text-base font-semibold text-foreground">
          6. Refund timing and method
        </h2>
        <p>
          Where a refund is approved, it will generally be issued using the
          original payment method unless another method is required or agreed.
        </p>
        <p>
          Processing times may vary depending on the payment provider, banking
          system, and the nature of the review.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          7. Exclusions and misuse
        </h2>
        <p>
          We may refuse or limit a return or refund request where permitted by
          law, including where items show misuse, abnormal wear, intentional
          damage, unauthorised modification, or insufficient evidence of the
          issue claimed.
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