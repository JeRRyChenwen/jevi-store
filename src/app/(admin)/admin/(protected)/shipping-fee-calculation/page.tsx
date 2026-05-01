"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

type SampleGroup = "standard" | "highRisk" | "tierExpansion";

type RunSampleGroup = SampleGroup | "all";

type SummaryRow = {
  postcode: string;
  stateCode: string;
  city: string;
  label: string;
  sampleGroup?: SampleGroup;
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
  sampleGroup?: RunSampleGroup;
  totalAvailable?: number;
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
  run_name: string | null;
  source_warehouse_id: string | null;
  source_warehouse_label: string | null;
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
  sample_group: SampleGroup | null;
  ok: number;
  selected_method: string | null;
  selected_arrival_time: string | null;
  selected_discount_fee: number | null;
  selected_postage: number | null;
  selected_remote_fee: number | null;
  selected_total_postage_fee: number | null;
  fallback_used: number | null;
  available_method_count: number | null;
  trackedMethods?: TrackedMethodSnapshot[];
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
    run_name: string | null;
    source_warehouse_id: string | null;
    source_warehouse_label: string | null;
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

type CjfoTierSummary = {
  tierCode: string;
  fee: number | null;
  totalCount: number;
  standardCount: number;
  highRiskCount: number;
  tierExpansionCount: number;
  stateSummary: Array<{
    stateCode: string;
    count: number;
  }>;
  postcodePreview: string[];
};

type FullPostcodeQuoteRunRow = {
  id: number;
  storefront_code: string;
  provider: string;
  sku: string;
  quantity: number;
  weight_g: number;
  wrap_weight_g: number;
  volume: number;
  attribute: string;
  source_warehouse_id: string | null;
  source_warehouse_label: string | null;
  preferred_method: string;
  reference_source: string;
  reference_total_count: number;
  status: "draft" | "running" | "completed" | "failed" | "cancelled";
  total_count: number;
  processed_count: number;
  success_count: number;
  failed_count: number;
  next_offset: number;
  batch_size: number;
  delay_ms: number;
  run_name: string | null;
  notes: string | null;
  last_error: string | null;
  started_at_ts: number | null;
  completed_at_ts: number | null;
  cancelled_at_ts: number | null;
  created_at_ts: number;
  updated_at_ts: number;
};

type FullPostcodeTierSummaryRow = {
  tier_code: string;
  count: number;
  success_count: number | null;
  failed_count: number | null;
  min_fee: number | null;
  max_fee: number | null;
  avg_fee: number | null;
};

type FullPostcodeQuoteResultRow = {
  id: number;
  run_id: number;
  state_code: string;
  postcode: string;
  city: string | null;
  label: string | null;
  locality_count: number;
  reference_index: number;
  ok: number;
  selected_method: string | null;
  selected_arrival_time: string | null;
  selected_discount_fee: number | null;
  selected_postage: number | null;
  selected_remote_fee: number | null;
  selected_total_postage_fee: number | null;
  fallback_used: number | null;
  available_method_count: number | null;
  tier_code: string | null;
  error: string | null;
  quoted_at_ts: number | null;
  created_at_ts: number;
  updated_at_ts: number;
};

type FullPostcodeQuoteRunDetail = {
  ok: boolean;
  message: string;
  run?: FullPostcodeQuoteRunRow;
  tierSummary?: FullPostcodeTierSummaryRow[];
  results?: FullPostcodeQuoteResultRow[];
  pagination?: {
    limit: number;
    offset: number;
    returned: number;
  };
  error?: string;
};

type CreateFullPostcodeQuoteRunResponse = {
  ok: boolean;
  message: string;
  runId?: number;
  runName?: string;
  totalCount?: number;
  batchSize?: number;
  delayMs?: number;
  error?: string;
};

type ProcessFullPostcodeQuoteBatchResponse = {
  ok: boolean;
  message: string;
  runId?: number;
  status?: string;
  offset?: number;
  processedInBatch?: number;
  successInBatch?: number;
  failedInBatch?: number;
  nextOffset?: number;
  totalCount?: number;
  processedCount?: number;
  successCount?: number;
  failedCount?: number;
  error?: string;
};

type RetryFailedFullPostcodeBatchResponse = {
  ok: boolean;
  message: string;
  runId?: number;
  retriedInBatch?: number;
  successInBatch?: number;
  failedInBatch?: number;
  processedCount?: number;
  successCount?: number;
  failedCount?: number;
  error?: string;
};

const CJFO_METHOD_NAME = "CJPacket Fast Ordinary";

const API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "") ||
  "http://127.0.0.1:8787";

function formatSampleGroupLabel(sampleGroup?: SampleGroup | null) {
  if (sampleGroup === "highRisk") return "High-risk";
  if (sampleGroup === "tierExpansion") return "Tier expansion";
  return "Standard";
}

function formatCjfoTierDisplayName(tierCode: string) {
  const mapping: Record<string, string> = {
    AU_CJFO_TIER_1: "Tier 1 - CBD",
    AU_CJFO_TIER_2: "Tier 2 - Near regional",
    AU_CJFO_TIER_3: "Tier 3 - Remote",
    AU_CJFO_TIER_4: "Tier 4 - Extended remote",
    AU_CJFO_TIER_5: "Tier 5 - Special remote",
    AU_CJFO_EXCEPTION: "Exception - Live check required",
  };

  return mapping[tierCode] || tierCode;
}

function buildStateSummary(rows: SummaryRow[]) {
  const stateMap = new Map<string, number>();

  for (const row of rows) {
    const stateCode = row.stateCode || "-";
    stateMap.set(stateCode, (stateMap.get(stateCode) || 0) + 1);
  }

  return Array.from(stateMap.entries())
    .map(([stateCode, count]) => ({ stateCode, count }))
    .sort((a, b) => a.stateCode.localeCompare(b.stateCode));
}

function buildCjfoTierSummary(rows: SummaryRow[]) {
  const validRows = rows.filter(
    (row) =>
      row.ok &&
      row.selectedMethod === CJFO_METHOD_NAME &&
      typeof row.selectedDiscountFee === "number",
  );

  const exceptionRows = rows.filter(
    (row) =>
      !row.ok ||
      row.selectedMethod !== CJFO_METHOD_NAME ||
      typeof row.selectedDiscountFee !== "number",
  );

  const feeKeys = Array.from(
    new Set(validRows.map((row) => row.selectedDiscountFee!.toFixed(2))),
  ).sort((a, b) => Number(a) - Number(b));

  const tierSummaries: CjfoTierSummary[] = feeKeys.map((feeKey, index) => {
    const fee = Number(feeKey);
    const tierRows = validRows.filter(
      (row) => row.selectedDiscountFee!.toFixed(2) === feeKey,
    );

    return {
      tierCode: `AU_CJFO_TIER_${index + 1}`,
      fee,
      totalCount: tierRows.length,
      standardCount: tierRows.filter(
        (row) => row.sampleGroup === "standard" || !row.sampleGroup,
      ).length,
      highRiskCount: tierRows.filter((row) => row.sampleGroup === "highRisk")
        .length,
      tierExpansionCount: tierRows.filter(
        (row) => row.sampleGroup === "tierExpansion",
      ).length,
      stateSummary: buildStateSummary(tierRows),
      postcodePreview: tierRows.slice(0, 12).map((row) => row.postcode),
    };
  });

  const exceptionSummary: CjfoTierSummary = {
    tierCode: "AU_CJFO_EXCEPTION",
    fee: null,
    totalCount: exceptionRows.length,
    standardCount: exceptionRows.filter(
      (row) => row.sampleGroup === "standard" || !row.sampleGroup,
    ).length,
    highRiskCount: exceptionRows.filter((row) => row.sampleGroup === "highRisk")
      .length,
    tierExpansionCount: exceptionRows.filter(
      (row) => row.sampleGroup === "tierExpansion",
    ).length,
    stateSummary: buildStateSummary(exceptionRows),
    postcodePreview: exceptionRows.slice(0, 12).map((row) => row.postcode),
  };

  return {
    methodName: CJFO_METHOD_NAME,
    totalRows: rows.length,
    okRows: rows.filter((row) => row.ok).length,
    failedRows: rows.filter((row) => !row.ok).length,
    tierSummaries,
    exceptionSummary,
  };
}

