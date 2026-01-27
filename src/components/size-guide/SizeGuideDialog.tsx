// src/components/size-guide/SizeGuideDialog.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

import SizeGuideContent, { type SizeGuideTab } from "@/components/size-guide/SizeGuideContent";

type SizeGuideDialogProps = {
  defaultTab?: SizeGuideTab; // "footwear" | "clothing" | "pants"
  triggerLabel?: React.ReactNode;
  className?: string;
};

export default function SizeGuideDialog({
  defaultTab = "footwear",
  triggerLabel = "Size guide",
  className,
}: SizeGuideDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={
            className ??
            "inline-flex items-center text-xs text-neutral-600 hover:text-neutral-900"
          }
        >
          {triggerLabel ?? "Size guide"}
        </button>
      </DialogTrigger>

      {/* ✅ 关键：固定弹窗尺寸 + 内容区滚动，Tab 切换时就不会“伸缩”了 */}
      <DialogContent
        className="
          bg-white text-neutral-900
          rounded-2xl
          shadow-[0_20px_40px_rgba(0,0,0,0.12)]
          w-[min(980px,calc(100vw-2rem))]
          max-w-none
          h-[760px]
          max-h-[85vh]
          p-0
          overflow-hidden
        "
      >
        {/* 用 flex 把 header / content / footer 分区，保证高度稳定 */}
        <div className="flex h-full flex-col">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Size guide</DialogTitle>
            <DialogDescription className="sr-only">
              Size guide for footwear, clothing and pants. Compare international sizing systems and measurement tips.
            </DialogDescription>
          </DialogHeader>

          {/* ✅ 内容区滚动：内容多就滚动，内容少就留白，弹窗高度不变 */}
          <div className="flex-1 overflow-y-auto px-6 pb-4 pt-4">
            <SizeGuideContent
              defaultTab={defaultTab}
              tabs={["footwear", "clothing", "pants"]}
              showTitle={false}   // 弹窗里不需要大标题（外面已经有 Size guide）
              compact={true}      // 弹窗更紧凑一点
            />
          </div>

          {/* footer 固定在底部 */}
          <div className="flex items-center justify-between border-t px-6 py-4">
            <p className="text-xs text-muted-foreground">
              Tip: sizing may vary by brand/cut.
            </p>
            <Link href="/size-guide" className="text-xs underline underline-offset-4">
              Open full size guide
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
