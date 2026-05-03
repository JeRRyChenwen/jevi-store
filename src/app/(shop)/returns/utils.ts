// src/app/(shop)/returns/utils.ts

import { mediaUrl } from "@/lib/strapi";
import type { StrapiImage, StrapiMediaRel } from "./types";

export function firstImageUrlFromRel(rel?: StrapiMediaRel): string | null {
  if (!rel) return null;

  // { data: [{ attributes: { url } }] }
  const data = (rel as any)?.data;
  if (Array.isArray(data) && data.length) {
    const a: StrapiImage | undefined = data[0]?.attributes;
    const raw = a?.formats?.thumbnail?.url || a?.url || null;
    return raw ? mediaUrl(raw) : null;
  }

  // 扁平数组：[{ attributes: { url } }] / [{ url }]
  if (Array.isArray(rel) && rel.length) {
    const a: StrapiImage | undefined = rel[0]?.attributes ?? rel[0];
    const raw = a?.formats?.thumbnail?.url || a?.url || null;
    return raw ? mediaUrl(raw) : null;
  }

  // 单对象：{ url } / { attributes: { url } }
  const a3: StrapiImage | undefined = (rel as any)?.attributes ?? (rel as any);
  const raw = a3?.formats?.thumbnail?.url || a3?.url || null;
  return raw ? mediaUrl(raw) : null;
}

export function fmtMoney(minor: number, currency: string | null) {
  const code = String(currency || "").trim().toUpperCase() || "AUD";
  const major = (minor || 0) / 100;
  const num = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(major);
  return `${code} ${num}`;
}

// ✅ 用于排序：把 "2025-12-20 18:51:57" 这种 cn 时间转为可比较的时间戳
export function toTsFromCn(s?: string | null) {
  if (!s) return 0;
  const x = String(s).trim();
  if (!x) return 0;
  const iso = x.includes(" ") ? x.replace(" ", "T") : x;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

/** ✅ 后端 error code -> 用户可读文案（保持你原来 wording，不改业务含义）
 *  重要：如果传进来的已经是“人话”，就原样返回，不要被兜底吞掉
 */
export function mapReturnError(raw: string) {
  const e = String(raw || "").trim();

  if (!e) return "Something went wrong. Please try again.";

  if (e === "item_already_returned") {
    return (
      "This item has already been returned and approved (completed). " +
      "You cannot submit another return request for an item that has been successfully returned."
    );
  }

  if (e === "duplicate_return_request") {
    return (
      "A return request that includes this item has already been submitted and is currently pending or under review. " +
      "Please wait for our team to review the existing request. If the request is rejected, you may submit again."
    );
  }

  if (e === "return_qty_exceeds_available") {
    return (
      "The quantity you selected is higher than the remaining quantity available for return. " +
      "Please refresh the order details and choose only the items that are still eligible to be returned."
    );
  }

  if (e === "qty_exceeds_original") {
    return "The return quantity cannot be greater than the quantity originally purchased.";
  }

  if (e === "invalid_items") {
    return "Please choose at least one valid item to return.";
  }

  if (e === "order_items_mismatch") {
    return "One or more selected items do not belong to this order. Please refresh and try again.";
  }

  // ✅ NEW: 如果 e 不是我们认识的 error code，大概率它已经是“用户可读文案”
  // 比如 lookup 场景里：showError(mapLookupError(...)) 传进来的就是一句完整的英文提示
  return e;
}

/** ✅ NEW：Lookup（order_number + email）错误码 -> 用户友好提示（安全：不泄露哪项错） */
export function mapLookupError(raw: string, retryAfterSec?: number) {
  const e = String(raw || "").trim().toLowerCase();

  // ✅ 安全：统一“查不到匹配订单”，不要暴露是 email 不对还是 order 不对
  if (
    e === "not_found" ||
    e === "order_not_found" ||
    e === "email_mismatch" ||
    e === "no_match"
  ) {
    return (
      "We couldn’t find an order that matches those details. " +
      "Please double-check your order number and the email used at checkout, then try again."
    );
  }

  if (e === "missing_order_number" || e === "missing_email" || e === "missing_input") {
    return "Please enter both your order number and the email used for this order.";
  }

  if (e === "invalid_email") {
    return "Please enter a valid email address.";
  }

  if (e === "rate_limited" || e === "too_many_requests" || e === "429") {
    const s = Number(retryAfterSec || 0);
    if (Number.isFinite(s) && s > 0) {
      return `Too many attempts. Please wait ${s} seconds and try again.`;
    }
    return "Too many attempts. Please wait a moment and try again.";
  }

  // fallback：不要把原始 error code 直接展示给用户
  return "Unable to find your order right now. Please try again in a moment.";
}

/** ✅ NEW：用于排序 Order 号（order_number 可能是 SP20260121-000003 这种） */
export function cmpText(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export function isAllowedImage(file: File) {
  const t = (file.type || "").toLowerCase();
  return (
    t === "image/png" ||
    t === "image/jpeg" ||
    t === "image/jpg" ||
    t === "image/webp" ||
    t === "image/gif"
  );
}