"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import clsx from "clsx";

type BackButtonProps = {
  /** 手动指定按钮文案；不传则会自动生成 */
  label?: string;
  className?: string;

  /** 没有 history 时跳转到哪里 */
  fallbackHref?: string;

  /** 用于自动生成 “Back to …” 的目的地名称（强烈建议传） */
  fallbackLabel?: string;

  /** 外观风格：chip(推荐默认) / link(像面包屑) */
  variant?: "chip" | "link";
};

function defaultLabelFromFallback(fallbackHref?: string, fallbackLabel?: string) {
  if (fallbackLabel?.trim()) return "Back";
  if (!fallbackHref) return "Back";

  const last = fallbackHref
    .split("?")[0]
    .split("#")[0]
    .split("/")
    .filter(Boolean)
    .pop();

  if (!last) return "Back";

  const pretty = decodeURIComponent(last)
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return `Back to ${pretty}`;
}

export default function BackButton({
  label,
  className,
  fallbackHref = "/",
  fallbackLabel,
  variant = "chip",
}: BackButtonProps) {
  const router = useRouter();

  const computedLabel = React.useMemo(() => {
    if (label?.trim()) return label.trim();
    return defaultLabelFromFallback(fallbackHref, fallbackLabel);
  }, [label, fallbackHref, fallbackLabel]);

  const handleBack = React.useCallback(() => {
    if (typeof window === "undefined") return;

    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }, [router, fallbackHref]);

  const base = "inline-flex items-center gap-1.5 text-sm transition-colors";
  const focus =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

  const styles =
    variant === "chip"
      ? // ✅ 电商/后台都通用：像轻量“胶囊按钮”
        "rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-slate-700 shadow-sm backdrop-blur " +
        "hover:bg-white hover:border-slate-300 hover:text-slate-900 " +
        "active:translate-y-[1px] active:shadow-none"
      : // ✅ 面包屑/链接风格：更克制
        "text-slate-500 hover:text-slate-900";

  return (
    <button
      type="button"
      onClick={handleBack}
      className={clsx("group", base, focus, styles, className)}
      aria-label={computedLabel}
    >
      <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
      <span
        className={clsx(
            "font-medium",
            variant === "link" ? "hover:underline underline-offset-4" : ""
        )}
        >
        {computedLabel}
      </span>
    </button>
  );
}
