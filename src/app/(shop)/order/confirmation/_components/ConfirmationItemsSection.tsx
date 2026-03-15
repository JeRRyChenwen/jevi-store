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
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Items</h2>
        <div className="text-sm text-neutral-600">
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
            <div key={String(it.id ?? idx)} className="py-4 flex gap-4">
              <div className="h-20 w-20 rounded-xl border bg-neutral-50 overflow-hidden flex items-center justify-center shadow-sm">
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

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{name}</div>

                    {variant ? (
                      <div className="text-sm text-neutral-600 mt-0.5">
                        {variant}
                      </div>
                    ) : null}

                    {sku ? (
                      <div className="text-[11px] text-neutral-400 mt-1 break-all">
                        SKU: {sku}
                      </div>
                    ) : null}
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm text-neutral-600">
                      {qty} × {fmtMoneyMinor(unit, currency)}
                    </div>
                    <div className="text-base font-semibold">
                      {fmtMoneyMinor(line, currency)}
                    </div>
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