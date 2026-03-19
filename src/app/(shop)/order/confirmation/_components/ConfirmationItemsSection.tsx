import type { ServerItem } from "../types";
import {
  clampMinor,
  fmtMoneyMinor,
  getQty,
  pickImage,
  pickName,
  pickVariant,
} from "../utils";

type ConfirmationItemsSectionProps = {
  items: ServerItem[];
  currency: string;
};

export default function ConfirmationItemsSection({
  items,
  currency,
}: ConfirmationItemsSectionProps) {
  const totalQty = items.reduce((n, it) => n + getQty(it), 0);

  return (
    <section className="rounded-2xl border bg-white p-4 sm:p-5 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Items</h2>
        <div className="shrink-0 text-sm text-neutral-600">
          {totalQty} item{totalQty > 1 ? "s" : ""}
        </div>
      </div>

      <div className="mt-4 divide-y">
        {items.map((it, idx) => {
          const name = pickName(it);
          const variant = pickVariant(it);
          const qty = getQty(it);
          const unit = clampMinor(it.unit_price_minor);
          const line = clampMinor(it.line_total_minor);
          const img = pickImage(it);

          const sku =
            String(it.product_sku || it.snapshot?.product_sku || "").trim() || null;

          return (
            <div
              key={String(it.id ?? idx)}
              className="py-4 flex gap-3 sm:gap-4 overflow-hidden"
            >
              <div className="h-20 w-20 shrink-0 rounded-xl border bg-neutral-50 overflow-hidden flex items-center justify-center shadow-sm">
                {img ? (
                  <img
                    src={img}
                    alt={name}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="text-xs text-neutral-400">No image</div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="min-w-0">
                  <div className="font-medium leading-6 break-words">
                    {name}
                  </div>

                  {variant ? (
                    <div className="text-sm text-neutral-600 mt-1 break-words">
                      {variant}
                    </div>
                  ) : null}

                  {sku ? (
                    <div className="text-[11px] text-neutral-400 mt-1 break-all leading-5">
                      SKU: {sku}
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 flex items-end justify-between gap-3">
                  <div className="text-sm text-neutral-600 break-words">
                    {qty} × {fmtMoneyMinor(unit, currency)}
                  </div>

                  <div className="text-base font-semibold text-right shrink-0">
                    {fmtMoneyMinor(line, currency)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}