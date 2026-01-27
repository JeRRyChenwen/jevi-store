// src/components/size-guide/SizeGuideContent.tsx
"use client";

import * as React from "react";

export type SizeGuideTab = "footwear" | "clothing" | "pants";

const FOOTWEAR_ROWS = [
  // ✅ 小尺码
  { cm: "23.0", us: "5", uk: "4", eu: "37" },
  { cm: "23.5", us: "5.5", uk: "4.5", eu: "37.5" },

  { cm: "24.0", us: "6", uk: "5.5", eu: "38" },
  { cm: "24.5", us: "6.5", uk: "6", eu: "39" },
  { cm: "25.0", us: "7", uk: "6.5", eu: "40" },
  { cm: "25.5", us: "7.5", uk: "7", eu: "40.5" },
  { cm: "26.0", us: "8", uk: "7.5", eu: "41" },
  { cm: "26.5", us: "8.5", uk: "8", eu: "42" },
  { cm: "27.0", us: "9", uk: "8.5", eu: "42.5" },
];

const CLOTHING_ROWS = [
  { alpha: "XS", au: "6", us: "2", uk: "6", eu: "34" },
  { alpha: "S", au: "8", us: "4", uk: "8", eu: "36" },
  { alpha: "M", au: "10", us: "6", uk: "10", eu: "38" },
  { alpha: "L", au: "12", us: "8", uk: "12", eu: "40" },
  { alpha: "XL", au: "14", us: "10", uk: "14", eu: "42" },
];

const PANTS_ROWS = [
  { alpha: "XS", au: "6", us: "2", eu: "34", waist: "60–64", hip: "84–88" },
  { alpha: "S", au: "8", us: "4", eu: "36", waist: "65–69", hip: "89–93" },
  { alpha: "M", au: "10", us: "6", eu: "38", waist: "70–74", hip: "94–98" },
  { alpha: "L", au: "12", us: "8", eu: "40", waist: "75–79", hip: "99–103" },
  { alpha: "XL", au: "14", us: "10", eu: "42", waist: "80–84", hip: "104–108" },
];

function SimpleTable({
  columns,
  rows,
}: {
  columns: { key: string; label: string }[];
  rows: Record<string, string>[];
}) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-3 py-2 text-left font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx} className="border-t">
              {columns.map((c) => (
                <td key={c.key} className="px-3 py-2">
                  {r[c.key] ?? "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FootwearSection({ compact }: { compact: boolean }) {
  return (
    <section className="space-y-3">
      {!compact && <h2 className="text-lg font-semibold">Footwear</h2>}
      <SimpleTable
        columns={[
          { key: "cm", label: "Foot length (cm)" },
          { key: "us", label: "US" },
          { key: "uk", label: "UK" },
          { key: "eu", label: "EU" },
        ]}
        rows={FOOTWEAR_ROWS as any}
      />
      <div className="space-y-1 text-sm">
        <p className="font-medium">How to measure</p>
        <ol className="list-decimal pl-5 text-muted-foreground">
          <li>Stand on a sheet of paper with heel against a wall.</li>
          <li>Mark the longest toe and measure heel-to-toe in cm.</li>
          <li>If between sizes, choose the larger size.</li>
        </ol>
      </div>
    </section>
  );
}

function ClothingSection({ compact }: { compact: boolean }) {
  return (
    <section className="space-y-3">
      {!compact && <h2 className="text-lg font-semibold">Clothing</h2>}
      <SimpleTable
        columns={[
          { key: "alpha", label: "Alpha" },
          { key: "au", label: "AU" },
          { key: "us", label: "US" },
          { key: "uk", label: "UK" },
          { key: "eu", label: "EU" },
        ]}
        rows={CLOTHING_ROWS as any}
      />
      <div className="space-y-1 text-sm">
        <p className="font-medium">How to measure</p>
        <ul className="list-disc pl-5 text-muted-foreground">
          <li>
            <b>Bust:</b> around the fullest part
          </li>
          <li>
            <b>Waist:</b> around natural waistline
          </li>
          <li>
            <b>Hips:</b> around the widest part
          </li>
        </ul>
      </div>
    </section>
  );
}

function PantsSection({ compact }: { compact: boolean }) {
  return (
    <section className="space-y-3">
      {!compact && <h2 className="text-lg font-semibold">Pants</h2>}
      <SimpleTable
        columns={[
          { key: "alpha", label: "Alpha" },
          { key: "au", label: "AU" },
          { key: "us", label: "US" },
          { key: "eu", label: "EU" },
          { key: "waist", label: "Waist (cm)" },
          { key: "hip", label: "Hips (cm)" },
        ]}
        rows={PANTS_ROWS as any}
      />
      <div className="space-y-1 text-sm">
        <p className="font-medium">How to measure</p>
        <ul className="list-disc pl-5 text-muted-foreground">
          <li>
            <b>Waist:</b> measure around your natural waistline
          </li>
          <li>
            <b>Hips:</b> measure around the fullest part of your hips
          </li>
        </ul>
      </div>
    </section>
  );
}

export default function SizeGuideContent({
  defaultTab = "footwear",
  tabs = ["footwear", "clothing"],
  showTitle = true,
  compact = false,
  showAll = false, // ✅ NEW：全页模式：不需要 tabs，全部展示
}: {
  defaultTab?: SizeGuideTab;
  tabs?: SizeGuideTab[];
  showTitle?: boolean;
  compact?: boolean;
  showAll?: boolean;
}) {
  const availableTabs = tabs.length ? tabs : (["footwear", "clothing"] as SizeGuideTab[]);
  const [tab, setTab] = React.useState<SizeGuideTab>(
    availableTabs.includes(defaultTab) ? defaultTab : availableTabs[0]
  );

  const topGap = compact ? "space-y-4" : "space-y-8";

  // ✅ 全展示模式：完全忽略 tab state
  const allOrder: SizeGuideTab[] = ["footwear", "clothing", "pants"];

  return (
    <div className={topGap}>
      {showTitle && (
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Size guide</h1>
          <p className="text-sm text-muted-foreground">
            Use the charts below to compare common sizing systems. For best accuracy, measure in cm.
          </p>
          <p className="text-xs text-muted-foreground">Tip: sizing may vary by brand/cut.</p>
        </div>
      )}

      {/* ✅ Tabs：仅在非 showAll 且可用 tab > 1 时显示 */}
      {!showAll && availableTabs.length > 1 && (
        <div className="flex items-center gap-2">
          {availableTabs.map((t) => {
            const active = t === tab;
            const label = t === "footwear" ? "Footwear" : t === "clothing" ? "Clothing" : "Pants";
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={[
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                ].join(" ")}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* ✅ 全页：全部展示 */}
      {showAll ? (
        <div className={compact ? "space-y-6" : "space-y-10"}>
          {allOrder.includes("footwear") && <FootwearSection compact={false} />}
          {allOrder.includes("clothing") && <ClothingSection compact={false} />}
          {allOrder.includes("pants") && <PantsSection compact={false} />}
        </div>
      ) : (
        <>
          {tab === "footwear" && <FootwearSection compact={compact} />}
          {tab === "clothing" && <ClothingSection compact={compact} />}
          {tab === "pants" && <PantsSection compact={compact} />}
        </>
      )}
    </div>
  );
}
