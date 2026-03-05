// src/app/(admin)/admin/(protected)/orders/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";

type ApiOrderRow = {
  id: number;
  order_number?: string | null;
  status?: string | null;

  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;

  currency?: string | null;
  items_total_minor?: number | null;
  delivery_fee_minor?: number | null;
  grand_total_minor?: number | null;

  carrier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;

  // ===== 你 worker 现在返回的 epoch 秒（旧/兼容）=====
  created_at_ts?: number | null;
  shipped_at_ts?: number | null;
  shipment_email_sent_at_ts?: number | null;

  // ===== ✅ NEW: 优先使用 D1 中的 cn 文本时间（如果 worker 已返回/未来会返回）=====
  created_at_cn?: string | null;
  shipped_at_cn?: string | null;
  shipment_email_sent_at_cn?: string | null;

  // （可选）如果你还有这些字段，也可以顺便展示
  paid_at_ts?: number | null;
  paid_at_cn?: string | null;
};

type ApiResponse = {
  ok: boolean;
  orders?: ApiOrderRow[];
  page?: number;
  page_size?: number;
  total?: number;
  error?: string;
};

function money(minor: number | null | undefined, currency: string | null | undefined) {
  const c = (currency || "AUD").toUpperCase();
  const v = typeof minor === "number" ? minor / 100 : 0;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: c }).format(v);
  } catch {
    return `${c} ${v.toFixed(2)}`;
  }
}

/**
 * ✅ 不要用 toISOString()（永远 UTC）
 * 这里统一用 Asia/Shanghai（你说的 cn 时间）
 */
function fmtEpochSecAsCN(ts: number | null | undefined) {
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

    // 组装成：YYYY-MM-DD HH:mm
    const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
    const yyyy = get("year");
    const mm = get("month");
    const dd = get("day");
    const hh = get("hour");
    const mi = get("minute");
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  } catch {
    // fallback：本地时间（不推荐，但兜底）
    return d.toLocaleString();
  }
}

/**
 * ✅ 优先显示 *_at_cn（来自 D1/worker 已计算好的展示字段）
 * 如果没有，再 fallback 到 *_at_ts（epoch 秒 → CN）
 */
function fmtWhen(cn: string | null | undefined, ts: number | null | undefined) {
  const s = (cn || "").trim();
  if (s) return s;
  return fmtEpochSecAsCN(ts);
}

function StatusPill({ value }: { value: string }) {
  const s = (value || "").toLowerCase();
  const styles: Record<string, string> = {
    paid: "bg-blue-100 text-blue-700",
    shipped: "bg-green-100 text-green-700",
    cancelled: "bg-slate-200 text-slate-600",
    failed: "bg-red-100 text-red-700",
    pending: "bg-slate-100 text-slate-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
        styles[s] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {s || "unknown"}
    </span>
  );
}

