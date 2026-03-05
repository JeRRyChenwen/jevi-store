"use client";

import { useEffect, useMemo, useState } from "react";
import {
  formatForUser,
  formatForAdminAU,
  formatRelativeTime,
  formatDateOnly,
  formatShortDate,
} from "@/lib/datetime";

type CommonProps = {
  /** epoch 秒（UTC） */
  ts: number | null | undefined;
  /** ts 不存在时显示什么 */
  fallback?: string;
  /** 是否渲染为 <time dateTime="..."> 语义化标签 */
  asTimeTag?: boolean;
  /** 可选：title，鼠标 hover 显示 */
  title?: string;
  /** className 透传 */
  className?: string;
};

/**
 * ✅ UserTime：用户侧本地时间
 * - mounted 后再渲染，避免 SSR 时区不一致导致闪动/警告
 */
export function UserTime({
  ts,
  fallback = "-",
  asTimeTag = false,
  title,
  className,
}: CommonProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const text = useMemo(() => {
    if (!mounted) return fallback;
    if (typeof ts !== "number" || !Number.isFinite(ts)) return fallback;
    return formatForUser(ts);
  }, [mounted, ts, fallback]);

  const iso = useMemo(() => {
    if (typeof ts !== "number" || !Number.isFinite(ts)) return undefined;
    return new Date(ts * 1000).toISOString();
  }, [ts]);

  if (asTimeTag) {
    return (
      <time
        className={className}
        title={title}
        dateTime={iso}
        suppressHydrationWarning
      >
        {text}
      </time>
    );
  }

  return (
    <span className={className} title={title} suppressHydrationWarning>
      {text}
    </span>
  );
}

/**
 * ✅ AdminTimeAU：后台固定 Australia/Sydney + AEST/AEDT
 * - 也用 mounted 以保持一致（你可以去掉 mounted，但统一更省心）
 */
export function AdminTimeAU({
  ts,
  fallback = "-",
  asTimeTag = false,
  title,
  className,
}: CommonProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const text = useMemo(() => {
    if (!mounted) return fallback;
    if (typeof ts !== "number" || !Number.isFinite(ts)) return fallback;
    return formatForAdminAU(ts);
  }, [mounted, ts, fallback]);

  const iso = useMemo(() => {
    if (typeof ts !== "number" || !Number.isFinite(ts)) return undefined;
    return new Date(ts * 1000).toISOString();
  }, [ts]);

  if (asTimeTag) {
    return (
      <time
        className={className}
        title={title}
        dateTime={iso}
        suppressHydrationWarning
      >
        {text}
      </time>
    );
  }

  return (
    <span className={className} title={title} suppressHydrationWarning>
      {text}
    </span>
  );
}

/**
 * （可选）你如果想在某些地方显示相对时间：
 * <UserRelativeTime ts={...} />
 */
export function UserRelativeTime({
  ts,
  fallback = "-",
  className,
}: Pick<CommonProps, "ts" | "fallback" | "className">) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const text = useMemo(() => {
    if (!mounted) return fallback;
    if (typeof ts !== "number" || !Number.isFinite(ts)) return fallback;
    return formatRelativeTime(ts);
  }, [mounted, ts, fallback]);

  return (
    <span className={className} suppressHydrationWarning>
      {text}
    </span>
  );
}

/**
 * （可选）短日期/日期-only：用于列表更紧凑
 * 注意：短日期也建议 mounted 后再渲染，避免 SSR locale 差异
 */
export function UserShortDate({
  ts,
  fallback = "-",
  className,
}: Pick<CommonProps, "ts" | "fallback" | "className">) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const text = useMemo(() => {
    if (!mounted) return fallback;
    if (typeof ts !== "number" || !Number.isFinite(ts)) return fallback;
    return formatShortDate(ts);
  }, [mounted, ts, fallback]);

  return (
    <span className={className} suppressHydrationWarning>
      {text}
    </span>
  );
}

export function AdminAUDateOnly({
  ts,
  fallback = "-",
  className,
}: Pick<CommonProps, "ts" | "fallback" | "className">) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const text = useMemo(() => {
    if (!mounted) return fallback;
    if (typeof ts !== "number" || !Number.isFinite(ts)) return fallback;
    return formatDateOnly(ts, { timeZone: "Australia/Sydney", locale: "en-AU" });
  }, [mounted, ts, fallback]);

  return (
    <span className={className} suppressHydrationWarning>
      {text}
    </span>
  );
}