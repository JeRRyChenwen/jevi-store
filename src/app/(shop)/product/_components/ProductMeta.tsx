// src/app/(shop)/product/_components/ProductMeta.tsx

import React from "react";
import ColorDotsClient from "./ColorDotsClient";
import SizeClient from "./SizeClient";
import HeightIncreaseClient from "./HeightIncreaseClient";
import SizeGuideDialog from "@/components/size-guide/SizeGuideDialog";

function MetaRow({
  label,
  value,
  right,
}: {
  label: string;
  value?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-neutral-500 font-medium">{label}</span>
        {value ? <span className="text-neutral-400">·</span> : null}
        {value ? (
          <span className="text-neutral-900 font-semibold truncate">
            {value}
          </span>
        ) : null}
      </div>

      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

type ProductMetaProps = {
  slug: string;
  colorOptions: { name: string; css?: string }[];
  currentColor?: string;
  sizeOptions: { value: string; stock: number }[];
  currentSize?: string;
  shouldShowHeightPicker: boolean;
  heightOptions: { value: number; stock: number }[];
  validHeight: number;
};

export default function ProductMeta({
  slug,
  colorOptions,
  currentColor,
  sizeOptions,
  currentSize,
  shouldShowHeightPicker,
  heightOptions,
  validHeight,
}: ProductMetaProps) {
  return (
    <div className="space-y-7 overflow-visible">
      {colorOptions.length > 0 ? (
        <div className="space-y-2 overflow-visible">
          <MetaRow label="Colors" value={currentColor ?? undefined} />

          <div className="min-h-11 overflow-visible pb-1">
            <ColorDotsClient
              options={colorOptions}
              current={currentColor}
              slug={slug}
            />
          </div>
        </div>
      ) : null}

      {sizeOptions.length > 0 ? (
        <div className="space-y-3 overflow-visible">
          <MetaRow label="Sizes" value={currentSize ?? undefined} />

          <div className="min-w-0 overflow-visible">
            <SizeClient
              options={sizeOptions}
              current={currentSize}
              slug={slug}
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-1 gap-y-1 pt-1 text-[11px] text-neutral-400">
            <span>Need help choosing your size?</span>

            <SizeGuideDialog
              defaultTab="footwear"
              triggerLabel={
                <span className="group text-neutral-600 hover:text-neutral-900">
                  <span className="no-underline underline-offset-2 group-hover:underline">
                    Size guide
                  </span>
                </span>
              }
            />
          </div>
        </div>
      ) : null}

      {shouldShowHeightPicker ? (
        <div className="space-y-2 overflow-visible">
          <HeightIncreaseClient
            options={heightOptions}
            current={validHeight}
            slug={slug}
            paramKey="height"
          />
        </div>
      ) : null}
    </div>
  );
}
