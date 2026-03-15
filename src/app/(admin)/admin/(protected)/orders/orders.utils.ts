// src/app/(admin)/admin/(protected)/orders/orders.utils.ts

export function money(minor: number | null | undefined, currency: string | null | undefined) {
  const c = (currency || "AUD").toUpperCase();
  const v = typeof minor === "number" ? minor / 100 : 0;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: c }).format(v);
  } catch {
    return `${c} ${v.toFixed(2)}`;
  }
}

export function fmtEpochSecAsCN(ts: number | null | undefined) {
  if (!ts) return "—";
  const ms = ts * 1000;
  const d = new Date(ms);

  try {
    const parts = new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);

    const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
    const yyyy = get("year");
    const mm = get("month");
    const dd = get("day");
    const hh = get("hour");
    const mi = get("minute");
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  } catch {
    return d.toLocaleString();
  }
}

export function fmtWhen(cn: string | null | undefined, ts: number | null | undefined) {
  const s = (cn || "").trim();
  if (s) return s;
  return fmtEpochSecAsCN(ts);
}

export function prettifyErrorMessage(msg: string) {
  const s = (msg || "").trim();
  const lower = s.toLowerCase();
  if (!s) return "";
  if (lower.startsWith("request_failed_")) {
    const code = lower.replace("request_failed_", "");
    return `Request failed (${code}). Please try again.`;
  }
  if (lower === "forbidden") return "Forbidden. Please sign in again.";
  if (lower === "unauthorized") return "Unauthorized. Please sign in again.";
  return s;
}