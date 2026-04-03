// src/app/(shop)/returns-policy/page.tsx
import type { Metadata } from "next";
import LegalShell from "@/components/legal/LegalShell";
import { BRAND } from "@/lib/brand";
import { CURRENT_MARKET } from "@/lib/market/current";
import { getPolicyContext } from "@/lib/legal/policy-context";

const POLICY = getPolicyContext();

export const metadata: Metadata = {
  title: `Returns Policy | ${BRAND.displayName}`,
  description: `Learn about cancellations, returns, refunds, exchanges, and consumer rights for orders placed with ${BRAND.displayName} in ${CURRENT_MARKET.legalRegionLabel}.`,
};

export default function ReturnsPolicyPage() {
  const {
    isAuNz,
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
            This Returns Policy explains how cancellations, returns, refunds,
            exchanges, and related requests are handled for orders placed with{" "}
            <strong>{BRAND.displayName}</strong>.
          </p>
          <p>
            We currently sell and ship only to customers in{" "}
            <strong>{checkoutRegionLabel}</strong>. This policy explains our
            general returns process, including pre-dispatch cancellations,
            post-dispatch requests, faulty items, incorrect items, and other
            return or refund enquiries.
          </p>
          <p>
            This policy operates alongside, and does not replace, any rights or
            remedies you may have under applicable consumer law in{" "}
            <strong>{legalRegionLabel}</strong>.
          </p>
        </>
      }
    >
      <section>
        <h2 className="text-base font-semibold text-foreground">
          1. Consumer rights in {legalRegionLabel}
        </h2>

        {isAuNz ? (
          <>
            <p>
              Nothing in this Returns Policy excludes, restricts, or modifies
              any rights or remedies you may have under the Australian Consumer
              Law, the New Zealand Consumer Guarantees Act, or any other rights
              that cannot be excluded by law.
            </p>
            <p>
              If a product is faulty, unsafe, not of acceptable quality, does
              not match its description, or otherwise fails to meet applicable
              consumer guarantees, you may be entitled to a repair,
              replacement, refund, or other remedy in accordance with applicable
              law.
            </p>
          </>
        ) : (
          <>
            <p>
              Nothing in this Returns Policy excludes, restricts, or modifies
              any mandatory consumer rights or remedies that apply to you under
              the laws of the market in which this storefront operates.
            </p>
            <p>
              If a product is faulty, unsafe, not of acceptable quality, does
              not match its description, or otherwise fails to meet applicable
              consumer protection requirements, you may be entitled to a repair,
              replacement, refund, or other remedy in accordance with
              applicable law.
            </p>
          </>
        )}
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          2. No fixed expiry for consumer guarantee rights
        </h2>
        <p>
          Rights that arise under applicable consumer law are not automatically
          limited by a fixed store return window such as 7, 14, or 30 days.
        </p>
        <p>
          Whether a remedy may be available depends on what is reasonable in the
          circumstances, including the nature of the product, its price, how it
          is normally used, how it has been cared for, and how long a reasonable
          consumer would expect it to last.
        </p>
        <p>
          This means the availability of a repair, replacement, refund, or other
          remedy for a faulty item is assessed by reference to applicable
          consumer law and the facts of the individual case, not only by
          reference to a fixed store timeframe.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          3. Change-of-mind cancellation before dispatch
        </h2>
        <p>
          If you change your mind before your order has been dispatched, you may
          request to cancel the order.
        </p>
        <p>
          If your cancellation request is approved before dispatch, we will
          generally refund the amount you paid for the order, including any
          shipping fee charged for that order.
        </p>
        <p>
          If you wish to request a pre-dispatch cancellation, please contact us
          or submit your request as soon as possible. We cannot guarantee
          cancellation once fulfilment, packing, or dispatch processing has
          begun.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          4. Change-of-mind after dispatch
        </h2>
        <p>
          Once an order has been dispatched, we do not offer change-of-mind
          refunds.
        </p>
        <p>
          This means that if you no longer want an item after it has been
          shipped, you are not automatically entitled to a refund simply because
          you changed your mind.
        </p>
        <p>
          This does not affect any rights you may have under applicable consumer
          law if a product is faulty, damaged, unsafe, incorrect, or not as
          described.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          5. Faulty, damaged, incorrect, unsafe, or not-as-described items
        </h2>
        <p>
          If you believe you have received a faulty, damaged, incorrect, unsafe,
          or not-as-described item, please contact us as soon as reasonably
          possible and submit a request through our{" "}
          <a href="/returns" className="font-semibold underline">
            Returns Request page
          </a>
          .
        </p>
        <p>
          To help us assess the issue, we may ask for information such as your
          order number, contact details, a description of the problem, and
          photographs of the item and packaging where relevant.
        </p>
        <p>
          Once we review your request, we will let you know the next steps.
          Depending on the circumstances, we may offer a repair, replacement,
          refund, or another appropriate remedy where required or permitted by
          law.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          6. Major problems and minor problems
        </h2>
        <p>
          Under applicable consumer law, a product issue may be classified
          differently depending on the nature and seriousness of the problem.
        </p>
        <p>
          If a product has a <strong>major problem</strong>, you may be entitled
          to choose a refund or replacement, in accordance with applicable law.
        </p>
        <p>
          If a product has a <strong>minor problem</strong>, we may first choose
          to repair the item or otherwise resolve the issue within a reasonable
          time, where permitted by law. If the issue cannot be fixed within a
          reasonable time, you may then be entitled to a replacement, refund, or
          other remedy in accordance with applicable law.
        </p>
      </section>

      {isAuNz ? (
        <>
          <section>
            <h2 className="text-base font-semibold text-foreground">
              7. Australia customers
            </h2>
            <p>
              If you are a customer in Australia, your purchase may be covered
              by consumer guarantees under the Australian Consumer Law.
            </p>
            <p>
              If a product has a major problem, you may be entitled to choose a
              refund or replacement. If a product has a minor problem, we may
              first choose to repair the item or otherwise resolve the issue
              within a reasonable time, where permitted by law.
            </p>
            <p>
              Any remedies available to you will be handled in accordance with
              applicable Australian law.
            </p>
            <p>
              Tax wording for Australia orders is generally shown as{" "}
              <strong>{auTaxLabel}</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">
              8. New Zealand customers
            </h2>
            <p>
              If you are a customer in New Zealand, your purchase may be covered
              by rights and remedies under the Consumer Guarantees Act 1993 and
              other applicable New Zealand law.
            </p>
            <p>
              Where a product does not meet applicable consumer guarantees, you
              may be entitled to a repair, replacement, refund, or other remedy
              depending on the circumstances and the seriousness of the issue.
            </p>
            <p>
              Any remedies available to you will be handled in accordance with
              applicable New Zealand law.
            </p>
            <p>
              Tax wording for New Zealand orders may differ from Australia and
              may be shown as <strong>{nzTaxLabel}</strong>.
            </p>
          </section>
        </>
      ) : (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            7. Market-specific consumer law notes
          </h2>
          <p>
            The exact remedies available to you may vary depending on the
            country within this storefront’s active market and the laws that
            apply to that order.
          </p>
          <p>
            Where country-level differences apply within the same market, we may
            provide additional instructions or legal wording during checkout, in
            order emails, or when handling your return request.
          </p>
        </section>
      )}

      <section>
        <h2 className="text-base font-semibold text-foreground">
          9. Normal wear and tear, misuse, and care instructions
        </h2>
        <p>
          Not every issue with a product will amount to a fault or a failure to
          meet applicable consumer guarantees.
        </p>
        <p>
          To the extent permitted by law, normal wear and tear, ordinary ageing
          of materials, accidental damage, misuse, improper storage, abnormal
          use, or failure to follow care or washing instructions may mean that a
          product is not eligible for a repair, replacement, or refund.
        </p>
        <p>
          For clothing and similar items, examples may include issues caused by
          ordinary use over time, washing or drying contrary to garment care
          instructions, snagging, abrasion, heavy friction, or other forms of
          damage that are not the result of a manufacturing defect or other
          failure covered by applicable consumer law.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          10. Assessment and evidence
        </h2>
        <p>
          Before deciding whether a return, refund, repair, or replacement is
          available, we may inspect the item or request information reasonably
          necessary to assess the claim.
        </p>
        <p>
          This may include your order number, the email address used for the
          order, details of the issue, photographs, and information about how
          and when the issue arose.
        </p>
        <p>
          Where relevant, we may also ask whether the item has been worn,
          washed, altered, repaired, or otherwise used in a way that may affect
          the assessment of the claim.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          11. Return shipping and related costs
        </h2>
        <p>
          If an approved return relates to a faulty, damaged, incorrect, unsafe,
          or not-as-described item, we will assess return shipping costs and any
          relevant delivery charges in line with applicable law and the
          circumstances of the return.
        </p>
        <p>
          If a pre-dispatch cancellation is approved, we will generally refund
          the amount paid for the order before shipment, including any shipping
          fee charged for that order.
        </p>
        <p>
          Because we do not offer post-dispatch change-of-mind refunds, return
          shipping arrangements for change-of-mind refunds after dispatch do not
          apply.
        </p>
        <p>
          For approved refunds, we may separately show:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>the item refund amount</li>
          <li>any shipping refund amount</li>
          <li>the total refund amount</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          12. Refund method and processing time
        </h2>
        <p>
          Where a refund is approved, it will generally be processed back to the
          original payment method used for the purchase, unless otherwise
          required by law or agreed with you where the original payment method
          is no longer available.
        </p>
        <p>
          We aim to process approved refunds within{" "}
          <strong>5 business days</strong>. However, the time it takes for funds
          to appear in your account may vary depending on your payment provider,
          card issuer, bank, or platform.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          13. How to contact us about a return
        </h2>
        <p>
          If you need help with a return, refund, exchange, or cancellation,
          please contact us or use our{" "}
          <a href="/returns" className="font-semibold underline">
            Returns Request page
          </a>
          .
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
        {isAuNz ? (
          <div className="mt-4 rounded-xl border bg-muted/40 p-4 text-sm leading-7 text-foreground/90">
            <p className="font-semibold text-foreground">
              Country-specific wording currently in use
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>{auReturnsPolicyLabel}</li>
              <li>{nzReturnsPolicyLabel}</li>
            </ul>
          </div>
        ) : null}
      </section>
    </LegalShell>
  );
}