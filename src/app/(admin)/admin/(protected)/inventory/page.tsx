"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";

type StorefrontCode = "AU" | "NZ" | "EU" | "US" | "CA";
type SyncScope = "all" | "sku_list";

type StatsResp =
  | {
      ok: true;
      rows: number;
      in_stock_rows: number;
      total_stock: number;
      market_code?: string;
      warehouse_code?: string;
      worker_version?: string;
    }
  | { ok: false; error: string; [k: string]: any };

type SyncResp =
  | {
      ok: true;
      fetched: number;
      upserted: number;
      pageSize?: number;
      ms: number;
      market_code?: string;
      warehouse_code?: string;
      scope?: SyncScope;
      matched_skus?: number;
      requested_skus?: number;
      missing_skus?: string[];
      worker_version?: string;
    }
  | { ok: false; error: string; [k: string]: any };

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
  if (lower === "internal_error") return "Server error. Please try again later.";
  if (lower === "missing_skus") return "Please enter at least one SKU.";
  if (lower === "bad_market_code") return "Invalid market code.";
  if (lower === "server_error") return "Server error. Please try again later.";

  return s;
}

async function safeReadJson<T = any>(r: Response): Promise<T> {
  const text = await r.text();
  if (!text) return {} as any;

  try {
    return JSON.parse(text) as T;
  } catch {
    const head = text.slice(0, 200).replace(/\s+/g, " ").trim();
    throw new Error(`Non-JSON response (status=${r.status}). Body starts with: ${head}`);
  }
}

function normalizeSkuInput(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const part of raw.split(/[\n,\s]+/g)) {
    const sku = String(part || "").trim();
    if (!sku) continue;
    if (seen.has(sku)) continue;
    seen.add(sku);
    out.push(sku);
  }

  return out;
}

