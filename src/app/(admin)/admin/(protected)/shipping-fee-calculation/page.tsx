"use client";

import { useMemo, useState } from "react";
import { Eraser } from "lucide-react";
import AdminPage from "@/components/admin/AdminPage";
import {
  DEFAULT_SHIPPING_ATTRIBUTE,
  SHIPPING_ATTRIBUTE_OPTIONS,
  type ShippingAttribute,
} from "@/lib/shipping/attributes";

type TrackedMethodSnapshot = {
  method: string;
  arrivalTime?: string;
  discountFee?: number;
  postage?: number;
  remoteFee?: number;
  totalPostageFee?: number;
};

type SummaryRow = {
  postcode: string;
  stateCode: string;
  city: string;
  label: string;
  ok: boolean;
  selectedMethod?: string;
  selectedArrivalTime?: string;
  selectedDiscountFee?: number;
  selectedPostage?: number;
  selectedRemoteFee?: number;
  selectedTotalPostageFee?: number;
  fallbackUsed?: boolean;
  availableMethodCount?: number;
  trackedMethods?: TrackedMethodSnapshot[];
  error?: string;
};

type BatchSummaryResponse = {
  ok: boolean;
  message: string;
  sku?: string;
  preferredMethod?: string;
  sampleCount?: number;
  delayMs?: number;
  requestedLimit?: number;
  offset?: number;
  summary?: SummaryRow[];
  error?: string;
};

type SavedRunListItem = {
  id: number;
  storefront_code: string;
  provider: string;
  sku: string;
  quantity: number;
  weight_g: number;
  wrap_weight_g: number;
  volume: number;
  attribute: string;
  preferred_method: string | null;
  notes: string | null;
  created_at_ts: number;
  updated_at_ts: number;
  item_count: number;
};

type SavedRunItem = {
  id: number;
  run_id: number;
  postcode: string;
  state_code: string | null;
  city: string | null;
  label: string | null;
  ok: number;
  selected_method: string | null;
  selected_arrival_time: string | null;
  selected_discount_fee: number | null;
  selected_postage: number | null;
  selected_remote_fee: number | null;
  selected_total_postage_fee: number | null;
  fallback_used: number | null;
  available_method_count: number | null;
  error: string | null;
  created_at_ts: number;
};

type SavedRunDetail = {
  ok: boolean;
  message: string;
  run?: {
    id: number;
    storefront_code: string;
    provider: string;
    sku: string;
    quantity: number;
    weight_g: number;
    wrap_weight_g: number;
    volume: number;
    attribute: string;
    preferred_method: string | null;
    notes: string | null;
    created_at_ts: number;
    updated_at_ts: number;
  };
  items?: SavedRunItem[];
  error?: string;
};

type SavedRunsResponse = {
  ok: boolean;
  message: string;
  storefrontCode?: string;
  count?: number;
  runs?: SavedRunListItem[];
  error?: string;
};

type CnWarehouseRow = {
  productSku: string | null;
  variantKey: string | null;
  vid: string | number | null;
  pid: string | number | null;
  areaId: string | number | null;
  areaEn: string | null;
  areaCn: string | null;
  countryCode: string | null;
  stockId: string | number | null;
  stockName: string | null;
  stockType: string | null;
  stockNum: number | null;
  availableNum: number | null;
  totalInventoryNum: number | null;
  cjInventoryNum: number | null;
  factoryInventoryNum: number | null;
};

type CnWarehousesResponse = {
  ok: boolean;
  message: string;
  sku?: string;
  totalRows?: number;
  rawCount?: number;
  rows?: CnWarehouseRow[];
  error?: string;
};

const API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "") ||
  "http://127.0.0.1:8787";

function formatTs(ts?: number | null) {
  if (!ts) return "-";
  try {
    return new Date(ts * 1000).toLocaleString();
  } catch {
    return "-";
  }
}

