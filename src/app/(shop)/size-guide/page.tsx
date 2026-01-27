// src/app/(shop)/size-guide/page.tsx

import Link from "next/link";

const FOOTWEAR_ROWS = [
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

export default function SizeGuidePage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Size guide</h1>
        <p className="text-sm text-muted-foreground">
          Use the charts below to compare common sizing systems. For best accuracy, measure in cm.
        </p>
        <p className="text-xs text-muted-foreground">
          Tip: sizing may vary by brand/cut.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Footwear</h2>
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

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Clothing</h2>
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
            <li><b>Bust:</b> around the fullest part</li>
            <li><b>Waist:</b> around natural waistline</li>
            <li><b>Hips:</b> around the widest part</li>
          </ul>
        </div>
      </section>

      <div>
        <Link href="/" className="text-sm underline underline-offset-4">
          Back to shopping
        </Link>
      </div>
    </div>
  );
}
