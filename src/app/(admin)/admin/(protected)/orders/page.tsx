// src/app/(admin)/admin/(protected)/orders/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";

import type { ApiOrderRow, ApiResponse } from "./orders.types";
import { money, fmtWhen, prettifyErrorMessage } from "./orders.utils";
import StatusPill from "./_components/StatusPill";
import ShipOrderModal from "./_components/ShipOrderModal";
import OrdersFiltersBar from "./_components/OrdersFiltersBar";
import OrdersPagination from "./_components/OrdersPagination";


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
    setTrackingNumber("");
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

        <OrdersFiltersBar
          status={status}
          setStatus={setStatus}
          q={q}
          setQ={setQ}
          setPage={setPage}
          loading={loading}
          submitting={submitting}
          onRefresh={fetchAllOnce}
        />
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

        <OrdersPagination
          total={total}
          page={page}
          pageCount={pageCount}
          loading={loading}
          setPage={setPage}
        />
      </div>

      <ShipOrderModal
        open={shipOpen}
        order={shipOrder}
        carrier={carrier}
        trackingNumber={trackingNumber}
        trackingUrl={trackingUrl}
        submitting={submitting}
        canShip={canShip}
        onClose={closeShip}
        onSubmit={submitShip}
        setCarrier={setCarrier}
        setTrackingNumber={setTrackingNumber}
        setTrackingUrl={setTrackingUrl}
      />
    </div>
  );
}