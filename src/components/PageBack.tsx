// src/components/PageBack.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type PageBackProps = {
  /** 显示文案，默认 Back */
  label?: string;
  /** 如果传入 href，就跳到指定页面；不传则走 history.back()，失败则回到首页 */
  href?: string;
  /** 外层容器 class，可用于控制间距等 */
  className?: string;
};

export default function PageBack({
  label = "Back",
  href,
  className = "",
}: PageBackProps) {
  const router = useRouter();

  const baseClasses =
    "inline-flex items-center gap-1 text-sm text-neutral-600 hover:underline";

  // 没有 href：用按钮 + router.back()
  if (!href) {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back();
            } else {
              // 没有历史记录时兜底到首页（你之后也可以改成 /shop 等）
              router.push("/");
            }
          }}
          className={baseClasses}
        >
          <span aria-hidden="true">&larr;</span>
          <span>{label}</span>
        </button>
      </div>
    );
  }

  // 有 href：渲染为 Link
  return (
    <div className={className}>
      <Link href={href} className={baseClasses}>
        <span aria-hidden="true">&larr;</span>
        <span>{label}</span>
      </Link>
    </div>
  );
}