export default function ShippingFeeCalculationPage() {
  const [sku, setSku] = useState("CJBHNSNS14604-Black-39");
  const [quantity, setQuantity] = useState("1");
  const [weight, setWeight] = useState("1000");
  const [wrapWeight, setWrapWeight] = useState("1000");
  const [volume, setVolume] = useState("1");
  const [attribute, setAttribute] =
    useState<ShippingAttribute>(DEFAULT_SHIPPING_ATTRIBUTE);
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deletingRunId, setDeletingRunId] = useState<number | null>(null);
  const [warehouseLoading, setWarehouseLoading] = useState(false);

  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState("");
  const [warehouseError, setWarehouseError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const [response, setResponse] = useState<BatchSummaryResponse | null>(null);
  const [savedRuns, setSavedRuns] = useState<SavedRunListItem[]>([]);
  const [selectedRunDetail, setSelectedRunDetail] = useState<SavedRunDetail | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [cnWarehouses, setCnWarehouses] = useState<CnWarehouseRow[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");

  const rows = useMemo(() => response?.summary || [], [response]);

  async function loadCnWarehouses() {
    if (!sku.trim()) {
      setWarehouseError("Please enter a SKU first.");
      setCnWarehouses([]);
      setSelectedWarehouseId("");
      return;
    }

    setWarehouseLoading(true);
    setWarehouseError("");
    setError("");

    try {
      const res = await fetch(
        `${API_BASE}/admin/shipping/cj/sku-cn-warehouses?sku=${encodeURIComponent(sku.trim())}`,
        {
          method: "GET",
        }
      );

      const json = (await res.json()) as CnWarehousesResponse;

      if (!res.ok || !json.ok) {
        throw new Error(json?.error || json?.message || "Load CN warehouses failed");
      }

      const rows = json.rows || [];
      setCnWarehouses(rows);

      const firstValid = rows.find(
        (row) => row.stockId !== null && row.stockId !== undefined
      );

      setSelectedWarehouseId(firstValid ? String(firstValid.stockId) : "");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setWarehouseError(message);
      setCnWarehouses([]);
      setSelectedWarehouseId("");
    } finally {
      setWarehouseLoading(false);
    }
  }

  async function runBatch(limit: number, offset: number): Promise<BatchSummaryResponse> {
    const res = await fetch(`${API_BASE}/admin/shipping/cj/sample-au-batch-summary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sku: sku.trim(),
        quantity: Number(quantity) || 1,
        srcAreaCode: "CN",
        destAreaCode: "AU",
        weight: Number(weight) || 1000,
        wrapWeight: Number(wrapWeight) || Number(weight) || 1000,
        volume: Number(volume) || 1,
        productProp: [attribute],
        platforms: ["shopify"],
        storageIdList: selectedWarehouseId ? [selectedWarehouseId] : undefined,
        limit,
        offset,
        delayMs: 1500,
      }),
    });

    const json = (await res.json()) as BatchSummaryResponse;

    if (!res.ok || !json.ok) {
      throw new Error(json?.error || json?.message || "Request failed");
    }

    return json;
  }

  async function runFullSummaryBatch() {
    setLoading(true);
    setError("");
    setSaveMessage("");
    setStatusText("Running batch 1 of 2...");

    try {
      const batch1 = await runBatch(15, 0);

      setStatusText("Running batch 2 of 2...");
      const batch2 = await runBatch(10, 15);

      const mergedSummary = [...(batch1.summary || []), ...(batch2.summary || [])];

      const mergedResponse: BatchSummaryResponse = {
        ok: true,
        message: "Full AU summary batch completed",
        sku: batch1.sku || batch2.sku || sku.trim(),
        preferredMethod:
          batch1.preferredMethod || batch2.preferredMethod || "CJPacket Fast Ordinary",
        sampleCount: mergedSummary.length,
        delayMs: 1500,
        requestedLimit: 25,
        offset: 0,
        summary: mergedSummary,
      };

      setResponse(mergedResponse);
      setStatusText(`Completed. Loaded ${mergedSummary.length} summary rows.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setStatusText("");
    } finally {
      setLoading(false);
    }
  }

  function clearCurrentSummary() {
    setError("");
    setSaveMessage("");
    setStatusText("");
    setNotes("");
    setResponse(null);
  }

  async function saveCurrentSummary() {
    if (!response?.summary?.length) {
      setError("No summary results available to save.");
      return;
    }

    setSaving(true);
    setError("");
    setSaveMessage("");

    try {
      const res = await fetch(`${API_BASE}/admin/shipping/cj/save-summary-run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storefrontCode: "AU",
          provider: "CJ",
          sku: sku.trim(),
          quantity: Number(quantity) || 1,
          weightG: Number(weight) || 1000,
          wrapWeightG: Number(wrapWeight) || Number(weight) || 1000,
          volume: Number(volume) || 1,
          attribute,
          preferredMethod: response.preferredMethod || "CJPacket Fast Ordinary",
          notes: notes.trim() || null,
          summary: response.summary,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || json?.message || "Save failed");
      }

      setSaveMessage(`Summary saved successfully. Run ID: ${json.runId}`);
      await loadSavedRuns();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function loadSavedRuns() {
    setRecordsLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/admin/shipping/cj/summary-runs?storefrontCode=AU&limit=50`, {
        method: "GET",
      });

      const json = (await res.json()) as SavedRunsResponse;

      if (!res.ok || !json.ok) {
        throw new Error(json?.error || json?.message || "Fetch saved runs failed");
      }

      setSavedRuns(json.runs || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setRecordsLoading(false);
    }
  }

  async function loadRunDetail(runId: number) {
    setDetailLoading(true);
    setError("");
    setSelectedRunId(runId);

    try {
      const res = await fetch(`${API_BASE}/admin/shipping/cj/summary-runs/${runId}`, {
        method: "GET",
      });

      const json = (await res.json()) as SavedRunDetail;

      if (!res.ok || !json.ok) {
        throw new Error(json?.error || json?.message || "Fetch detail failed");
      }

      setSelectedRunDetail(json);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setSelectedRunDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function deleteRun(runId: number) {
    const confirmed = window.confirm(`Delete saved summary run #${runId}?`);
    if (!confirmed) return;

    setDeletingRunId(runId);
    setError("");
    setSaveMessage("");

    try {
      const res = await fetch(`${API_BASE}/admin/shipping/cj/summary-runs/${runId}`, {
        method: "DELETE",
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || json?.message || "Delete failed");
      }

      if (selectedRunId === runId) {
        setSelectedRunId(null);
        setSelectedRunDetail(null);
      }

      await loadSavedRuns();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setDeletingRunId(null);
    }
  }

  return (
    <AdminPage
      title="Shipping Fee Calculation Dashboard"
      subtitle="Run AU postcode sampling, save results, and manage summary records"
    >
      <div className="space-y-6">
        <div className="rounded-lg border bg-white p-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">SKU</label>
              <input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                placeholder="CJ SKU"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Quantity</label>
              <input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                placeholder="1"
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Weight (g)
              </label>
              <input
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                placeholder="1000"
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Wrap Weight (g)
              </label>
              <input
                value={wrapWeight}
                onChange={(e) => setWrapWeight(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                placeholder="1000"
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Volume</label>
              <input
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                placeholder="1"
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Attribute
              </label>
              <select
                value={attribute}
                onChange={(e) => setAttribute(e.target.value as ShippingAttribute)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
              >
                {SHIPPING_ATTRIBUTE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Source Warehouse
              </label>
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
              >
                <option value="">China (auto / no warehouse filter)</option>
                {cnWarehouses
                  .filter((row) => row.stockId !== null && row.stockId !== undefined)
                  .map((row) => {
                    const stockId = String(row.stockId);
                    const warehouseName =
                      row.stockName ||
                      row.areaEn ||
                      row.areaCn ||
                      row.countryCode ||
                      "China Warehouse";

                    const label = `${warehouseName} | stockId=${stockId} | factoryInventory=${row.factoryInventoryNum ?? "-"}`;

                    return (
                      <option key={`${stockId}-${row.productSku || "sku"}`} value={stockId}>
                        {label}
                      </option>
                    );
                  })}
              </select>
            </div>


          </div>

          <div className="mt-[220px] border-t pt-8">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={loadCnWarehouses}
                disabled={warehouseLoading || loading || saving}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {warehouseLoading ? "Loading Warehouses..." : "Load CN Warehouses"}
              </button>
            </div>

            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <div>
                This action automatically runs two requests: first batch 15 postcodes,
                then second batch 10 postcodes. The generated result is not auto-saved.
              </div>

              <div>
                Current source warehouse:{" "}
                <span className="font-medium text-slate-900">
                  {selectedWarehouseId
                    ? selectedWarehouseId
                    : "China (auto / no warehouse filter)"}
                </span>
              </div>

              {warehouseError ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {warehouseError}
                </div>
              ) : null}

              {!warehouseError && cnWarehouses.length ? (
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  Loaded {cnWarehouses.length} CN warehouse rows for current SKU.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <h2 className="text-base font-semibold text-slate-900">Run Status</h2>

          {statusText ? (
            <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {statusText}
            </div>
          ) : null}

          {saveMessage ? (
            <div className="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {saveMessage}
            </div>
          ) : null}

          {error ? (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {!error && response ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <div className="rounded-md border bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Message</div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {response.message}
                </div>
              </div>

              <div className="rounded-md border bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Preferred Method</div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {response.preferredMethod || "-"}
                </div>
              </div>

              <div className="rounded-md border bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Sample Count</div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {response.sampleCount ?? "-"}
                </div>
              </div>

              <div className="rounded-md border bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Requested Limit</div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {response.requestedLimit ?? "-"}
                </div>
              </div>

              <div className="rounded-md border bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Delay</div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {response.delayMs ?? "-"} ms
                </div>
              </div>

              <div className="rounded-md border bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Attribute</div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {attribute}
                </div>
              </div>
            </div>
          ) : null}

          {!error && !response && !statusText ? (
            <div className="mt-3 text-sm text-slate-500">
              No current summary yet. Run a full summary batch to generate one.
            </div>
          ) : null}

          <div className="mt-10 border-t pt-6">
            <button
              type="button"
              onClick={runFullSummaryBatch}
              disabled={loading || saving}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Running..." : "Run Full Summary"}
            </button>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Current Summary Results</h2>

            <div className="flex items-center gap-3">
              <div className="text-sm text-slate-500">
                {rows.length ? `${rows.length} rows` : ""}
              </div>

              <button
                type="button"
                onClick={clearCurrentSummary}
                aria-label="Clear current summary"
                title="Clear current summary"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              >
                <Eraser className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left">
                  <th className="px-3 py-2 font-medium text-slate-700">Postcode</th>
                  <th className="px-3 py-2 font-medium text-slate-700">State</th>
                  <th className="px-3 py-2 font-medium text-slate-700">City</th>
                  <th className="px-3 py-2 font-medium text-slate-700">Label</th>
                  <th className="px-3 py-2 font-medium text-slate-700">Method</th>
                  <th className="px-3 py-2 font-medium text-slate-700">Fee</th>
                  <th className="px-3 py-2 font-medium text-slate-700">Postage</th>
                  <th className="px-3 py-2 font-medium text-slate-700">Remote Fee</th>
                  <th className="px-3 py-2 font-medium text-slate-700">ETA</th>
                  <th className="px-3 py-2 font-medium text-slate-700">Tracked Methods</th>
                  <th className="px-3 py-2 font-medium text-slate-700">Fallback</th>
                  <th className="px-3 py-2 font-medium text-slate-700">OK</th>
                  <th className="px-3 py-2 font-medium text-slate-700">Error</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.postcode}-${row.label}`} className="border-b align-top">
                    <td className="px-3 py-2 text-slate-900">{row.postcode}</td>
                    <td className="px-3 py-2 text-slate-700">{row.stateCode}</td>
                    <td className="px-3 py-2 text-slate-700">{row.city}</td>
                    <td className="px-3 py-2 text-slate-700">{row.label}</td>
                    <td className="px-3 py-2 text-slate-700">{row.selectedMethod || "-"}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {typeof row.selectedDiscountFee === "number"
                        ? row.selectedDiscountFee.toFixed(2)
                        : "-"}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {typeof row.selectedPostage === "number"
                        ? row.selectedPostage.toFixed(2)
                        : "-"}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {typeof row.selectedRemoteFee === "number"
                        ? row.selectedRemoteFee.toFixed(2)
                        : "-"}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {row.selectedArrivalTime || "-"}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-700">
                      {row.trackedMethods?.length ? (
                        <div className="space-y-1">
                          {row.trackedMethods.map((method) => (
                            <div key={method.method}>
                              <span className="font-medium text-slate-900">{method.method}</span>
                              {" : "}
                              {typeof method.discountFee === "number"
                                ? method.discountFee.toFixed(2)
                                : "-"}
                              {" / "}
                              {method.arrivalTime || "-"}
                            </div>
                          ))}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {typeof row.fallbackUsed === "boolean"
                        ? row.fallbackUsed
                          ? "Yes"
                          : "No"
                        : "-"}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          row.ok
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {row.ok ? "OK" : "Failed"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-red-600">{row.error || "-"}</td>
                  </tr>
                ))}

                {!rows.length ? (
                  <tr>
                    <td colSpan={13} className="px-3 py-6 text-center text-sm text-slate-500">
                      No current summary rows yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="mt-60 border-t pt-8">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Save Current Summary</h3>
              <div className="text-sm text-slate-500">
                {response?.summary?.length
                  ? `${response.summary.length} rows ready`
                  : "No summary to save"}
              </div>
            </div>

            <p className="mb-4 text-sm text-slate-500">
              Review the current summary results above, then add an optional note and save this run.
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Notes
                </label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  placeholder="Optional note for this saved summary run"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={saveCurrentSummary}
                  disabled={loading || saving || !response?.summary?.length}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Current Summary"}
                </button>

                <div className="text-sm text-slate-500">
                  Save this run after reviewing the current summary results above.
                </div>
              </div>
            </div>
          </div>
        </div>


        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-lg border bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Saved Summary Records</h2>
              <div className="text-sm text-slate-500">
                {savedRuns.length ? `${savedRuns.length} runs` : "No records"}
              </div>
            </div>

            {!savedRuns.length ? (
              <div className="text-sm text-slate-500">
                No saved records yet. Click “Refresh Saved Records” to load saved runs.
              </div>
            ) : (
              <div className="space-y-3">
                {savedRuns.map((run) => (
                  <div
                    key={run.id}
                    className="rounded-lg border border-slate-200 p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-slate-900">
                          Run #{run.id}
                        </div>
                        <div className="text-sm text-slate-700">
                          SKU: {run.sku}
                        </div>
                        <div className="text-xs text-slate-500">
                          {run.provider} · {run.attribute || "-"} · {run.preferred_method || "-"} · {run.item_count} items
                        </div>
                        <div className="text-xs text-slate-500">
                          Created: {formatTs(run.created_at_ts)}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => loadRunDetail(run.id)}
                          disabled={detailLoading && selectedRunId === run.id}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                        >
                          {detailLoading && selectedRunId === run.id ? "Loading..." : "View"}
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteRun(run.id)}
                          disabled={deletingRunId === run.id}
                          className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                        >
                          {deletingRunId === run.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Saved Record Detail</h2>
              <div className="text-sm text-slate-500">
                {selectedRunId ? `Run #${selectedRunId}` : "No selection"}
              </div>
            </div>

            {!selectedRunDetail?.run ? (
              <div className="text-sm text-slate-500">
                Select a saved run to view its detail.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-md border bg-slate-50 p-3 text-sm text-slate-700">
                  <div><span className="font-medium text-slate-900">SKU:</span> {selectedRunDetail.run.sku}</div>
                  <div><span className="font-medium text-slate-900">Provider:</span> {selectedRunDetail.run.provider}</div>
                  <div><span className="font-medium text-slate-900">Attribute:</span> {selectedRunDetail.run.attribute || "-"}</div>
                  <div><span className="font-medium text-slate-900">Preferred Method:</span> {selectedRunDetail.run.preferred_method || "-"}</div>
                  <div><span className="font-medium text-slate-900">Created:</span> {formatTs(selectedRunDetail.run.created_at_ts)}</div>
                  <div><span className="font-medium text-slate-900">Notes:</span> {selectedRunDetail.run.notes || "-"}</div>
                </div>

                <div className="max-h-[420px] overflow-auto rounded-md border">
                  <table className="min-w-full border-collapse text-sm">
                    <thead className="sticky top-0 bg-slate-50">
                      <tr className="border-b text-left">
                        <th className="px-3 py-2 font-medium text-slate-700">Postcode</th>
                        <th className="px-3 py-2 font-medium text-slate-700">State</th>
                        <th className="px-3 py-2 font-medium text-slate-700">City</th>
                        <th className="px-3 py-2 font-medium text-slate-700">Method</th>
                        <th className="px-3 py-2 font-medium text-slate-700">Fee</th>
                        <th className="px-3 py-2 font-medium text-slate-700">ETA</th>
                        <th className="px-3 py-2 font-medium text-slate-700">OK</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedRunDetail.items || []).map((item) => (
                        <tr key={item.id} className="border-b align-top">
                          <td className="px-3 py-2 text-slate-900">{item.postcode}</td>
                          <td className="px-3 py-2 text-slate-700">{item.state_code || "-"}</td>
                          <td className="px-3 py-2 text-slate-700">{item.city || "-"}</td>
                          <td className="px-3 py-2 text-slate-700">{item.selected_method || "-"}</td>
                          <td className="px-3 py-2 text-slate-700">
                            {typeof item.selected_discount_fee === "number"
                              ? item.selected_discount_fee.toFixed(2)
                              : "-"}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {item.selected_arrival_time || "-"}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                item.ok
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {item.ok ? "OK" : "Failed"}
                            </span>
                          </td>
                        </tr>
                      ))}

                      {!selectedRunDetail.items?.length ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-500">
                            No detail items found.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminPage>
  );
}