"use client";

import React, { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";

type StatsResp =
  | {
      ok: true;
      rows: number;
      in_stock_rows: number;
      total_stock: number;
      worker_version?: string;
    }
  | { ok: false; error: string; [k: string]: any };

type SyncResp =
  | {
      ok: true;
      fetched: number;
      upserted: number;
      pageSize: number;
      ms: number;
      worker_version?: string;
    }
  | { ok: false; error: string; [k: string]: any };

export default function InventoryPage() {
  const [stats, setStats] = useState<StatsResp | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResp | null>(null);

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const pageSize = 100;

  // ================= stats =================
  const fetchStats = async () => {
    setLoading(true);
    setError("");

    try {
      const r = await fetch("/api/admin/inventory/stats", { cache: "no-store" });
      const j = await r.json();
      setStats(j);
    } catch (e: any) {
      setError(e?.message || "Failed to load stats");
    } finally {
      setLoading(false);
    }
  };

  // ================= sync =================
  const doSync = async () => {
    setSyncing(true);
    setError("");
    setSyncResult(null);

    try {
      const r = await fetch("/api/admin/inventory/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pageSize }),
        cache: "no-store",
      });

      const j = await r.json();
      setSyncResult(j);

      if (!j?.ok) {
        setError(j?.error ? `Sync failed: ${j.error}` : "Sync failed");
        return;
      }

      await fetchStats();
    } catch (e: any) {
      setError(e?.message || "Sync error");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const rows = (stats as any)?.rows ?? 0;
  const inStockRows = (stats as any)?.in_stock_rows ?? 0;
  const totalStock = (stats as any)?.total_stock ?? 0;

  return (
    <div className="space-y-4">
      {/* Header (对齐 Returns 的 header 布局) */}
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Inventory</h2>
          <p className="mt-1 text-sm text-slate-600">
            Sync all product variants stock from Strapi → D1 inventory.
          </p>
        </div>

        {/* Actions (风格对齐 Returns 的 select / 控件) */}
        <div className="flex items-center gap-2">
          <button
            onClick={fetchStats}
            disabled={loading || syncing}
            className="rounded-md border bg-white px-3 py-2 text-sm outline-none hover:bg-slate-50 focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh stats"}
          </button>

          <button
            onClick={() => {
              setError("");
              setSyncResult(null);
              setShowConfirm(true);
            }}
            disabled={syncing}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white outline-none hover:bg-slate-800 focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
          >
            {syncing ? "Syncing..." : "Sync from Strapi"}
          </button>
        </div>
      </div>

      {/* Error (统一 Alert 用法) */}
      {error ? (
        <Alert variant="error" className="border p-3 text-sm">
          {error}
        </Alert>
      ) : null}

      {/* Confirm (替代浏览器弹窗，统一 Alert 用法) */}
      {showConfirm ? (
        <Alert variant="warning" className="border p-3 text-sm">
          <div className="font-medium">Confirm inventory sync</div>
          <div className="mt-1 text-slate-700">
            This will pull ALL variants from Strapi and upsert stock into D1 inventory by SKU.
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={async () => {
                setShowConfirm(false);
                await doSync();
              }}
              disabled={syncing}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
            >
              Confirm
            </button>

            <button
              onClick={() => setShowConfirm(false)}
              disabled={syncing}
              className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </Alert>
      ) : null}

      {/* Stats cards (完全对齐 Dashboard 样式) */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <div className="text-xs text-slate-500">Total SKUs</div>
          <div className="mt-2 text-2xl font-bold">{rows}</div>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <div className="text-xs text-slate-500">In Stock SKUs</div>
          <div className="mt-2 text-2xl font-bold">{inStockRows}</div>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <div className="text-xs text-slate-500">Total Stock</div>
          <div className="mt-2 text-2xl font-bold">{totalStock}</div>
        </div>
      </div>

      {/* Success */}
      {syncResult && (syncResult as any).ok ? (
        <Alert variant="success" className="border p-3 text-sm">
          Sync success — fetched {(syncResult as any).fetched}, upserted{" "}
          {(syncResult as any).upserted}, time {(syncResult as any).ms} ms.
        </Alert>
      ) : null}
    </div>
  );
}
