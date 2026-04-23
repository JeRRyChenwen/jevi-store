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
    isEu,
    isUs,
    isCa,
    legalRegionLabel,
    checkoutRegionLabel,
    supportRegionLabel,
    supportEmail,
    returnsContactEmail,
    supportedCountriesForStorefront,
    returnWindowDaysChangeOfMind,
    hasEuWithdrawalRight,
  } = POLICY;

  return (
    <LegalShell
      title="Returns Policy"
      updatedAt="2026-04-17"
      intro={
        <>
          <p>
            This Returns Policy explains how return requests, refunds,
            replacements, cancellations, and other after-sales outcomes are
            handled for orders placed through <strong>{BRAND.displayName}</strong>.
          </p>
          <p>
            This storefront currently accepts orders and offers delivery only
            within <strong>{checkoutRegionLabel}</strong>. Orders placed through
            this storefront are intended for customers with delivery addresses in
            that region only.
          </p>
          <p>
            Supported delivery countries for this storefront are currently{" "}
            <strong>{supportedCountriesForStorefront.join(", ")}</strong>.
          </p>
          <p>
            This policy does not limit any rights you may have under applicable
            consumer law in <strong>{legalRegionLabel}</strong>, including any
            mandatory cancellation, withdrawal, refund, replacement, or repair
            rights that may apply to eligible purchases.
          </p>
        </>
      }
    >
      <section>
        <h2 className="text-base font-semibold text-foreground">
          1. Change-of-mind returns
        </h2>
        <p>
          We do not accept returns, refunds, or exchanges for change of mind,
          including where you no longer want the item, ordered the wrong item,
          chose the wrong size, colour, or style, or found the item unsuitable
          after purchase.
        </p>
        <p>
          Any exception to this position may be made only if we choose to do so
          in writing, in our sole discretion, and on terms determined by us.
        </p>
        <p>
          If we agree in writing to make an exception, any original shipping
          charges will generally remain non-refundable and the customer will
          generally remain responsible for return shipping costs unless we
          expressly state otherwise.
        </p>
        <p>
          For the avoidance of doubt, this change-of-mind position is separate
          from any statutory cancellation or withdrawal right, repair right,
          replacement right, refund right, or other remedy that may apply under
          the law governing the relevant purchase.
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
          reasonably possible after delivery.
        </p>
        <p>
          Where goods do not meet applicable consumer guarantees, statutory
          rights, or other non-excludable protections, you may be entitled to
          an appropriate remedy. Depending on the nature of the issue and the
          law that applies, this may include repair, replacement, refund, or
          another remedy required or permitted by law.
        </p>
        <p>
          We may ask for reasonable supporting information, including your order
          number, a description of the issue, and photos of the item and
          packaging, so that we can assess the claim efficiently and provide an
          appropriate next step.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          4. How to request a return
        </h2>
        <p>
          To request a return, refund, replacement, or other after-sales review,
          please use the return request process available on our website or
          contact our returns support contact using the details set out below.
        </p>
        <p>
          We may review the information you provide before issuing return
          instructions, approving a return, or confirming the next appropriate
          step.
        </p>
        <p>To help us process your request, please include:</p>
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
          responsible for arranging and paying for return shipping, unless we
          expressly state otherwise.
        </p>
        <p>
          If we confirm that an item is faulty, damaged, incorrect, or otherwise
          eligible for a remedy under applicable law, we may provide return
          instructions, a return label, reimbursement of reasonable return
          postage, or another suitable return arrangement depending on the
          circumstances and the law that applies.
        </p>
        <p>
          Depending on the storefront and the jurisdiction involved, return
          shipping instructions, the party responsible for return shipping cost,
          and any requirement to use an approved return method may vary where
          permitted or required by law.
        </p>
      </section>

      {isAu ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            6. Australia storefront notes
          </h2>
          <p>
            For customers using this Australia storefront, our goods and
            services come with guarantees that cannot be excluded under the
            Australian Consumer Law.
          </p>
          <p>
            Change-of-mind returns are separate from your rights under the
            Australian Consumer Law. A discretionary change-of-mind return we
            may choose to accept does not replace, limit, or reduce any remedy
            that may be available to you where goods fail to meet consumer
            guarantees.
          </p>
          <p>
            If a product has a major problem, you may be entitled to choose a
            refund or replacement. If the problem is not major, you may be
            entitled to have the item repaired, replaced, or otherwise remedied
            within a reasonable time in accordance with applicable law.
          </p>
          <p>
            Nothing in this Returns Policy is intended to exclude, restrict, or
            modify any rights or remedies that cannot lawfully be excluded under
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
            affected by the Consumer Guarantees Act 1993, the Fair Trading Act
            1986, and other applicable New Zealand laws.
          </p>
          <p>
            Change-of-mind returns are not automatically available unless we
            choose to offer them as a discretionary commercial policy.
          </p>
          <p>
            If goods do not meet applicable consumer guarantees, you may be
            entitled to a repair, replacement, refund, or another remedy
            depending on the circumstances and the nature of the issue.
          </p>
          <p>
            Nothing in this Returns Policy is intended to exclude, restrict, or
            modify any rights or remedies that cannot lawfully be excluded under
            New Zealand law.
          </p>
        </section>
      ) : hasEuWithdrawalRight || isEu ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            6. European storefront notes
          </h2>
          <p>
            For customers using this European storefront, additional
            cancellation or withdrawal rights may apply to eligible online
            purchases under applicable law.
          </p>
          <p>
            Where applicable, eligible customers may have a withdrawal period of{" "}
            <strong>14 days</strong> from delivery or, where relevant, from the
            conclusion of the contract, subject to the nature of the goods,
            whether the purchase is eligible, and any lawful exceptions or
            limitations that apply.
          </p>
          <p>
            Where a statutory withdrawal right applies, you may need to notify
            us within the applicable withdrawal period and return the goods in
            accordance with the instructions we provide, subject always to any
            mandatory legal requirements that apply in the relevant European
            destination.
          </p>
          <p>
            Depending on the law that applies, certain goods or circumstances
            may be excluded from a statutory withdrawal right, or the handling
            of the returned goods may affect the amount refundable where this is
            permitted by law.
          </p>
          <p>
            Change-of-mind returns under our discretionary commercial policy,
            statutory withdrawal rights, and fault-based remedies may operate
            differently. This policy should be read together with any mandatory
            rights that apply in the relevant European destination.
          </p>
        </section>
      ) : isUs ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            6. United States storefront notes
          </h2>
          <p>
            For customers using this United States storefront, return rights,
            refund expectations, after-sales practices, and any related
            cancellation or complaint-handling expectations may vary depending
            on the state or jurisdiction involved and the circumstances of the
            purchase.
          </p>
          <p>
            Change-of-mind returns under our discretionary commercial policy are
            separate from any mandatory legal rights or remedies that may apply
            under the law of the relevant jurisdiction.
          </p>
          <p>
            Where goods arrive faulty, damaged, incorrect, or materially not as
            described, you may be entitled to an appropriate remedy under
            applicable law, and we may provide additional jurisdiction-specific
            notices or instructions where required.
          </p>
          <p>
            Depending on the law that applies, refund timing, available remedy
            options, and any conditions for rejecting, limiting, or reviewing a
            return or refund request may vary between jurisdictions.
          </p>
        </section>
      ) : isCa ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            6. Canada storefront notes
          </h2>
          <p>
            For customers using this Canada storefront, return rights, refund
            expectations, after-sales practices, and any related complaint-
            handling expectations may vary depending on the province or
            territory involved and the circumstances of the purchase.
          </p>
          <p>
            Change-of-mind returns under our discretionary commercial policy are
            separate from any mandatory legal rights or remedies that may apply
            under the law of the relevant province, territory, or other
            applicable Canadian law.
          </p>
          <p>
            Where goods arrive faulty, damaged, incorrect, or materially not as
            described, you may be entitled to an appropriate remedy under
            applicable law, and we may provide additional province-specific
            notices or instructions where required.
          </p>
          <p>
            Depending on the law that applies, refund timing, available remedy
            options, and any conditions for rejecting, limiting, or reviewing a
            return or refund request may vary between provinces or territories.
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
          payment method unless another method is required by law or expressly
          agreed with you.
        </p>
        <p>
          Refund processing times may vary depending on your payment provider,
          bank, the type of payment used at checkout, and the nature of the
          refund basis, including whether the refund arises from a discretionary
          change-of-mind return, a statutory withdrawal right, or a fault-based
          remedy.
        </p>
        <p>
          Where a statutory withdrawal right or other mandatory refund right
          applies, refund timing and any conditions for withholding, reducing,
          or delaying a refund may be governed by the law that applies in the
          relevant destination or jurisdiction.
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
          <strong>Returns contact email:</strong>{" "}
          <a
            href={`mailto:${returnsContactEmail}`}
            className="font-semibold underline"
          >
            {returnsContactEmail}
          </a>
        </p>
        <p className="mt-2">
          <strong>General support email:</strong>{" "}
          <a
            href={`mailto:${supportEmail}`}
            className="font-semibold underline"
          >
            {supportEmail}
          </a>
        </p>
        <p className="mt-2">
          Depending on the storefront and the destination country, state,
          province, or other jurisdiction served, we may provide additional
          return, refund, cancellation, or complaint-handling information where
          required.
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