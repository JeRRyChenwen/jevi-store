// src/app/(shop)/shipping-policy/page.tsx
import type { Metadata } from "next";
import LegalShell from "@/components/legal/LegalShell";
import { BRAND } from "@/lib/brand";
import { CURRENT_STOREFRONT } from "@/lib/market/current";
import { getPolicyContext } from "@/lib/legal/policy-context";
import { POLICY_LINKS } from "@/lib/legal/policy-links";

const POLICY = getPolicyContext();

export const metadata: Metadata = {
  title: `Shipping Policy | ${BRAND.displayName}`,
  description: `Read the order processing, shipping, tracking, and delivery policy for customers using the ${CURRENT_STOREFRONT.legalRegionLabel} storefront.`,
};

export default function ShippingPolicyPage() {
  const {
    checkoutRegionLabel,
    supportRegionLabel,
    supportEmail,
    supportedCountriesForStorefront,
    isAu,
  } = POLICY;

  return (
    <LegalShell
      title="Shipping Policy"
      updatedAt="2026-07-19"
      intro={
        <>
          <p>
            This Shipping Policy explains how orders placed through{" "}
            <strong>{BRAND.displayName}</strong> are processed, dispatched,
            tracked, and delivered.
          </p>
          <p>
            This storefront currently accepts delivery addresses only within{" "}
            <strong>{checkoutRegionLabel}</strong>.
          </p>
          <p>
            Supported delivery countries for this storefront are currently{" "}
            <strong>{supportedCountriesForStorefront.join(", ")}</strong>.
          </p>
        </>
      }
    >
      <section>
        <h2 className="text-base font-semibold text-foreground">
          1. Delivery locations
        </h2>
        <p>
          Orders placed through this storefront can currently be delivered only
          to valid addresses within <strong>{checkoutRegionLabel}</strong>.
        </p>
        <p>
          We may be unable to deliver to certain remote locations, restricted
          addresses, parcel lockers, military addresses, or other destinations
          that are not supported by the available carrier.
        </p>
        <p>
          If we cannot deliver an order to the address provided, we will contact
          you using the details associated with the order and provide an
          appropriate next step.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          2. Order processing
        </h2>
        <p>
          After an order is successfully placed and payment is confirmed, the
          order may need to be reviewed, prepared, packed, and transferred to
          the relevant delivery carrier before dispatch.
        </p>
        <p>
          Processing times are separate from carrier transit times unless the
          estimated arrival time shown during checkout expressly includes both
          processing and delivery.
        </p>
        <p>
          Orders may be fulfilled by our suppliers, warehouse providers,
          third-party logistics providers, or delivery partners. Some orders may
          be processed or dispatched from a location outside the delivery
          destination.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          3. Estimated delivery times
        </h2>
        <p>
          Available shipping methods, estimated delivery times, and applicable
          shipping charges are displayed during checkout based on the delivery
          address, available inventory, warehouse location, and carrier
          information available at that time.
        </p>
        <p>
          Delivery dates and time ranges are estimates rather than guaranteed
          delivery appointments. Actual delivery may be affected by carrier
          delays, severe weather, public holidays, customs or border processing,
          remote delivery locations, incorrect address information, unusually
          high order volumes, or other circumstances outside our reasonable
          control.
        </p>
        <p>
          If we become aware of a material delay that affects your order, we
          will take reasonable steps to provide updated information or contact
          you where appropriate.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          4. Shipping charges
        </h2>
        <p>
          Shipping charges, discounts, and any available free-shipping offers
          are calculated and displayed during checkout before you submit your
          order.
        </p>
        <p>
          Shipping costs may vary according to the delivery destination, parcel
          weight, parcel dimensions, shipping method, warehouse location,
          carrier pricing, and any promotion applying to the order.
        </p>
        <p>
          A free-shipping or discounted-shipping promotion may be subject to a
          minimum order value, eligible destination, selected delivery method,
          promotional period, or other conditions displayed at checkout.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          5. Tracking and dispatch notifications
        </h2>
        <p>
          Where tracking is available, we will provide tracking information
          after the order has been dispatched and the carrier or logistics
          provider has made the tracking details available to us.
        </p>
        <p>
          Tracking information may take some time to become active after a
          shipping label or tracking number has been created.
        </p>
        <p>
          Carrier tracking information is provided by the relevant delivery
          provider and may occasionally be delayed, incomplete, or temporarily
          unavailable.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          6. Delivery address and order details
        </h2>
        <p>
          You are responsible for checking that the recipient name, delivery
          address, postcode, telephone number, email address, product, colour,
          size, and quantity are correct before submitting the order.
        </p>
        <p>
          If you notice an error after placing your order, contact us as soon as
          possible. We cannot guarantee that an address or order can be changed
          after processing or fulfilment has started.
        </p>
        <p>
          Additional shipping costs resulting from an incorrect or incomplete
          address may be charged to the customer where permitted by law and
          where the error was not caused by us.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          7. Failed delivery and returned parcels
        </h2>
        <p>
          A parcel may be returned to the sender or fulfilment provider if the
          delivery address is incorrect or incomplete, the recipient cannot be
          contacted, delivery is refused, the parcel is not collected, or the
          carrier cannot complete delivery.
        </p>
        <p>
          If a parcel is returned, we will review the circumstances and contact
          you about the available options. Additional delivery charges may apply
          to a requested re-delivery where permitted by law and where the failed
          delivery was not caused by us or the carrier.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          8. Lost, damaged, or incorrect deliveries
        </h2>
        <p>
          If tracking shows an unusual delay, the parcel appears to be lost, the
          parcel arrives damaged, or you receive an incorrect item, please
          contact us as soon as reasonably possible.
        </p>
        <p>
          We may ask for your order number, tracking information, photographs of
          the parcel and product, and other reasonable supporting information so
          that we can investigate with the warehouse, logistics provider, or
          carrier.
        </p>
        <p>
          Nothing in this Shipping Policy limits any rights or remedies that
          cannot lawfully be excluded under applicable consumer law.
        </p>
      </section>

      {isAu ? (
        <section>
          <h2 className="text-base font-semibold text-foreground">
            9. Australia storefront notes
          </h2>
          <p>
            For customers using this Australia storefront, nothing in this
            Shipping Policy excludes, restricts, or modifies any consumer
            guarantee, right, or remedy that cannot lawfully be excluded under
            the Australian Consumer Law.
          </p>
          <p>
            Where we are unable to supply or deliver an order within the
            represented or otherwise reasonable period, any available
            cancellation, refund, replacement, or other remedy will be handled
            in accordance with applicable law and the circumstances of the
            order.
          </p>
        </section>
      ) : null}

      <section>
        <h2 className="text-base font-semibold text-foreground">
          {isAu
            ? "10. Contact and related policies"
            : "9. Contact and related policies"}
        </h2>
        <p>
          Shipping support for this storefront is currently managed for{" "}
          <strong>{supportRegionLabel}</strong>.
        </p>
        <p className="mt-2">
          <strong>Customer support email:</strong>{" "}
          <a
            href={`mailto:${supportEmail}`}
            className="font-semibold underline"
          >
            {supportEmail}
          </a>
        </p>
        <ul className="mt-4 list-disc space-y-1 pl-5">
          <li>
            <a
              href={POLICY_LINKS.returnsPolicy}
              className="font-semibold underline"
            >
              Returns Policy
            </a>
          </li>
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
        </ul>
      </section>
    </LegalShell>
  );
}
