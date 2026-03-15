import Link from "next/link";
import { countryLabelOf } from "@/lib/country";

import type { ServerItem, ServerOrder } from "../types";
import { clampMinor, fmtMoneyMinor, getQty } from "../utils";

type ConfirmationSidebarProps = {
  order: ServerOrder;
  items: ServerItem[];
  currency: string;
  totalMinor: number;
  shippingMinor: number;
  address: any | null;
  deliveryOption: string;
};

export default function ConfirmationSidebar({
  order,
  items,
  currency,
  totalMinor,
  shippingMinor,
  address,
  deliveryOption,
}: ConfirmationSidebarProps) {
  const totalQty = items.reduce((n, it) => n + getQty(it), 0);

  const itemsSubtotalMinor =
    typeof order.items_total_minor === "number"
      ? clampMinor(order.items_total_minor)
      : items.reduce((sum, it) => sum + clampMinor(it.line_total_minor), 0);

  const discountMinor =
    typeof order.discount_minor === "number"
      ? clampMinor(order.discount_minor)
      : 0;

  const taxMinor =
    typeof order.tax_minor === "number" ? clampMinor(order.tax_minor) : 0;

  return (
    <aside className="space-y-6 lg:sticky lg:top-6">
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold">Order Summary</h2>

        <div className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-neutral-600">
              Items subtotal{" "}
              <span className="text-neutral-400">
                ({totalQty} item{totalQty > 1 ? "s" : ""})
              </span>
            </span>
            <span className="font-medium text-neutral-900">
              {fmtMoneyMinor(itemsSubtotalMinor, currency)}
            </span>
          </div>

          {discountMinor > 0 ? (
            <div className="flex items-center justify-between">
              <span className="text-neutral-600">Discount</span>
              <span className="font-medium text-neutral-900">
                − {fmtMoneyMinor(discountMinor, currency)}
              </span>
            </div>
          ) : null}

          {taxMinor > 0 ? (
            <div className="flex items-center justify-between">
              <span className="text-neutral-600">Tax</span>
              <span className="font-medium text-neutral-900">
                {fmtMoneyMinor(taxMinor, currency)}
              </span>
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            <span className="text-neutral-600">Delivery fee</span>
            <span className="font-medium text-neutral-900">
              {shippingMinor === 0 ? "FREE" : fmtMoneyMinor(shippingMinor, currency)}
            </span>
          </div>

          <div className="border-t pt-3 flex items-center justify-between">
            <span className="font-semibold">Total</span>
            <span className="text-lg font-bold">
              {fmtMoneyMinor(totalMinor, currency)}
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold">Delivery Details</h2>

        {address ? (
          <div className="mt-3 text-sm leading-6 text-neutral-800">
            <div className="font-medium text-neutral-900">
              {[address.firstName, address.lastName].filter(Boolean).join(" ")}
            </div>

            {address.line1 ? (
              <div>
                {address.line1}
                {address.line2 ? ` ${address.line2}` : ""}
              </div>
            ) : null}

            {address.city || address.state || address.postcode ? (
              <div>
                {[address.city, address.state, address.postcode]
                  .filter(Boolean)
                  .join(" ")}
              </div>
            ) : null}

            {address.country ? (
              <div>
                {countryLabelOf(String(address.country)) || String(address.country)}
              </div>
            ) : null}

            {address.phone ? <div className="mt-2">{address.phone}</div> : null}
            {address.email ? <div>{address.email}</div> : null}
          </div>
        ) : (
          <div className="mt-3 text-sm text-neutral-500">
            No address provided.
          </div>
        )}

        <div className="mt-4 rounded-xl border bg-neutral-50 px-4 py-3 text-sm flex items-center justify-between">
          <span className="text-neutral-600">Delivery method</span>
          <span className="font-medium text-neutral-900">
            {deliveryOption.toLowerCase() === "express" ? "Express" : "Standard"}
          </span>
        </div>
      </section>

      <div className="flex justify-end">
        <Link
          href="/"
          className="rounded-md bg-black text-white px-6 py-2 text-sm font-medium text-center"
        >
          Continue Shopping
        </Link>
      </div>
    </aside>
  );
}