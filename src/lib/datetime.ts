// src/lib/datetime.ts

/** 后台固定澳洲时区（会自动在 AEST/AEDT 间切换） */
export const AU_TZ = "Australia/Sydney";

/**
 * 统一：我们数据库里的 *_ts 是 UTC epoch 秒（seconds）。
 * 前端展示时：
 * - 用户侧：不传 timeZone => 浏览器本地时区（自动 DST）
 * - 后台：timeZone = Australia/Sydney（自动 DST，且可显示 AEST/AEDT）
 */

type FormatOpts = {
  /** Intl locale；不传则使用浏览器默认 */
  locale?: string;
  /** IANA timezone；不传则使用浏览器本地时区 */
  timeZone?: string;
  /** 是否显示时区缩写（如 AEDT/AEST） */
  withTzAbbr?: boolean;
  /** 是否显示秒 */
  withSeconds?: boolean;
};

/** ---------- 基础：安全检查 ---------- */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/**
 * 迁移辅助：把各种“可能的时间输入”转为 epoch 秒
 * - number: 可能是秒 / 可能是毫秒（会自动判断）
 * - string: 纯数字按 number 处理；其他字符串尝试 Date.parse
 * - null/undefined => null
 */
export function parseEpochSecFromAny(v: unknown): number | null {
  if (v == null) return null;

  // number
  if (isFiniteNumber(v)) {
    // 粗略判断：> 1e12 大概率是毫秒
    if (v > 1e12) return Math.floor(v / 1000);
    // 1e9~1e11 通常是秒（epoch 秒在 2001-5138 之间大概 1e9~1e11）
    return Math.floor(v);
  }

  // numeric string
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;

    if (/^\d+$/.test(s)) {
      const n = Number(s);
      return parseEpochSecFromAny(n);
    }

    // ISO / RFC / 其他日期字符串：Date.parse 返回毫秒
    const ms = Date.parse(s);
    if (Number.isFinite(ms)) return Math.floor(ms / 1000);

    return null;
  }

  return null;
}

/** ---------- 核心格式化：epoch 秒 -> DateTime string ---------- */

/**
 * 输出统一格式：YYYY-MM-DD HH:mm[:ss] [TZ]
 * - 不依赖 locale 的月/日顺序，直接从 formatToParts 拿 year/month/day/hour/minute/second
 */
export function formatEpochSec(
  ts?: number | null,
  opts: FormatOpts = {}
): string {
  if (!isFiniteNumber(ts)) return "";

  const d = new Date(ts * 1000);

  const locale = opts.locale; // undefined => 浏览器默认
  const timeZone = opts.timeZone; // undefined => 浏览器本地
  const withTzAbbr = !!opts.withTzAbbr;
  const withSeconds = !!opts.withSeconds;

  const fmt = new Intl.DateTimeFormat(locale, {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" as const } : null),
    hour12: false,
    ...(withTzAbbr ? { timeZoneName: "short" as const } : null),
  });

  const parts = fmt.formatToParts(d);
  const get = (t: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === t)?.value || "";

  const yyyy = get("year");
  const mm = get("month");
  const dd = get("day");
  const hh = get("hour");
  const mi = get("minute");
  const ss = withSeconds ? get("second") : "";
  const tz = withTzAbbr ? get("timeZoneName") : "";

  const base = withSeconds
    ? `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`
    : `${yyyy}-${mm}-${dd} ${hh}:${mi}`;

  return tz ? `${base} ${tz}` : base;
}

/** ---------- 业务层封装：你真正应该在页面里用这些 ---------- */

/** 用户侧：浏览器本地时区（自动 DST） */
export function formatForUser(ts?: number | null): string {
  return formatEpochSec(ts, { locale: undefined });
}

/** 后台：固定 Australia/Sydney，并显示 AEST/AEDT */
export function formatForAdminAU(ts?: number | null): string {
  return formatEpochSec(ts, {
    locale: "en-AU",
    timeZone: AU_TZ,
    withTzAbbr: true,
  });
}

/** 更语义化的别名（可选用） */
export const formatUserDateTime = formatForUser;
export const formatAdminAUDateTime = formatForAdminAU;

/** ---------- 常用“短格式” ---------- */

/** 只有日期：YYYY-MM-DD（按指定时区/本地时区） */
export function formatDateOnly(
  ts?: number | null,
  opts: { locale?: string; timeZone?: string } = {}
): string {
  if (!isFiniteNumber(ts)) return "";
  const d = new Date(ts * 1000);

  const fmt = new Intl.DateTimeFormat(opts.locale, {
    timeZone: opts.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = fmt.formatToParts(d);
  const get = (t: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === t)?.value || "";

  const yyyy = get("year");
  const mm = get("month");
  const dd = get("day");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * 短日期（列表用）：
 * - 默认：MMM d, yyyy（en-AU / 浏览器默认）
 * - 可指定 timeZone（比如 AU_TZ）
 */
export function formatShortDate(
  ts?: number | null,
  opts: { locale?: string; timeZone?: string } = {}
): string {
  if (!isFiniteNumber(ts)) return "";
  const d = new Date(ts * 1000);

  return new Intl.DateTimeFormat(opts.locale ?? undefined, {
    timeZone: opts.timeZone,
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d);
}

/** ---------- 相对时间：x minutes ago / in 2 days ---------- */

type RelativeOpts = {
  /** 以哪个“现在”做对比：默认 Date.now() */
  nowTs?: number; // epoch 秒
  /** locale：默认浏览器 */
  locale?: string;
  /** 允许显示 “刚刚” 的阈值（秒） */
  justNowThresholdSec?: number; // default 45
};

/**
 * formatRelativeTime( ts ) 例子：
 * - "just now"
 * - "3 min ago"
 * - "in 2 hours"
 * - "5 days ago"
 *
 * 注意：这是“用户侧”体验函数，默认用浏览器 locale。
 */
export function formatRelativeTime(
  ts?: number | null,
  opts: RelativeOpts = {}
): string {
  if (!isFiniteNumber(ts)) return "";

  const nowSec = isFiniteNumber(opts.nowTs) ? opts.nowTs : Math.floor(Date.now() / 1000);
  const diffSec = ts - nowSec; // future => positive
  const abs = Math.abs(diffSec);

  const justNowThreshold = isFiniteNumber(opts.justNowThresholdSec)
    ? opts.justNowThresholdSec
    : 45;

  if (abs <= justNowThreshold) return "just now";

  // 选单位：秒/分/小时/天/周/月/年
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];

  for (const [unit, secPerUnit] of units) {
    if (abs >= secPerUnit) {
      const value = Math.round(diffSec / secPerUnit);
      // Intl.RelativeTimeFormat 会输出更自然的语言（依据 locale）
      const rtf = new Intl.RelativeTimeFormat(opts.locale ?? undefined, {
        numeric: "always",
        style: "short",
      });
      return rtf.format(value, unit);
    }
  }

  // fallback：少于 1 分钟但超过阈值
  const rtf = new Intl.RelativeTimeFormat(opts.locale ?? undefined, {
    numeric: "always",
    style: "short",
  });
  return rtf.format(Math.round(diffSec), "second");
}

/** ---------- 便捷：后台常用的“日期-only（澳洲）” ---------- */
export function formatAdminAUDateOnly(ts?: number | null): string {
  return formatDateOnly(ts, { locale: "en-AU", timeZone: AU_TZ });
}