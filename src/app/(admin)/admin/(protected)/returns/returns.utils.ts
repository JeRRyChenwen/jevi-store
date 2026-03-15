import type { ApiReturnRow } from "./returns.types";

export function formatCreatedAt(r: ApiReturnRow) {
  if (r.created_at_cn) return r.created_at_cn;
  if (r.created_at) return r.created_at;

  if (typeof r.created_at_ts === "number" && Number.isFinite(r.created_at_ts)) {
    const d = new Date(r.created_at_ts * 1000);
    return d.toISOString().slice(0, 16).replace("T", " ");
  }

  return "—";
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
  if (lower === "internal_error") return "Server error. Please try again later.";

  return s;
}

export async function safeReadJson<T = any>(r: Response): Promise<T> {
  const text = await r.text();
  if (!text) return {} as any;

  try {
    return JSON.parse(text) as T;
  } catch {
    const head = text.slice(0, 200).replace(/\s+/g, " ").trim();
    throw new Error(
      `Non-JSON response (status=${r.status}). Body starts with: ${head}`
    );
  }
}