function prettifyErrorMessage(msg: string) {
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

export default function AdminOrdersPage() {
  const [status, setStatus] = useState<string>(""); // "" = all
  const [q, setQ] = useState<string>("");

  const [page, setPage] = useState<number>(1);
  const pageSize = 20;

  const [rows, setRows] = useState<ApiOrderRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // ---------- ship modal ----------
  const [shipOpen, setShipOpen] = useState(false);
  const [shipOrder, setShipOrder] = useState<ApiOrderRow | null>(null);
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canShip = useMemo(() => trackingNumber.trim().length > 0, [trackingNumber]);

  const actionBtnBase =
  "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed";

  const actionBtnWidth = "min-w-[120px]"; 

  async function fetchAllOnce() {
    setLoading(true);
    setError("");

    try {
      const all: ApiOrderRow[] = [];
      const serverPageSize = 200; // 你 worker 里 page_size 最大 200
      let p = 1;

      while (true) {
        const sp = new URLSearchParams();
        sp.set("page", String(p));
        sp.set("page_size", String(serverPageSize));

        const r = await fetch(`/api/admin/orders?${sp.toString()}`, {
          method: "GET",
          cache: "no-store",
          credentials: "include",
          headers: { "content-type": "application/json" },
        });

        if (r.status === 401) {
          const next = `/admin/orders`;
          window.location.href = `/admin/login?next=${encodeURIComponent(next)}`;
          return;
        }

        const data = (await r.json()) as ApiResponse;

        if (!r.ok || !data.ok) {
          throw new Error(data.error || `request_failed_${r.status}`);
        }

        const pageRows = Array.isArray(data.orders) ? data.orders : [];
        all.push(...pageRows);

        if (pageRows.length < serverPageSize) break;
        p += 1;
        if (p > 200) break; // safety
      }

      setRows(all);
      setPage(1);
    } catch (e: any) {
      setError(String(e?.message || e));
      setRows([]);
      setPage(1);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAllOnce();
  }, []);

  const prettyError = useMemo(() => prettifyErrorMessage(error), [error]);

  // ---------- local filter/search ----------
  const filteredRows = useMemo(() => {
    const s = status.trim().toLowerCase();
    const qq = q.trim().toLowerCase();

    return rows.filter((r) => {
      if (s) {
        const st = String(r.status || "").toLowerCase();
        if (st !== s) return false;
      }

      if (qq) {
        const hay = [
          r.order_number,
          r.email,
          r.first_name,
          r.last_name,
          r.tracking_number,
          String(r.id),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!hay.includes(qq)) return false;
      }

      return true;
    });
  }, [rows, status, q]);

  // ---------- local pagination ----------
  const total = filteredRows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const pagedRows = useMemo(() => {
    const safePage = Math.min(Math.max(1, page), pageCount);
    const start = (safePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageCount]);

  function openShip(o: ApiOrderRow) {
  // 已 shipped → 禁止再点
  const st = String(o.status || "").toLowerCase();
  if (st === "shipped") {
    console.log("[ship blocked] already shipped:", o.id);
    return;
  }

  setShipOrder(o);
  setCarrier("");
  setTrackingUrl("");   
  setShipOpen(true);
}

  function closeShip() {
    setShipOpen(false);
    setShipOrder(null);
    setCarrier("");
    setTrackingNumber("");
    setTrackingUrl("");
  }

  async function submitShip() {
    if (!shipOrder) return;
    if (!canShip) return;

    setSubmitting(true);
    setError("");

    try {
      const r = await fetch(`/api/admin/orders/${shipOrder.id}/shipment`, {
        method: "PATCH",
        cache: "no-store",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          carrier: carrier.trim() || null,
          tracking_number: trackingNumber.trim(),
          tracking_url: trackingUrl.trim() || null,
        }),
      });

      if (r.status === 401) {
        const next = `/admin/orders`;
        window.location.href = `/admin/login?next=${encodeURIComponent(next)}`;
        return;
      }

      const data = await r.json().catch(() => ({} as any));
      if (!r.ok || !data?.ok) {
        throw new Error(data?.error || `request_failed_${r.status}`);
      }

      closeShip();
      await fetchAllOnce();
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header (对齐 Returns / Inventory) */}
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Orders</h2>
          <p className="mt-1 text-sm text-slate-600">
            View orders and mark them as shipped (carrier + tracking). Shipment email will be sent by cron.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">Status</label>
            <select
              className="rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="paid">paid</option>
              <option value="shipped">shipped</option>
              <option value="cancelled">cancelled</option>
              <option value="failed">failed</option>
            </select>
          </div>

          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search id / order no / email / name / tracking"
            className="rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200 md:w-72"
          />

          <button
            onClick={fetchAllOnce}
            disabled={loading || submitting}
            className="rounded-md border bg-white px-3 py-2 text-sm outline-none hover:bg-slate-50 focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Unified Error */}
      {prettyError ? (
        <Alert variant="error" className="border p-3 text-sm">
          {prettyError}
        </Alert>
      ) : null}

      {/* Table */}
      <div className="rounded-lg border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Order number</th>
                <th className="px-4 py-3">Customer name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Created at</th>
                <th className="px-4 py-3">Shipped</th>
                <th className="px-4 py-3">Tracking</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-slate-500" colSpan={10}>
                    Loading…
                  </td>
                </tr>
              ) : pagedRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-slate-500" colSpan={10}>
                    No orders.
                  </td>
                </tr>
              ) : (
                pagedRows.map((o) => {
                  const fullName = `${o.first_name || ""} ${o.last_name || ""}`.trim() || "—";
                  const st = String(o.status || "").toLowerCase();
                  const isShipped = st === "shipped";
                  const totalText = money(o.grand_total_minor ?? 0, o.currency ?? "AUD");

                  // ✅ 关键：这里改为优先 *_cn
                  const createdText = fmtWhen(o.created_at_cn, o.created_at_ts);
                  const shippedText = fmtWhen(o.shipped_at_cn, o.shipped_at_ts);

                  return (
                    <tr key={o.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3 font-mono">{o.id}</td>
                      <td className="px-4 py-3 font-mono">{o.order_number || "—"}</td>
                      <td className="px-4 py-3">{fullName}</td>
                      <td className="px-4 py-3">{o.email || "—"}</td>
                      <td className="px-4 py-3">
                        <StatusPill value={st} />
                      </td>
                      <td className="px-4 py-3">{totalText}</td>
                      <td className="px-4 py-3 text-slate-600">{createdText}</td>
                      <td className="px-4 py-3 text-slate-600">{shippedText}</td>
                      <td className="px-4 py-3">
                        {o.tracking_number ? (
                          <div className="flex flex-col gap-1">
                            <span className="font-mono text-xs">{o.tracking_number}</span>
                            {o.tracking_url ? (
                              <a
                                className="text-blue-600 hover:underline text-xs"
                                href={o.tracking_url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Track
                              </a>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openShip(o)}
                          disabled={isShipped}
                          className={[
                            actionBtnBase,
                            actionBtnWidth,
                            isShipped
                              ? "bg-slate-200 text-slate-600"
                              : "bg-slate-900 text-white hover:bg-slate-800",
                          ].join(" ")}
                        >
                          {isShipped ? "Shipped" : "Mark shipped"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 text-xs text-slate-600">
          <div>
            Total: <span className="font-medium">{total}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="rounded border bg-white px-2 py-1 disabled:opacity-50"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>

            <span>
              Page <span className="font-medium">{Math.min(page, pageCount)}</span> / {pageCount}
            </span>

            <button
              className="rounded border bg-white px-2 py-1 disabled:opacity-50"
              disabled={page >= pageCount || loading}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Ship Modal */}
      {shipOpen && shipOrder ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeShip}
        >
          <div
            className="w-full max-w-lg rounded-lg border bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold">Mark shipped</div>
                <div className="mt-1 text-xs text-slate-600">
                  Order:{" "}
                  <span className="font-mono">
                    {shipOrder.order_number || `#${shipOrder.id}`}
                  </span>
                </div>
              </div>

              <button
                onClick={closeShip}
                className="rounded-md border bg-white px-2 py-1 text-sm hover:bg-slate-50"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-slate-500">Carrier (optional)</label>
                <input
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  placeholder="auspost / dhl / ups"
                  className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500">Tracking number (required)</label>
                <input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. TEST123456AU"
                  className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500">Tracking link (optional)</label>
                <input
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="https://..."
                  className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={closeShip}
                  disabled={submitting}
                  className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  onClick={submitShip}
                  disabled={!canShip || submitting}
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {submitting ? "Submitting..." : "Confirm shipped"}
                </button>
              </div>

              <div className="text-xs text-slate-500">
                Note: Shipment email is sent by worker cron after status becomes shipped.
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}