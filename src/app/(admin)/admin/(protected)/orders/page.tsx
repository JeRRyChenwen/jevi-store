// src/app/(admin)/admin/(protected)/orders/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import type { ApiOrderRow, ApiResponse } from "./orders.types";
import { prettifyErrorMessage } from "./orders.utils";
import ShipOrderModal from "./_components/ShipOrderModal";
import OrdersFiltersBar from "./_components/OrdersFiltersBar";
import OrdersPagination from "./_components/OrdersPagination";
import OrdersTable from "./_components/OrdersTable";


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
        <OrdersTable
          loading={loading}
          rows={pagedRows}
          actionBtnBase={actionBtnBase}
          actionBtnWidth={actionBtnWidth}
          onOpenShip={openShip}
        />

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