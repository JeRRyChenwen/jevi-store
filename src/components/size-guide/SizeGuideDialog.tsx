// src/components/size-guide/SizeGuideDialog.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

type SizeGuideDialogProps = {
  defaultTab?: "footwear" | "clothing";
  triggerLabel?: React.ReactNode;
  className?: string;
};

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

export default function SizeGuideDialog({
  defaultTab = "footwear",
  triggerLabel = "Size guide",
  className,
}: SizeGuideDialogProps) {
  const [tab, setTab] = React.useState<"footwear" | "clothing">(defaultTab);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={className ?? "inline-flex items-center text-xs text-neutral-600 hover:text-neutral-900"}
        >
          {triggerLabel ?? "Size guide"}
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Size guide</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="footwear">Footwear</TabsTrigger>
            <TabsTrigger value="clothing">Clothing</TabsTrigger>
          </TabsList>

          <TabsContent value="footwear" className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Compare common sizing systems. Use <b>foot length (cm)</b> for best accuracy.
            </p>
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
          </TabsContent>

          <TabsContent value="clothing" className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              General conversion chart. For best fit, compare with your body measurements.
            </p>
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
          </TabsContent>
        </Tabs>

        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Tip: sizing may vary by brand/cut.</p>
          <Link href="/size-guide" className="text-xs underline underline-offset-4">
            Open full size guide
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
