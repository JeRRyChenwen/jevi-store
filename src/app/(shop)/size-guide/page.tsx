// src/app/(shop)/size-guide/page.tsx
"use client";

import BackButton from "@/components/navigation/BackButton";
import SizeGuideContent from "@/components/size-guide/SizeGuideContent";

export default function SizeGuidePage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 space-y-8">
      <div className="text-sm text-slate-500">
        <BackButton variant="link" fallbackHref="/" label="Back" />
      </div>

      {/* ✅ 全部显示：Footwear + Clothing + Pants（无 Tabs） */}
      <SizeGuideContent
        showTitle={true}
        showAll={true}
        compact={false}
        // tabs/defaultTab 在 showAll=true 时会被忽略
        tabs={["footwear", "clothing", "pants"]}
        defaultTab="footwear"
      />
    </div>
  );
}