export default function InventoryPage() {
  const [stats, setStats] = useState<StatsResp | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResp | null>(null);

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const [storefrontCode, setStorefrontCode] = useState<StorefrontCode>("AU");
  const [scope, setScope] = useState<SyncScope>("all");
  const [skuText, setSkuText] = useState("");

  const pageSize = 100;

  const parsedSkus = useMemo(() => normalizeSkuInput(skuText), [skuText]);

  // ================= stats =================
  const fetchStats = async (nextStorefrontCode: StorefrontCode = storefrontCode) => {
    setLoading(true);
    setError("");

    try {
      const qs = new URLSearchParams({ storefrontCode: nextStorefrontCode }).toString();
      const r = await fetch(`/api/admin/inventory/stats?${qs}`, {
        method: "GET",
        cache: "no-store",
        credentials: "include",
        headers: { "content-type": "application/json" },
      });

      if (r.status === 401) {
        const next = `/admin/inventory`;
        window.location.href = `/admin/login?next=${encodeURIComponent(next)}`;
        return;
      }

      const j = await safeReadJson<StatsResp>(r);
      if (!r.ok || !(j as any)?.ok) {
        const err = (j as any)?.error || `request_failed_${r.status}`;
        throw new Error(err);
      }

      setStats(j);
    } catch (e: any) {
      setError(String(e?.message || e || "Failed to load stats"));
      setStats(null);
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
      if (scope === "sku_list" && parsedSkus.length === 0) {
        throw new Error("missing_skus");
      }

      const payload =
        scope === "sku_list"
          ? {
              storefrontCode,
              scope,
              skus: parsedSkus,
              pageSize,
            }
          : {
              storefrontCode,
              scope,
              pageSize,
            };

      const r = await fetch("/api/admin/inventory/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
        credentials: "include",
      });

      if (r.status === 401) {
        const next = `/admin/inventory`;
        window.location.href = `/admin/login?next=${encodeURIComponent(next)}`;
        return;
      }

      const j = await safeReadJson<SyncResp>(r);
      setSyncResult(j);

      if (!r.ok || !(j as any)?.ok) {
        const err = (j as any)?.error || `request_failed_${r.status}`;
        throw new Error(err);
      }

      await fetchStats(storefrontCode);
    } catch (e: any) {
      setError(String(e?.message || e || "Sync error"));
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchStats(storefrontCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storefrontCode]);

  const rows = (stats as any)?.rows ?? 0;
  const inStockRows = (stats as any)?.in_stock_rows ?? 0;
  const totalStock = (stats as any)?.total_stock ?? 0;
  const currentStorefrontCode =
    (stats as any)?.storefront_code ||
    (syncResult as any)?.storefront_code ||
    storefrontCode;
  const currentWarehouseCode =
    (stats as any)?.warehouse_code || (syncResult as any)?.warehouse_code || "Unknown";

  const prettyError = useMemo(() => prettifyErrorMessage(error), [error]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Inventory</h2>
          <p className="mt-1 text-sm text-slate-600">
            Sync Strapi product variants into D1 inventory for a selected market.
          </p>

          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="rounded-full border bg-slate-50 px-2 py-1">
              Current storefront: {currentStorefrontCode}
            </span>
            <span className="rounded-full border bg-slate-50 px-2 py-1">
              Current warehouse: {currentWarehouseCode}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchStats(storefrontCode)}
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

      {prettyError ? (
        <Alert variant="error" className="border p-3 text-sm">
          {prettyError}
        </Alert>
      ) : null}

      <div className="rounded-lg border bg-white p-4 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Target storefront
            </label>
            <select
              value={storefrontCode}
              onChange={(e) => setStorefrontCode(e.target.value as StorefrontCode)}
              disabled={loading || syncing}
              className="w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
            >
              <option value="AU">AU</option>
              <option value="NZ">NZ</option>
              <option value="EU">EU</option>
              <option value="US">US</option>
              <option value="CA">CA</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Sync scope
            </label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as SyncScope)}
              disabled={loading || syncing}
              className="w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
            >
              <option value="all">All variants in Strapi</option>
              <option value="sku_list">Selected SKU list</option>
            </select>
          </div>
        </div>

        {scope === "sku_list" ? (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              SKU list
            </label>
            <textarea
              value={skuText}
              onChange={(e) => setSkuText(e.target.value)}
              rows={6}
              placeholder={"SKU-001\nSKU-002\nSKU-003"}
              disabled={syncing}
              className="w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
            />
            <div className="mt-2 text-xs text-slate-500">
              Separate SKUs by comma, space, or new line. Parsed SKUs: {parsedSkus.length}
            </div>
          </div>
        ) : null}
      </div>

      {showConfirm ? (
        <Alert variant="warning" className="border p-3 text-sm">
          <div className="font-medium">Confirm inventory sync</div>
          <div className="mt-1 text-slate-700">
            {scope === "all"
              ? `This will pull product variants from Strapi and upsert inventory records for storefront ${storefrontCode}.`
              : `This will upsert ${parsedSkus.length} requested SKU(s) into storefront ${storefrontCode}.`}
          </div>

          {scope === "sku_list" ? (
            <div className="mt-2 text-xs text-slate-600">
              Requested SKUs: {parsedSkus.join(", ") || "None"}
            </div>
          ) : null}

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

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <div className="text-xs text-slate-500">Active SKUs in Selected Storefront</div>
          <div className="mt-2 text-2xl font-bold">{rows}</div>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <div className="text-xs text-slate-500">In-Stock SKUs in Selected Storefront</div>
          <div className="mt-2 text-2xl font-bold">{inStockRows}</div>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <div className="text-xs text-slate-500">Total Available Units in Selected Storefront</div>
          <div className="mt-2 text-2xl font-bold">{totalStock}</div>
        </div>
      </div>

      {syncResult && (syncResult as any).ok ? (
        <Alert variant="success" className="border p-3 text-sm">
          <div>
            Sync success — storefront {(syncResult as any).storefront_code || currentStorefrontCode} /
            warehouse {(syncResult as any).warehouse_code || currentWarehouseCode}, fetched{" "}
            {(syncResult as any).fetched}, matched{" "}
            {(syncResult as any).matched_skus ?? "-"}, upserted{" "}
            {(syncResult as any).upserted}, time {(syncResult as any).ms} ms.
          </div>

          {Array.isArray((syncResult as any).missing_skus) &&
          (syncResult as any).missing_skus.length > 0 ? (
            <div className="mt-2 text-xs text-amber-700">
              Missing SKUs: {(syncResult as any).missing_skus.join(", ")}
            </div>
          ) : null}
        </Alert>
      ) : null}
    </div>
  );
}