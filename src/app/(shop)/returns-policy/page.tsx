// src/app/(shop)/returns-policy/page.tsx
import type { Metadata } from "next";
import LegalShell from "@/components/legal/LegalShell";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Returns Policy | ${BRAND.displayName}`,
  description: `Learn about cancellations, returns, refunds, exchanges, and consumer rights for orders placed with ${BRAND.displayName} in Australia and New Zealand.`,
};

export default function ReturnsPolicyPage() {
  return (
    <LegalShell
      title="Returns Policy"
      updatedAt="2026-03-20"
      intro={
        <>
          <p>
            This Returns Policy explains how cancellations, returns, refunds, exchanges, and
            related requests are handled for orders placed with{" "}
            <strong>{BRAND.displayName}</strong>.
          </p>
          <p>
            We currently sell and ship to customers in Australia and New Zealand. This policy is
            intended to provide general guidance on our returns process, including how we handle
            pre-dispatch cancellations, faulty items, incorrect items, and other return or refund
            requests.
          </p>
        </>
      }
    >
      <section>
        <h2 className="text-base font-semibold text-foreground">
          1. Consumer rights in Australia and New Zealand
        </h2>
        <p>
          Nothing in this Returns Policy excludes, restricts, or modifies any rights or remedies
          you may have under the Australian Consumer Law, the New Zealand Consumer Guarantees Act,
          or any other rights that cannot be excluded by law.
        </p>
        <p>
          If a product is faulty, unsafe, not of acceptable quality, does not match its description,
          or otherwise fails to meet applicable consumer guarantees, you may be entitled to a
          repair, replacement, refund, or other remedy in accordance with applicable law.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          2. No fixed expiry for consumer guarantee rights
        </h2>
        <p>
          Rights that arise under applicable consumer law are not automatically limited by a fixed
          store return period such as 7, 14, or 30 days.
        </p>
        <p>
          Whether a remedy may be available depends on what is reasonable in the circumstances,
          including the nature of the product, its price, how it is normally used, how it has been
          cared for, and how long a reasonable consumer would expect it to last.
        </p>
        <p>
          This means that the availability of a repair, replacement, or refund for a faulty item is
          assessed by reference to applicable consumer law and the facts of the individual case, not
          only by reference to a fixed store timeframe.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          3. Change-of-mind cancellation before dispatch
        </h2>
        <p>
          If you change your mind before your order has been dispatched, you may request to cancel
          the order and receive a refund to your original payment method.
        </p>
        <p>
          If your cancellation request is approved before dispatch, we will generally refund the
          order amount you paid, including any shipping amount charged for that order.
        </p>
        <p>
          If you wish to request a pre-dispatch cancellation, please contact us or submit your
          request as soon as possible. We cannot guarantee cancellation once fulfilment, packing, or
          dispatch processing has begun.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          4. Change-of-mind after dispatch
        </h2>
        <p>
          Once an order has been dispatched, we do not accept change-of-mind refunds.
        </p>
        <p>
          This means that if you no longer want an item after it has been shipped, you are not
          automatically entitled to a refund simply because you changed your mind.
        </p>
        <p>
          This section does not affect any rights you may have under the Australian Consumer Law or
          the New Zealand Consumer Guarantees Act where a product is faulty, damaged, unsafe,
          incorrect, or not as described.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          5. Faulty, damaged, incorrect, unsafe, or not-as-described items
        </h2>
        <p>
          If you believe you have received a faulty, damaged, incorrect, unsafe, or not-as-described
          item, please contact us as soon as reasonably possible and submit a request through our{" "}
          <a href="/returns" className="font-semibold underline">
            Returns Request page
          </a>
          .
        </p>
        <p>
          To help us assess the issue, we may ask for information such as your order number,
          contact details, a description of the problem, and photographs of the item and packaging
          where relevant.
        </p>
        <p>
          Once we review your request, we will let you know the next steps. Depending on the
          circumstances, we may offer a repair, replacement, refund, or another appropriate remedy
          where required or permitted by law.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          6. Major problems and minor problems
        </h2>
        <p>
          Under applicable consumer law, a product issue may be classified differently depending on
          the nature and seriousness of the problem.
        </p>
        <p>
          If a product has a <strong>major problem</strong>, you may be entitled to choose a refund
          or replacement, in accordance with applicable law.
        </p>
        <p>
          If a product has a <strong>minor problem</strong>, we may first choose to repair the item
          or otherwise resolve the issue within a reasonable time, where permitted by law. If the
          issue cannot be fixed within a reasonable time, you may then be entitled to a replacement,
          refund, or other remedy in accordance with applicable law.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          7. Normal wear and tear, misuse, and care instructions
        </h2>
        <p>
          Not every issue with a product will amount to a fault or a failure to meet applicable
          consumer guarantees.
        </p>
        <p>
          To the extent permitted by law, normal wear and tear, ordinary ageing of materials,
          accidental damage, misuse, improper storage, abnormal use, or failure to follow care or
          washing instructions may mean that a product is not eligible for a repair, replacement, or
          refund.
        </p>
        <p>
          For clothing and similar items, examples may include issues caused by ordinary use over
          time, washing or drying contrary to garment care instructions, snagging, abrasion, heavy
          friction, or other forms of damage that are not the result of a manufacturing defect or
          other failure covered by applicable consumer law.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          8. Assessment and evidence
        </h2>
        <p>
          Before deciding whether a return, refund, repair, or replacement is available, we may
          inspect the item or request information reasonably necessary to assess the claim.
        </p>
        <p>
          This may include your order number, the email address used for the order, details of the
          issue, photographs, and information about how and when the issue arose.
        </p>
        <p>
          Where relevant, we may also ask whether the item has been worn, washed, altered, repaired,
          or otherwise used in a way that may affect the assessment of the claim.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          9. Return shipping and related costs
        </h2>
        <p>
          If an approved return relates to a faulty, damaged, incorrect, unsafe, or not-as-described
          item, we will assess return shipping costs and any relevant delivery charges in line with
          applicable law and the circumstances of the return.
        </p>
        <p>
          If a pre-dispatch cancellation is approved, we will generally refund the amount paid for
          the order before shipment, including any shipping fee charged for that order.
        </p>
        <p>
          We do not provide post-dispatch change-of-mind refunds, so return shipping arrangements
          for change-of-mind refunds after dispatch do not apply.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          10. Refund method and processing time
        </h2>
        <p>
          Where a refund is approved, it will generally be processed back to the original payment
          method used for the purchase, unless otherwise required by law or agreed with you where
          the original payment method is no longer available.
        </p>
        <p>
          We aim to process approved refunds within <strong>5 business days</strong>. However, the
          time it takes for funds to appear in your account may vary depending on your payment
          provider, card issuer, or financial institution.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          11. When a request may be refused
        </h2>
        <p>
          To the extent permitted by law, we may refuse a request where:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>the request is a change-of-mind request made after dispatch</li>
          <li>insufficient information is provided to identify the order or assess the issue</li>
          <li>we reasonably suspect fraud, misuse, or abusive return behaviour</li>
          <li>the evidence reasonably requested to assess the claim is not provided</li>
          <li>the issue appears to result from normal wear and tear, misuse, accidental damage, or failure to follow care instructions, rather than a fault covered by applicable law</li>
        </ul>
        <p>
          This section does not affect any non-excludable rights or remedies you may have under
          applicable consumer law.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          12. How to request a return or cancellation
        </h2>
        <p>
          To request a return, refund assessment, or cancellation, please visit our{" "}
          <a href="/returns" className="font-semibold underline">
            Returns Request page
          </a>
          .
        </p>
        <p>
          You should submit your request as soon as possible, especially if you wish to request a
          cancellation before dispatch.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          13. Updates to this Returns Policy
        </h2>
        <p>
          We may update this Returns Policy from time to time to reflect changes to our business,
          Website, or legal obligations. The latest version will always be available on this page
          together with its effective date.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">14. Contact us</h2>
        <p>
          If you have any questions about this Returns Policy, please contact us at:
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