function formatTs(ts?: number | null) {
  if (!ts) return "-";
  try {
    return new Date(ts * 1000).toLocaleString();
  } catch {
    return "-";
  }
}

function sleepMs(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function ShippingFeeCalculationPage() {
  const [sku, setSku] = useState("CJBHNSNS14604-Black-39");
  const [quantity, setQuantity] = useState("1");
  const [weight, setWeight] = useState("1000");
  const [wrapWeight, setWrapWeight] = useState("1000");
  const [volume, setVolume] = useState("1");
  const [attribute, setAttribute] = useState<ShippingAttribute>(
    DEFAULT_SHIPPING_ATTRIBUTE,
  );
  const [runName, setRunName] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deletingRunId, setDeletingRunId] = useState<number | null>(null);
  const [warehouseLoading, setWarehouseLoading] = useState(false);
  const [fullPostcodeLoading, setFullPostcodeLoading] = useState(false);
  const [autoRunningFullPostcode, setAutoRunningFullPostcode] = useState(false);
  const [autoRetryingFullPostcode, setAutoRetryingFullPostcode] =
    useState(false);

  const autoRunFullPostcodeStopRef = useRef(false);
  const autoRetryFullPostcodeStopRef = useRef(false);

  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState("");
  const [warehouseError, setWarehouseError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const [fullPostcodeRunId, setFullPostcodeRunId] = useState<number | null>(
    null,
  );
  const [fullPostcodeRunIdInput, setFullPostcodeRunIdInput] = useState("");
  const [fullPostcodeRunName, setFullPostcodeRunName] = useState("");
  const [fullPostcodeMessage, setFullPostcodeMessage] = useState("");
  const [fullPostcodeError, setFullPostcodeError] = useState("");
  const [fullPostcodeDetail, setFullPostcodeDetail] =
    useState<FullPostcodeQuoteRunDetail | null>(null);

  const [response, setResponse] = useState<BatchSummaryResponse | null>(null);
  const [savedRuns, setSavedRuns] = useState<SavedRunListItem[]>([]);
  const [selectedRunDetail, setSelectedRunDetail] =
    useState<SavedRunDetail | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [cnWarehouses, setCnWarehouses] = useState<CnWarehouseRow[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [pendingDeleteRunId, setPendingDeleteRunId] = useState<number | null>(
    null,
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const rows = useMemo(() => response?.summary || [], [response]);

  const cjfoTierSummary = useMemo(() => buildCjfoTierSummary(rows), [rows]);

  const hasActiveFullPostcodeRun = Boolean(
    fullPostcodeRunId || fullPostcodeRunIdInput.trim(),
  );

  const isFullPostcodeActionBusy =
    fullPostcodeLoading ||
    autoRunningFullPostcode ||
    autoRetryingFullPostcode ||
    loading ||
    saving;

  const isFullPostcodeManualWorking =
    fullPostcodeLoading &&
    !autoRunningFullPostcode &&
    !autoRetryingFullPostcode;

  const savedDetailRows = useMemo<SummaryRow[]>(() => {
    return (selectedRunDetail?.items || []).map((item) => ({
      postcode: item.postcode,
      stateCode: item.state_code || "",
      city: item.city || "",
      label: item.label || "",
      sampleGroup:
        item.sample_group === "highRisk"
          ? "highRisk"
          : item.sample_group === "tierExpansion"
            ? "tierExpansion"
            : "standard",
      ok: Boolean(item.ok),
      selectedMethod: item.selected_method || undefined,
      selectedArrivalTime: item.selected_arrival_time || undefined,
      selectedDiscountFee:
        typeof item.selected_discount_fee === "number"
          ? item.selected_discount_fee
          : undefined,
      selectedPostage:
        typeof item.selected_postage === "number"
          ? item.selected_postage
          : undefined,
      selectedRemoteFee:
        typeof item.selected_remote_fee === "number"
          ? item.selected_remote_fee
          : undefined,
      selectedTotalPostageFee:
        typeof item.selected_total_postage_fee === "number"
          ? item.selected_total_postage_fee
          : undefined,
      fallbackUsed:
        typeof item.fallback_used === "number"
          ? Boolean(item.fallback_used)
          : undefined,
      availableMethodCount:
        typeof item.available_method_count === "number"
          ? item.available_method_count
          : undefined,
      trackedMethods: item.trackedMethods || [],
      error: item.error || undefined,
    }));
  }, [selectedRunDetail]);

  const savedDetailTierSummary = useMemo(
    () => buildCjfoTierSummary(savedDetailRows),
    [savedDetailRows],
  );

  useEffect(() => {
    loadSavedRuns();
  }, []);

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
        },
      );

      const json = (await res.json()) as CnWarehousesResponse;

      if (!res.ok || !json.ok) {
        throw new Error(
          json?.error || json?.message || "Load CN warehouses failed",
        );
      }

      const rows = json.rows || [];
      setCnWarehouses(rows);

      const firstValid = rows.find(
        (row) => row.stockId !== null && row.stockId !== undefined,
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

  async function runBatch(
    limit: number,
    offset: number,
    sampleGroup: RunSampleGroup = "standard",
  ): Promise<BatchSummaryResponse> {
    const res = await fetch(
      `${API_BASE}/admin/shipping/cj/sample-au-batch-summary`,
      {
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
          storageIdList: selectedWarehouseId
            ? [selectedWarehouseId]
            : undefined,
          limit,
          offset,
          delayMs: 1500,
          sampleGroup,
        }),
      },
    );

    const json = (await res.json()) as BatchSummaryResponse;

    if (!res.ok || !json.ok) {
      throw new Error(json?.error || json?.message || "Request failed");
    }

    return json;
  }

  function getSelectedWarehouseLabel() {
    if (!selectedWarehouseId) {
      return "China (auto / no warehouse filter)";
    }

    return (
      cnWarehouses.find(
        (row) =>
          row.stockId !== null &&
          row.stockId !== undefined &&
          String(row.stockId) === selectedWarehouseId,
      )?.stockName || selectedWarehouseId
    );
  }

  async function fetchFullPostcodeRunDetail(targetRunId?: number) {
    const parsedInputRunId = Number(fullPostcodeRunIdInput.trim());

    const runId =
      targetRunId ||
      fullPostcodeRunId ||
      (Number.isFinite(parsedInputRunId) && parsedInputRunId > 0
        ? Math.floor(parsedInputRunId)
        : null);

    if (!runId) {
      setFullPostcodeError(
        "No AU full postcode quote run ID available. Please create a run or enter an existing Run ID.",
      );
      return;
    }

    setFullPostcodeLoading(true);
    setFullPostcodeError("");

    try {
      const res = await fetch(
        `${API_BASE}/admin/shipping/cj/au-postcode-quote-runs/${runId}?limit=5000&offset=0`,
        {
          method: "GET",
        },
      );

      const json = (await res.json()) as FullPostcodeQuoteRunDetail;

      if (!res.ok || !json.ok) {
        throw new Error(
          json?.error || json?.message || "Fetch AU postcode quote run failed",
        );
      }

      setFullPostcodeDetail(json);
      setFullPostcodeRunId(runId);
      setFullPostcodeRunIdInput(String(runId));
      setFullPostcodeMessage(json.message || "AU postcode quote run loaded.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setFullPostcodeError(message);
    } finally {
      setFullPostcodeLoading(false);
    }
  }

  async function createFullPostcodeQuoteRun() {
    if (!sku.trim()) {
      setFullPostcodeError("Please enter a SKU first.");
      return;
    }

    setFullPostcodeLoading(true);
    setFullPostcodeError("");
    setFullPostcodeMessage("");
    setFullPostcodeDetail(null);

    try {
      const res = await fetch(
        `${API_BASE}/admin/shipping/cj/au-postcode-quote-runs`,
        {
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
            sourceWarehouseId: selectedWarehouseId || null,
            sourceWarehouseLabel: getSelectedWarehouseLabel(),
            preferredMethod: "CJPacket Fast Ordinary",
            batchSize: 5,
            delayMs: 1500,
            runName:
              fullPostcodeRunName.trim() ||
              `AU full postcode quote test ${new Date().toLocaleString()}`,
            notes: "Created from Shipping Fee Calculation Dashboard test card.",
          }),
        },
      );

      const json = (await res.json()) as CreateFullPostcodeQuoteRunResponse;

      if (!res.ok || !json.ok || !json.runId) {
        throw new Error(
          json?.error || json?.message || "Create AU postcode quote run failed",
        );
      }

      setFullPostcodeRunId(json.runId);
      setFullPostcodeRunIdInput(String(json.runId));
      setFullPostcodeMessage(
        `Created AU postcode quote run #${json.runId}. Total postcode targets: ${
          json.totalCount ?? "-"
        }.`,
      );

      await fetchFullPostcodeRunDetail(json.runId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setFullPostcodeError(message);
    } finally {
      setFullPostcodeLoading(false);
    }
  }

  function getActiveFullPostcodeRunId() {
    const parsedInputRunId = Number(fullPostcodeRunIdInput.trim());

    return (
      fullPostcodeRunId ||
      (Number.isFinite(parsedInputRunId) && parsedInputRunId > 0
        ? Math.floor(parsedInputRunId)
        : null)
    );
  }

  async function processFullPostcodeQuoteBatch() {
    const runId = getActiveFullPostcodeRunId();

    if (!runId) {
      setFullPostcodeError(
        "Please create an AU postcode quote run first, or enter an existing Run ID.",
      );
      return;
    }

    setFullPostcodeLoading(true);
    setFullPostcodeError("");
    setFullPostcodeMessage("");

    try {
      const res = await fetch(
        `${API_BASE}/admin/shipping/cj/au-postcode-quote-runs/${runId}/process-batch`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            limit: 5,
            delayMs: 1500,
            storageIdList: selectedWarehouseId
              ? [selectedWarehouseId]
              : undefined,
          }),
        },
      );

      const json = (await res.json()) as ProcessFullPostcodeQuoteBatchResponse;

      if (!res.ok || !json.ok) {
        throw new Error(
          json?.error ||
            json?.message ||
            "Process AU postcode quote batch failed",
        );
      }

      setFullPostcodeMessage(
        `${json.message}. Processed in this batch: ${
          json.processedInBatch ?? "-"
        }. Success: ${json.successInBatch ?? "-"}, Failed: ${
          json.failedInBatch ?? "-"
        }. Next offset: ${json.nextOffset ?? "-"}.`,
      );

      await fetchFullPostcodeRunDetail(runId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setFullPostcodeError(message);
    } finally {
      setFullPostcodeLoading(false);
    }
  }

  async function autoRunFullPostcodeBatches() {
    const runId = getActiveFullPostcodeRunId();

    if (!runId) {
      setFullPostcodeError(
        "Please create an AU postcode quote run first, or enter an existing Run ID and fetch it.",
      );
      return;
    }

    autoRunFullPostcodeStopRef.current = false;
    setAutoRunningFullPostcode(true);
    setFullPostcodeLoading(true);
    setFullPostcodeError("");
    setFullPostcodeMessage(`Auto run started for AU quote run #${runId}.`);

    try {
      while (!autoRunFullPostcodeStopRef.current) {
        const processRes = await fetch(
          `${API_BASE}/admin/shipping/cj/au-postcode-quote-runs/${runId}/process-batch`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              limit: 5,
              delayMs: 1500,
              storageIdList: selectedWarehouseId
                ? [selectedWarehouseId]
                : undefined,
            }),
          },
        );

        const processJson =
          (await processRes.json()) as ProcessFullPostcodeQuoteBatchResponse;

        if (!processRes.ok || !processJson.ok) {
          throw new Error(
            processJson?.error ||
              processJson?.message ||
              "Auto process AU postcode quote batch failed",
          );
        }

        const detailRes = await fetch(
          `${API_BASE}/admin/shipping/cj/au-postcode-quote-runs/${runId}?limit=5000&offset=0`,
          {
            method: "GET",
          },
        );

        const detailJson =
          (await detailRes.json()) as FullPostcodeQuoteRunDetail;

        if (!detailRes.ok || !detailJson.ok) {
          throw new Error(
            detailJson?.error ||
              detailJson?.message ||
              "Fetch AU postcode quote run failed during auto run",
          );
        }

        setFullPostcodeDetail(detailJson);
        setFullPostcodeRunId(runId);
        setFullPostcodeRunIdInput(String(runId));

        const status =
          processJson.status || detailJson.run?.status || "running";
        const processed =
          processJson.processedCount ?? detailJson.run?.processed_count ?? "-";
        const total =
          processJson.totalCount ?? detailJson.run?.total_count ?? "-";
        const nextOffset =
          processJson.nextOffset ?? detailJson.run?.next_offset ?? "-";

        setFullPostcodeMessage(
          `Auto running... Processed ${processed} / ${total}. Last batch: ${
            processJson.processedInBatch ?? "-"
          } postcodes. Success: ${processJson.successInBatch ?? "-"}, Failed: ${
            processJson.failedInBatch ?? "-"
          }. Next offset: ${nextOffset}.`,
        );

        if (status === "completed") {
          setFullPostcodeMessage(
            `Auto run completed. Processed ${processed} / ${total}.`,
          );
          break;
        }

        await sleepMs(1000);
      }

      if (autoRunFullPostcodeStopRef.current) {
        setFullPostcodeMessage(
          `Auto run stopped manually. Run #${runId} can be continued later from its saved next offset.`,
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setFullPostcodeError(message);
      setFullPostcodeMessage(
        `Auto run stopped because of an error. Run #${runId} can be continued later from its saved next offset.`,
      );
    } finally {
      setAutoRunningFullPostcode(false);
      setFullPostcodeLoading(false);
      autoRunFullPostcodeStopRef.current = false;
    }
  }

  function stopAutoRunFullPostcodeBatches() {
    autoRunFullPostcodeStopRef.current = true;
    setFullPostcodeMessage(
      "Stopping auto run after the current batch finishes...",
    );
  }

  async function retryFailedFullPostcodeBatch() {
    const runId = getActiveFullPostcodeRunId();

    if (!runId) {
      setFullPostcodeError(
        "Please create an AU postcode quote run first, or enter an existing Run ID.",
      );
      return;
    }

    setFullPostcodeLoading(true);
    setFullPostcodeError("");
    setFullPostcodeMessage("");

    try {
      const res = await fetch(
        `${API_BASE}/admin/shipping/cj/au-postcode-quote-runs/${runId}/retry-failed-batch`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            limit: 5,
            delayMs: 1500,
            storageIdList: selectedWarehouseId
              ? [selectedWarehouseId]
              : undefined,
          }),
        },
      );

      const json = (await res.json()) as RetryFailedFullPostcodeBatchResponse;

      if (!res.ok || !json.ok) {
        throw new Error(
          json?.error ||
            json?.message ||
            "Retry failed AU postcode quote batch failed",
        );
      }

      setFullPostcodeMessage(
        `${json.message}. Retried in this batch: ${
          json.retriedInBatch ?? "-"
        }. Success: ${json.successInBatch ?? "-"}, Still failed: ${
          json.failedInBatch ?? "-"
        }. Total failed left: ${json.failedCount ?? "-"}.`,
      );

      await fetchFullPostcodeRunDetail(runId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setFullPostcodeError(message);
    } finally {
      setFullPostcodeLoading(false);
    }
  }

  async function autoRetryFailedFullPostcodeBatches() {
    const runId = getActiveFullPostcodeRunId();

    if (!runId) {
      setFullPostcodeError(
        "Please create an AU postcode quote run first, or enter an existing Run ID.",
      );
      return;
    }

    autoRetryFullPostcodeStopRef.current = false;
    setAutoRetryingFullPostcode(true);
    setFullPostcodeLoading(true);
    setFullPostcodeError("");
    setFullPostcodeMessage(`Auto retry started for AU quote run #${runId}.`);

    try {
      while (!autoRetryFullPostcodeStopRef.current) {
        const retryRes = await fetch(
          `${API_BASE}/admin/shipping/cj/au-postcode-quote-runs/${runId}/retry-failed-batch`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              limit: 5,
              delayMs: 1500,
              storageIdList: selectedWarehouseId
                ? [selectedWarehouseId]
                : undefined,
            }),
          },
        );

        const retryJson =
          (await retryRes.json()) as RetryFailedFullPostcodeBatchResponse;

        if (!retryRes.ok || !retryJson.ok) {
          throw new Error(
            retryJson?.error ||
              retryJson?.message ||
              "Auto retry failed AU postcode quote batch failed",
          );
        }

        const detailRes = await fetch(
          `${API_BASE}/admin/shipping/cj/au-postcode-quote-runs/${runId}?limit=5000&offset=0`,
          {
            method: "GET",
          },
        );

        const detailJson =
          (await detailRes.json()) as FullPostcodeQuoteRunDetail;

        if (!detailRes.ok || !detailJson.ok) {
          throw new Error(
            detailJson?.error ||
              detailJson?.message ||
              "Fetch AU postcode quote run failed during auto retry",
          );
        }

        setFullPostcodeDetail(detailJson);
        setFullPostcodeRunId(runId);
        setFullPostcodeRunIdInput(String(runId));

        const failedLeft =
          retryJson.failedCount ?? detailJson.run?.failed_count ?? 0;
        const successCount =
          retryJson.successCount ?? detailJson.run?.success_count ?? "-";
        const processedCount =
          retryJson.processedCount ?? detailJson.run?.processed_count ?? "-";

        setFullPostcodeMessage(
          `Auto retrying failed postcodes... Last retry batch: ${
            retryJson.retriedInBatch ?? "-"
          } rows. Fixed: ${retryJson.successInBatch ?? "-"}, Still failed in batch: ${
            retryJson.failedInBatch ?? "-"
          }. Total failed left: ${failedLeft}. Success total: ${successCount}. Processed total: ${processedCount}.`,
        );

        if ((retryJson.retriedInBatch ?? 0) <= 0) {
          setFullPostcodeMessage(
            `Auto retry completed. No failed postcode quote results left to retry for run #${runId}.`,
          );
          break;
        }

        if (failedLeft <= 0) {
          setFullPostcodeMessage(
            `Auto retry completed. All failed postcode quote results have been fixed for run #${runId}.`,
          );
          break;
        }

        if (
          (retryJson.successInBatch ?? 0) === 0 &&
          (retryJson.failedInBatch ?? 0) > 0
        ) {
          setFullPostcodeMessage(
            `Auto retry stopped because the latest batch still failed. This is likely API rate limiting. Run #${runId} can be retried again later.`,
          );
          break;
        }

        await sleepMs(1000);
      }

      if (autoRetryFullPostcodeStopRef.current) {
        setFullPostcodeMessage(
          `Auto retry stopped manually. Run #${runId} can retry failed postcodes again later.`,
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setFullPostcodeError(message);
      setFullPostcodeMessage(
        `Auto retry stopped because of an error. Run #${runId} can retry failed postcodes again later.`,
      );
    } finally {
      setAutoRetryingFullPostcode(false);
      setFullPostcodeLoading(false);
      autoRetryFullPostcodeStopRef.current = false;
    }
  }

  function stopAutoRetryFailedFullPostcodeBatches() {
    autoRetryFullPostcodeStopRef.current = true;
    setFullPostcodeMessage(
      "Stopping auto retry after the current retry batch finishes...",
    );
  }

  function getRunGroupLabel(sampleGroup: RunSampleGroup) {
    if (sampleGroup === "highRisk") return "high-risk AU postcodes";
    if (sampleGroup === "tierExpansion") {
      return "tier expansion AU postcodes";
    }
    if (sampleGroup === "all") {
      return "all AU postcode sample groups";
    }
    return "standard AU postcodes";
  }

  function getRunGroupCompletedMessage(sampleGroup: RunSampleGroup) {
    if (sampleGroup === "highRisk") {
      return "High-risk AU postcode summary completed";
    }
    if (sampleGroup === "tierExpansion") {
      return "Tier expansion AU postcode summary completed";
    }
    if (sampleGroup === "all") {
      return "All AU postcode sample groups completed";
    }
    return "Standard AU postcode summary completed";
  }

  async function collectSummaryBatchGroup(
    sampleGroup: RunSampleGroup,
  ): Promise<BatchSummaryResponse> {
    const batchSize = 10;
    const maxBatches = sampleGroup === "all" ? 40 : 20;
    const label = getRunGroupLabel(sampleGroup);

    const allBatches: BatchSummaryResponse[] = [];
    const mergedSummary: SummaryRow[] = [];

    for (let batchIndex = 0; batchIndex < maxBatches; batchIndex += 1) {
      const offset = batchIndex * batchSize;
      const humanBatchNumber = batchIndex + 1;

      setStatusText(
        `Running ${label} batch ${humanBatchNumber}... Current offset: ${offset}`,
      );

      const batch = await runBatch(batchSize, offset, sampleGroup);
      const batchSummary: SummaryRow[] = (batch.summary || []).map((row) => {
        const normalizedSampleGroup: SampleGroup =
          row.sampleGroup === "highRisk"
            ? "highRisk"
            : row.sampleGroup === "tierExpansion"
              ? "tierExpansion"
              : "standard";

        return {
          ...row,
          sampleGroup: normalizedSampleGroup,
        };
      });

      allBatches.push(batch);
      mergedSummary.push(...batchSummary);

      if (batchSummary.length < batchSize) {
        break;
      }
    }

    const firstBatch = allBatches[0];
    const lastBatch = allBatches[allBatches.length - 1];

    return {
      ok: true,
      message: getRunGroupCompletedMessage(sampleGroup),
      sku: firstBatch?.sku || lastBatch?.sku || sku.trim(),
      preferredMethod:
        firstBatch?.preferredMethod ||
        lastBatch?.preferredMethod ||
        "CJPacket Fast Ordinary",
      sampleGroup,
      totalAvailable: firstBatch?.totalAvailable || lastBatch?.totalAvailable,
      sampleCount: mergedSummary.length,
      delayMs: 1500,
      requestedLimit: mergedSummary.length,
      offset: 0,
      summary: mergedSummary,
    };
  }

  async function runSingleSummaryBatchGroup(sampleGroup: RunSampleGroup) {
    setLoading(true);
    setError("");
    setSaveMessage("");

    const label = getRunGroupLabel(sampleGroup);

    setStatusText(`Running ${label} summary batches...`);

    try {
      const result = await collectSummaryBatchGroup(sampleGroup);

      setResponse(result);
      setStatusText(
        `Completed. Loaded ${result.summary?.length || 0} ${label} summary rows.`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setStatusText("");
    } finally {
      setLoading(false);
    }
  }

  async function runFullSummaryBatch() {
    setLoading(true);
    setError("");
    setSaveMessage("");
    setStatusText("Running all AU postcode sample groups...");

    try {
      const result = await collectSummaryBatchGroup("all");

      setResponse(result);
      setStatusText(
        `Completed. Loaded ${
          result.summary?.length || 0
        } total AU sample rows, including standard, high-risk, and tier expansion postcodes.`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setStatusText("");
    } finally {
      setLoading(false);
    }
  }

  async function runStandardSummaryBatch() {
    await runSingleSummaryBatchGroup("standard");
  }

  async function runHighRiskSummaryBatch() {
    await runSingleSummaryBatchGroup("highRisk");
  }

  function clearCurrentSummary() {
    setError("");
    setSaveMessage("");
    setStatusText("");
    setRunName("");
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
      const res = await fetch(
        `${API_BASE}/admin/shipping/cj/save-summary-run`,
        {
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
            runName: runName.trim() || null,
            sourceWarehouseId: selectedWarehouseId || null,
            sourceWarehouseLabel: selectedWarehouseId
              ? cnWarehouses.find(
                  (row) =>
                    row.stockId !== null &&
                    row.stockId !== undefined &&
                    String(row.stockId) === selectedWarehouseId,
                )?.stockName || selectedWarehouseId
              : "China (auto / no warehouse filter)",
            preferredMethod:
              response.preferredMethod || "CJPacket Fast Ordinary",
            notes: notes.trim() || null,
            summary: response.summary,
          }),
        },
      );

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
      const res = await fetch(
        `${API_BASE}/admin/shipping/cj/summary-runs?storefrontCode=AU&limit=50`,
        {
          method: "GET",
        },
      );

      const json = (await res.json()) as SavedRunsResponse;

      if (!res.ok || !json.ok) {
        throw new Error(
          json?.error || json?.message || "Fetch saved runs failed",
        );
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
      const res = await fetch(
        `${API_BASE}/admin/shipping/cj/summary-runs/${runId}`,
        {
          method: "GET",
        },
      );

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

  function openDeleteDialog(runId: number) {
    setPendingDeleteRunId(runId);
    setDeleteDialogOpen(true);
  }

  async function confirmDeleteRun() {
    if (!pendingDeleteRunId) return;

    const runId = pendingDeleteRunId;

    setDeletingRunId(runId);
    setError("");
    setSaveMessage("");

    try {
      const res = await fetch(
        `${API_BASE}/admin/shipping/cj/summary-runs/${runId}`,
        {
          method: "DELETE",
        },
      );

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || json?.message || "Delete failed");
      }

      if (selectedRunId === runId) {
        setSelectedRunId(null);
        setSelectedRunDetail(null);
      }

      await loadSavedRuns();
      setDeleteDialogOpen(false);
      setPendingDeleteRunId(null);
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
      <div className="flex flex-col gap-6">
        <div className="rounded-lg border bg-white p-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                SKU
              </label>
              <input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                placeholder="CJ SKU"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Quantity
              </label>
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
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Volume
              </label>
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
                onChange={(e) =>
                  setAttribute(e.target.value as ShippingAttribute)
                }
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
              >
                {SHIPPING_ATTRIBUTE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 xl:col-span-2">
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
                  .filter(
                    (row) => row.stockId !== null && row.stockId !== undefined,
                  )
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
                      <option
                        key={`${stockId}-${row.productSku || "sku"}`}
                        value={stockId}
                      >
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
                {warehouseLoading
                  ? "Loading Warehouses..."
                  : "Load CN Warehouses"}
              </button>
            </div>

            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <div>
                Run Full Summary checks all AU postcode sample groups: standard,
                high-risk, and tier expansion candidates. You can also run
                standard-only or high-risk-only checks separately. The generated
                result is not auto-saved.
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
                  Loaded {cnWarehouses.length} CN warehouse rows for current
                  SKU.
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
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={runFullSummaryBatch}
                disabled={loading || saving}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Running..." : "Run Full Summary"}
              </button>

              <button
                type="button"
                onClick={runStandardSummaryBatch}
                disabled={loading || saving}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Running..." : "Run Standard Samples"}
              </button>

              <button
                type="button"
                onClick={runHighRiskSummaryBatch}
                disabled={loading || saving}
                className="rounded-md border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Running..." : "Run High-Risk Samples"}
              </button>
            </div>

            <div className="mt-3 text-sm text-slate-500">
              Run Full Summary checks standard, high-risk, and tier expansion AU
              postcode samples. Run Standard Samples and Run High-Risk Samples
              are available for separate checks when you only want to review one
              group.
            </div>
          </div>
        </div>

        <div className="order-last rounded-lg border bg-white p-4">
          <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Full postcode quote run
                </div>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">
                  AU Full Postcode Quote Run Test
                </h2>
                <p className="mt-1 max-w-3xl text-sm text-slate-600">
                  Run CJ quotes against the AU postcode reference list and save
                  the results into au_postcode_quote_runs /
                  au_postcode_quote_results.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
                <div className="text-xs font-medium text-slate-500">
                  Current Run ID
                </div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {fullPostcodeRunId || "-"}
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  New Run Name
                </label>
                <input
                  value={fullPostcodeRunName}
                  onChange={(e) => setFullPostcodeRunName(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
                  placeholder="e.g. AU full postcode quote - 1kg Ordinary - CN warehouse test"
                />
                <div className="mt-1 text-xs text-slate-500">
                  Saved into au_postcode_quote_runs.run_name when creating a new
                  run.
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Existing Run ID
                </label>
                <input
                  value={fullPostcodeRunIdInput}
                  onChange={(e) => setFullPostcodeRunIdInput(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
                  placeholder="Enter an existing run ID to fetch or continue"
                  inputMode="numeric"
                />
                <div className="mt-1 text-xs text-slate-500">
                  Use this after refreshing the page, or to continue a previous
                  interrupted run.
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {/* Run Management */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-900">
                  Run Management
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Create a new run or fetch an existing run by Run ID.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={createFullPostcodeQuoteRun}
                  disabled={isFullPostcodeActionBusy}
                  className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isFullPostcodeManualWorking
                    ? "Working..."
                    : "Create AU Quote Run"}
                </button>

                <button
                  type="button"
                  onClick={() => fetchFullPostcodeRunDetail()}
                  disabled={isFullPostcodeActionBusy}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isFullPostcodeManualWorking
                    ? "Loading..."
                    : "Fetch Current Run"}
                </button>
              </div>
            </div>

            {/* Normal Processing */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-900">
                  Normal Processing
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Continue from the saved next offset and process new postcode
                  rows.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={processFullPostcodeQuoteBatch}
                  disabled={
                    isFullPostcodeActionBusy || !hasActiveFullPostcodeRun
                  }
                  className="rounded-md border border-purple-300 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isFullPostcodeManualWorking
                    ? "Working..."
                    : "Process Next 5 Postcodes"}
                </button>

                <button
                  type="button"
                  onClick={autoRunFullPostcodeBatches}
                  disabled={
                    isFullPostcodeActionBusy || !hasActiveFullPostcodeRun
                  }
                  className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {autoRunningFullPostcode
                    ? "Auto Running..."
                    : "Auto Run 5 by 5"}
                </button>

                <button
                  type="button"
                  onClick={stopAutoRunFullPostcodeBatches}
                  disabled={!autoRunningFullPostcode}
                  className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Stop Auto Run
                </button>
              </div>
            </div>

            {/* Failed Retry */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-amber-950">
                  Failed Retry
                </h3>
                <p className="mt-1 text-xs text-amber-800">
                  Retry only postcode rows already saved as failed, such as
                  temporary 429 errors.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={retryFailedFullPostcodeBatch}
                  disabled={
                    isFullPostcodeActionBusy || !hasActiveFullPostcodeRun
                  }
                  className="rounded-md border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isFullPostcodeManualWorking
                    ? "Working..."
                    : "Retry Failed 5 by 5"}
                </button>

                <button
                  type="button"
                  onClick={autoRetryFailedFullPostcodeBatches}
                  disabled={
                    isFullPostcodeActionBusy || !hasActiveFullPostcodeRun
                  }
                  className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {autoRetryingFullPostcode
                    ? "Auto Retrying..."
                    : "Auto Retry Failed"}
                </button>

                <button
                  type="button"
                  onClick={stopAutoRetryFailedFullPostcodeBatches}
                  disabled={!autoRetryingFullPostcode}
                  className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Stop Failed Retry
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <div className="font-medium text-slate-800">
              How these actions work
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <span className="font-medium">Run Management</span>: create a
                new AU quote run or fetch an existing run by Run ID.
              </li>
              <li>
                <span className="font-medium">Normal Processing</span>:
                processes new postcode rows from the current saved next offset.
              </li>
              <li>
                <span className="font-medium">Failed Retry</span>: only retries
                rows that were previously saved as failed, such as temporary 429
                Too Many Requests errors.
              </li>
              <li>
                Each normal request still processes only 5 rows with a 1500ms
                delay for safety.
              </li>
            </ul>
          </div>

          {fullPostcodeMessage ? (
            <div className="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {fullPostcodeMessage}
            </div>
          ) : null}

          {fullPostcodeError ? (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {fullPostcodeError}
            </div>
          ) : null}

          {fullPostcodeDetail?.run ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <div className="rounded-md border bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Status</div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {fullPostcodeDetail.run.status}
                </div>
              </div>

              <div className="rounded-md border bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Processed</div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {fullPostcodeDetail.run.processed_count} /{" "}
                  {fullPostcodeDetail.run.total_count}
                </div>
              </div>

              <div className="rounded-md border bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Success</div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {fullPostcodeDetail.run.success_count}
                </div>
              </div>

              <div className="rounded-md border bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Failed</div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {fullPostcodeDetail.run.failed_count}
                </div>
              </div>

              <div className="rounded-md border bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Next Offset</div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {fullPostcodeDetail.run.next_offset}
                </div>
              </div>

              <div className="rounded-md border bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Delay</div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {fullPostcodeDetail.run.delay_ms} ms
                </div>
              </div>
            </div>
          ) : null}

          {fullPostcodeDetail?.tierSummary?.length ? (
            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Current Tier Summary
              </h3>

              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {fullPostcodeDetail.tierSummary.map((tier) => (
                  <div
                    key={tier.tier_code}
                    className="rounded-md border bg-white p-3 text-sm"
                  >
                    <div className="font-semibold text-slate-900">
                      {formatCjfoTierDisplayName(tier.tier_code)}
                    </div>
                    <div className="mt-2 text-slate-600">
                      Rows: {tier.count}
                    </div>
                    <div className="text-slate-600">
                      Success: {tier.success_count ?? 0}
                    </div>
                    <div className="text-slate-600">
                      Failed: {tier.failed_count ?? 0}
                    </div>
                    <div className="text-slate-600">
                      Fee:{" "}
                      {typeof tier.min_fee === "number"
                        ? `${tier.min_fee.toFixed(2)} - ${Number(
                            tier.max_fee ?? tier.min_fee,
                          ).toFixed(2)}`
                        : "-"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {fullPostcodeDetail?.results?.length ? (
            <div className="mt-4">
              <div className="mb-2 text-sm text-slate-500">
                Showing {fullPostcodeDetail.results.length} result rows
                {fullPostcodeDetail.run
                  ? ` for run #${fullPostcodeDetail.run.id}`
                  : ""}
                .
              </div>

              <div className="max-h-[520px] overflow-auto rounded-md border">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="border-b text-left">
                      <th className="px-3 py-2 font-medium text-slate-700">
                        Index
                      </th>
                      <th className="px-3 py-2 font-medium text-slate-700">
                        State
                      </th>
                      <th className="px-3 py-2 font-medium text-slate-700">
                        Postcode
                      </th>
                      <th className="px-3 py-2 font-medium text-slate-700">
                        City
                      </th>
                      <th className="px-3 py-2 font-medium text-slate-700">
                        Tier
                      </th>
                      <th className="px-3 py-2 font-medium text-slate-700">
                        Method
                      </th>
                      <th className="px-3 py-2 font-medium text-slate-700">
                        Fee
                      </th>
                      <th className="px-3 py-2 font-medium text-slate-700">
                        ETA
                      </th>
                      <th className="px-3 py-2 font-medium text-slate-700">
                        OK
                      </th>
                      <th className="px-3 py-2 font-medium text-slate-700">
                        Error
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {fullPostcodeDetail.results.map((item) => (
                      <tr key={item.id} className="border-b align-top">
                        <td className="px-3 py-2 text-slate-700">
                          {item.reference_index}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {item.state_code}
                        </td>
                        <td className="px-3 py-2 text-slate-900">
                          {item.postcode}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {item.city || "-"}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {item.tier_code
                            ? formatCjfoTierDisplayName(item.tier_code)
                            : "-"}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {item.selected_method || "-"}
                        </td>
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
                        <td className="px-3 py-2 text-xs text-red-600">
                          {item.error || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-lg border bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Current Summary Results
            </h2>

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

          {rows.length ? (
            <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    CJPacket Fast Ordinary Tier Summary
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    This summary groups the current result by selected CJPacket
                    Fast Ordinary fee. Tier names are generated from the
                    internal AU_CJFO tier codes.
                  </p>
                </div>

                <div className="text-sm text-slate-600">
                  <div>Total rows: {cjfoTierSummary.totalRows}</div>
                  <div>OK rows: {cjfoTierSummary.okRows}</div>
                  <div>Failed rows: {cjfoTierSummary.failedRows}</div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {cjfoTierSummary.tierSummaries.map((tier) => (
                  <div
                    key={tier.tierCode}
                    className="rounded-md border bg-white p-3"
                  >
                    <div className="text-xs font-medium text-slate-500">
                      Tier Name
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {formatCjfoTierDisplayName(tier.tierCode)}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-xs text-slate-500">CJ Fee</div>
                        <div className="font-medium text-slate-900">
                          {typeof tier.fee === "number"
                            ? tier.fee.toFixed(2)
                            : "-"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">Rows</div>
                        <div className="font-medium text-slate-900">
                          {tier.totalCount}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">Standard</div>
                        <div className="font-medium text-slate-900">
                          {tier.standardCount}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">High-risk</div>
                        <div className="font-medium text-slate-900">
                          {tier.highRiskCount}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">
                          Tier expansion
                        </div>
                        <div className="font-medium text-slate-900">
                          {tier.tierExpansionCount}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-slate-600">
                      <div className="font-medium text-slate-700">States</div>
                      <div className="mt-1">
                        {tier.stateSummary.length
                          ? tier.stateSummary
                              .map((item) => `${item.stateCode} ${item.count}`)
                              .join(" · ")
                          : "-"}
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-slate-600">
                      <div className="font-medium text-slate-700">
                        Postcode preview
                      </div>
                      <div className="mt-1">
                        {tier.postcodePreview.length
                          ? tier.postcodePreview.join(", ")
                          : "-"}
                      </div>
                    </div>
                  </div>
                ))}

                <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                  <div className="text-xs font-medium text-amber-700">
                    Tier Name
                  </div>
                  <div className="mt-1 text-sm font-semibold text-amber-900">
                    {formatCjfoTierDisplayName(
                      cjfoTierSummary.exceptionSummary.tierCode,
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-amber-700">Rows</div>
                      <div className="font-medium text-amber-900">
                        {cjfoTierSummary.exceptionSummary.totalCount}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-amber-700">Failed</div>
                      <div className="font-medium text-amber-900">
                        {cjfoTierSummary.failedRows}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-amber-700">Standard</div>
                      <div className="font-medium text-amber-900">
                        {cjfoTierSummary.exceptionSummary.standardCount}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-amber-700">High-risk</div>
                      <div className="font-medium text-amber-900">
                        {cjfoTierSummary.exceptionSummary.highRiskCount}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-amber-700">
                        Tier expansion
                      </div>
                      <div className="font-medium text-amber-900">
                        {cjfoTierSummary.exceptionSummary.tierExpansionCount}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-amber-800">
                    Use this bucket for failed rows, missing fee, unsupported
                    method, or any row that is not selected as CJPacket Fast
                    Ordinary.
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left">
                  <th className="px-3 py-2 font-medium text-slate-700">
                    Postcode
                  </th>
                  <th className="px-3 py-2 font-medium text-slate-700">
                    State
                  </th>
                  <th className="px-3 py-2 font-medium text-slate-700">City</th>
                  <th className="px-3 py-2 font-medium text-slate-700">
                    Label
                  </th>
                  <th className="px-3 py-2 font-medium text-slate-700">
                    Sample Group
                  </th>
                  <th className="px-3 py-2 font-medium text-slate-700">
                    Method
                  </th>
                  <th className="px-3 py-2 font-medium text-slate-700">Fee</th>
                  <th className="px-3 py-2 font-medium text-slate-700">
                    Postage
                  </th>
                  <th className="px-3 py-2 font-medium text-slate-700">
                    Remote Fee
                  </th>
                  <th className="px-3 py-2 font-medium text-slate-700">ETA</th>
                  <th className="px-3 py-2 font-medium text-slate-700">
                    Tracked Methods
                  </th>
                  <th className="px-3 py-2 font-medium text-slate-700">
                    Fallback
                  </th>
                  <th className="px-3 py-2 font-medium text-slate-700">OK</th>
                  <th className="px-3 py-2 font-medium text-slate-700">
                    Error
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={`${row.sampleGroup || "standard"}-${row.stateCode}-${row.postcode}-${row.label}-${index}`}
                    className="border-b align-top"
                  >
                    <td className="px-3 py-2 text-slate-900">{row.postcode}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {row.stateCode}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{row.city}</td>
                    <td className="px-3 py-2 text-slate-700">{row.label}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {formatSampleGroupLabel(row.sampleGroup)}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {row.selectedMethod || "-"}
                    </td>
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
                              <span className="font-medium text-slate-900">
                                {method.method}
                              </span>
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
                    <td className="px-3 py-2 text-xs text-red-600">
                      {row.error || "-"}
                    </td>
                  </tr>
                ))}

                {!rows.length ? (
                  <tr>
                    <td
                      colSpan={14}
                      className="px-3 py-6 text-center text-sm text-slate-500"
                    >
                      No current summary rows yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="mt-60 border-t pt-8">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Save Current Summary
              </h3>
              <div className="text-sm text-slate-500">
                {response?.summary?.length
                  ? `${response.summary.length} rows ready`
                  : "No summary to save"}
              </div>
            </div>

            <p className="mb-4 text-sm text-slate-500">
              Review the current summary results above, then add an optional
              note and save this run.
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Run Name
                </label>
                <input
                  value={runName}
                  onChange={(e) => setRunName(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  placeholder="Optional custom name for this saved summary run"
                />
              </div>

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
                  Save this run after reviewing the current summary results
                  above.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-lg border bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                Saved Summary Records
              </h2>
              <div className="text-sm text-slate-500">
                {savedRuns.length ? `${savedRuns.length} runs` : "No records"}
              </div>
            </div>

            {!savedRuns.length ? (
              <div className="text-sm text-slate-500">
                No saved records yet. Saved runs will appear here after you save
                a summary.
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
                          {run.run_name || `Run #${run.id}`}
                        </div>
                        <div className="text-sm text-slate-700">
                          SKU: {run.sku}
                        </div>
                        <div className="text-xs text-slate-500">
                          {run.provider} · {run.attribute || "-"} ·{" "}
                          {run.preferred_method || "-"} · {run.item_count} items
                        </div>
                        <div className="text-xs text-slate-500">
                          Warehouse:{" "}
                          {run.source_warehouse_label ||
                            run.source_warehouse_id ||
                            "China (auto / no warehouse filter)"}
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
                          {detailLoading && selectedRunId === run.id
                            ? "Loading..."
                            : "View"}
                        </button>

                        <button
                          type="button"
                          onClick={() => openDeleteDialog(run.id)}
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
              <h2 className="text-base font-semibold text-slate-900">
                Saved Record Detail
              </h2>
              <div className="text-sm text-slate-500">
                {selectedRunDetail?.run
                  ? selectedRunDetail.run.run_name ||
                    `Run #${selectedRunDetail.run.id}`
                  : "No selection"}
              </div>
            </div>

            {!selectedRunDetail?.run ? (
              <div className="text-sm text-slate-500">
                Select a saved run to view its detail.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-md border bg-slate-50 p-3 text-sm text-slate-700">
                  <div>
                    <span className="font-medium text-slate-900">
                      Run Name:
                    </span>{" "}
                    {selectedRunDetail.run.run_name ||
                      `Run #${selectedRunDetail.run.id}`}
                  </div>
                  <div>
                    <span className="font-medium text-slate-900">SKU:</span>{" "}
                    {selectedRunDetail.run.sku}
                  </div>
                  <div>
                    <span className="font-medium text-slate-900">
                      Provider:
                    </span>{" "}
                    {selectedRunDetail.run.provider}
                  </div>
                  <div>
                    <span className="font-medium text-slate-900">
                      Quantity:
                    </span>{" "}
                    {selectedRunDetail.run.quantity}
                  </div>
                  <div>
                    <span className="font-medium text-slate-900">
                      Weight (g):
                    </span>{" "}
                    {selectedRunDetail.run.weight_g}
                  </div>
                  <div>
                    <span className="font-medium text-slate-900">
                      Wrap Weight (g):
                    </span>{" "}
                    {selectedRunDetail.run.wrap_weight_g}
                  </div>
                  <div>
                    <span className="font-medium text-slate-900">Volume:</span>{" "}
                    {selectedRunDetail.run.volume}
                  </div>
                  <div>
                    <span className="font-medium text-slate-900">
                      Attribute:
                    </span>{" "}
                    {selectedRunDetail.run.attribute || "-"}
                  </div>
                  <div>
                    <span className="font-medium text-slate-900">
                      Source Warehouse:
                    </span>{" "}
                    {selectedRunDetail.run.source_warehouse_label ||
                      selectedRunDetail.run.source_warehouse_id ||
                      "China (auto / no warehouse filter)"}
                  </div>
                  <div>
                    <span className="font-medium text-slate-900">
                      Preferred Method:
                    </span>{" "}
                    {selectedRunDetail.run.preferred_method || "-"}
                  </div>
                  <div>
                    <span className="font-medium text-slate-900">Created:</span>{" "}
                    {formatTs(selectedRunDetail.run.created_at_ts)}
                  </div>
                  <div>
                    <span className="font-medium text-slate-900">Notes:</span>{" "}
                    {selectedRunDetail.run.notes || "-"}
                  </div>
                </div>

                {savedDetailRows.length ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          Saved CJPacket Fast Ordinary Tier Summary
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          This summary is generated from the saved record detail
                          items, including their saved sample group. Tier names
                          are generated from the internal AU_CJFO tier codes.
                        </p>
                      </div>

                      <div className="text-sm text-slate-600">
                        <div>
                          Total rows: {savedDetailTierSummary.totalRows}
                        </div>
                        <div>OK rows: {savedDetailTierSummary.okRows}</div>
                        <div>
                          Failed rows: {savedDetailTierSummary.failedRows}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-2">
                      {savedDetailTierSummary.tierSummaries.map((tier) => (
                        <div
                          key={tier.tierCode}
                          className="rounded-md border bg-white p-3"
                        >
                          <div className="text-xs font-medium text-slate-500">
                            Tier Name
                          </div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            {formatCjfoTierDisplayName(tier.tierCode)}
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <div className="text-xs text-slate-500">
                                CJ Fee
                              </div>
                              <div className="font-medium text-slate-900">
                                {typeof tier.fee === "number"
                                  ? tier.fee.toFixed(2)
                                  : "-"}
                              </div>
                            </div>

                            <div>
                              <div className="text-xs text-slate-500">Rows</div>
                              <div className="font-medium text-slate-900">
                                {tier.totalCount}
                              </div>
                            </div>

                            <div>
                              <div className="text-xs text-slate-500">
                                Standard
                              </div>
                              <div className="font-medium text-slate-900">
                                {tier.standardCount}
                              </div>
                            </div>

                            <div>
                              <div className="text-xs text-slate-500">
                                High-risk
                              </div>
                              <div className="font-medium text-slate-900">
                                {tier.highRiskCount}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500">
                                Tier expansion
                              </div>
                              <div className="font-medium text-slate-900">
                                {tier.tierExpansionCount}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 text-xs text-slate-600">
                            <div className="font-medium text-slate-700">
                              States
                            </div>
                            <div className="mt-1">
                              {tier.stateSummary.length
                                ? tier.stateSummary
                                    .map(
                                      (item) =>
                                        `${item.stateCode} ${item.count}`,
                                    )
                                    .join(" · ")
                                : "-"}
                            </div>
                          </div>

                          <div className="mt-3 text-xs text-slate-600">
                            <div className="font-medium text-slate-700">
                              Postcode preview
                            </div>
                            <div className="mt-1">
                              {tier.postcodePreview.length
                                ? tier.postcodePreview.join(", ")
                                : "-"}
                            </div>
                          </div>
                        </div>
                      ))}

                      <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                        <div className="text-xs font-medium text-amber-700">
                          Tier Name
                        </div>
                        <div className="mt-1 text-sm font-semibold text-amber-900">
                          {formatCjfoTierDisplayName(
                            savedDetailTierSummary.exceptionSummary.tierCode,
                          )}
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <div className="text-xs text-amber-700">Rows</div>
                            <div className="font-medium text-amber-900">
                              {
                                savedDetailTierSummary.exceptionSummary
                                  .totalCount
                              }
                            </div>
                          </div>

                          <div>
                            <div className="text-xs text-amber-700">Failed</div>
                            <div className="font-medium text-amber-900">
                              {savedDetailTierSummary.failedRows}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs text-amber-700">
                              Standard
                            </div>
                            <div className="font-medium text-amber-900">
                              {
                                savedDetailTierSummary.exceptionSummary
                                  .standardCount
                              }
                            </div>
                          </div>

                          <div>
                            <div className="text-xs text-amber-700">
                              High-risk
                            </div>
                            <div className="font-medium text-amber-900">
                              {
                                savedDetailTierSummary.exceptionSummary
                                  .highRiskCount
                              }
                            </div>
                          </div>

                          <div>
                            <div className="text-xs text-amber-700">
                              Tier expansion
                            </div>
                            <div className="font-medium text-amber-900">
                              {
                                savedDetailTierSummary.exceptionSummary
                                  .tierExpansionCount
                              }
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 text-xs text-amber-800">
                          Use this bucket for failed rows, missing fee,
                          unsupported method, or any row that is not selected as
                          CJPacket Fast Ordinary.
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="max-h-[420px] overflow-auto rounded-md border">
                  <table className="min-w-full border-collapse text-sm">
                    <thead className="sticky top-0 bg-slate-50">
                      <tr className="border-b text-left">
                        <th className="px-3 py-2 font-medium text-slate-700">
                          Postcode
                        </th>
                        <th className="px-3 py-2 font-medium text-slate-700">
                          State
                        </th>
                        <th className="px-3 py-2 font-medium text-slate-700">
                          City
                        </th>
                        <th className="px-3 py-2 font-medium text-slate-700">
                          Sample Group
                        </th>
                        <th className="px-3 py-2 font-medium text-slate-700">
                          Method
                        </th>
                        <th className="px-3 py-2 font-medium text-slate-700">
                          Fee
                        </th>
                        <th className="px-3 py-2 font-medium text-slate-700">
                          ETA
                        </th>
                        <th className="px-3 py-2 font-medium text-slate-700">
                          Tracked Methods
                        </th>
                        <th className="px-3 py-2 font-medium text-slate-700">
                          OK
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedRunDetail.items || []).map((item) => (
                        <tr key={item.id} className="border-b align-top">
                          <td className="px-3 py-2 text-slate-900">
                            {item.postcode}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {item.state_code || "-"}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {item.city || "-"}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {formatSampleGroupLabel(item.sample_group)}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {item.selected_method || "-"}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {typeof item.selected_discount_fee === "number"
                              ? item.selected_discount_fee.toFixed(2)
                              : "-"}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {item.selected_arrival_time || "-"}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-700">
                            {item.trackedMethods?.length ? (
                              <div className="space-y-1">
                                {item.trackedMethods.map((method) => (
                                  <div key={method.method}>
                                    <span className="font-medium text-slate-900">
                                      {method.method}
                                    </span>
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
                          <td
                            colSpan={9}
                            className="px-3 py-6 text-center text-sm text-slate-500"
                          >
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

      {deleteDialogOpen && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center">
              <div
                className="absolute inset-0 bg-black/40"
                onClick={() => {
                  if (deletingRunId !== pendingDeleteRunId) {
                    setDeleteDialogOpen(false);
                    setPendingDeleteRunId(null);
                  }
                }}
              />

              <div className="relative z-10 w-full max-w-md rounded-xl border bg-white p-6 shadow-xl">
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Delete saved summary run?
                  </h3>

                  <p className="text-sm text-slate-600">
                    This action cannot be undone. Saved summary run
                    {pendingDeleteRunId ? ` #${pendingDeleteRunId}` : ""} will
                    be permanently deleted.
                  </p>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteDialogOpen(false);
                      setPendingDeleteRunId(null);
                    }}
                    disabled={deletingRunId === pendingDeleteRunId}
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={confirmDeleteRun}
                    disabled={deletingRunId === pendingDeleteRunId}
                    className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-60"
                  >
                    {deletingRunId === pendingDeleteRunId
                      ? "Deleting..."
                      : "Delete"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </AdminPage>
  );
}
