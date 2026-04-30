"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Save,
  Truck,
} from "lucide-react";

type DeliveryOptionPatch = {
  fee_minor?: number;
  min_days?: number;
  max_days?: number;
  handling_days?: number;
  carrier_service?: string | null;
  eta_note?: string | null;
};

type ShippingRuleRow = {
  zone_id: number;
  storefront_code: string;
  zone_code: string;
  zone_name: string;
  zone_is_active: number;

  standard_rule_id: number | null;
  standard_min_days: number | null;
  standard_max_days: number | null;
  standard_handling_days: number | null;
  standard_warehouse_code: string | null;
  standard_carrier_service: string | null;
  standard_eta_note: string | null;
  standard_tier_id: number | null;
  standard_fee_minor: number | null;
  standard_currency: string | null;
  standard_free_threshold_minor: number | null;

  express_rule_id: number | null;
  express_min_days: number | null;
  express_max_days: number | null;
  express_handling_days: number | null;
  express_warehouse_code: string | null;
  express_carrier_service: string | null;
  express_eta_note: string | null;
  express_tier_id: number | null;
  express_fee_minor: number | null;
  express_currency: string | null;
  express_free_threshold_minor: number | null;
};

type EditableRuleRow = ShippingRuleRow & {
  draft_zone_name: string;
  draft_is_active: boolean;

  draft_standard_fee_minor: string;
  draft_standard_min_days: string;
  draft_standard_max_days: string;
  draft_standard_handling_days: string;
  draft_standard_carrier_service: string;
  draft_standard_eta_note: string;

  draft_express_fee_minor: string;
  draft_express_min_days: string;
  draft_express_max_days: string;
  draft_express_handling_days: string;
  draft_express_carrier_service: string;
  draft_express_eta_note: string;
};

type RulesResponse = {
  ok: boolean;
  message?: string;
  storefrontCode?: string;
  count?: number;
  rows?: ShippingRuleRow[];
  error?: string;
};

type PatchResponse = {
  ok: boolean;
  message?: string;
  error?: string;
  updated?: ShippingRuleRow | null;
};

const API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "") ||
  "http://127.0.0.1:8787";

const STOREFRONT_CODE = "AU";

function toDraftValue(value: unknown) {
  if (value == null) return "";
  return String(value);
}

function toEditableRow(row: ShippingRuleRow): EditableRuleRow {
  return {
    ...row,
    draft_zone_name: row.zone_name || "",
    draft_is_active: Boolean(row.zone_is_active),

    draft_standard_fee_minor: toDraftValue(row.standard_fee_minor),
    draft_standard_min_days: toDraftValue(row.standard_min_days),
    draft_standard_max_days: toDraftValue(row.standard_max_days),
    draft_standard_handling_days: toDraftValue(row.standard_handling_days),
    draft_standard_carrier_service: row.standard_carrier_service || "",
    draft_standard_eta_note: row.standard_eta_note || "",

    draft_express_fee_minor: toDraftValue(row.express_fee_minor),
    draft_express_min_days: toDraftValue(row.express_min_days),
    draft_express_max_days: toDraftValue(row.express_max_days),
    draft_express_handling_days: toDraftValue(row.express_handling_days),
    draft_express_carrier_service: row.express_carrier_service || "",
    draft_express_eta_note: row.express_eta_note || "",
  };
}

function parseNonNegativeInt(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return undefined;

  return Math.floor(n);
}

function formatMinorCurrency(minor: number | null, currency: string | null) {
  if (minor == null) return "-";

  const ccy = String(currency || "AUD")
    .trim()
    .toUpperCase();
  const amount = Number(minor) / 100;

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: ccy,
      currencyDisplay: "code",
    }).format(amount);
  } catch {
    return `${ccy} ${amount.toFixed(2)}`;
  }
}

function formatEta(minDays: number | null, maxDays: number | null) {
  if (minDays == null && maxDays == null) return "-";
  if (minDays != null && maxDays != null) {
    if (minDays === maxDays) return `${minDays} business days`;
    return `${minDays}–${maxDays} business days`;
  }
  return `${minDays ?? maxDays} business days`;
}

function getTierDescription(zoneCode: string) {
  const mapping: Record<string, string> = {
    AU_CJFO_TIER_1: "CBD / lowest current CJ cost tier",
    AU_CJFO_TIER_2: "Near regional / mid current CJ cost tier",
    AU_CJFO_TIER_3: "Remote / highest active CJ cost tier",
    AU_CJFO_TIER_4: "Reserved for extended remote pricing",
    AU_CJFO_TIER_5: "Reserved for special remote pricing",
    AU_CJFO_EXCEPTION: "Reserved for live-check-required destinations",
  };

  return mapping[zoneCode] || "Shipping zone";
}

function buildPatchBody(row: EditableRuleRow) {
  const body: {
    storefrontCode: string;
    zone_name: string;
    is_active: boolean;
    standard?: DeliveryOptionPatch;
    express?: DeliveryOptionPatch;
  } = {
    storefrontCode: STOREFRONT_CODE,
    zone_name: row.draft_zone_name.trim() || row.zone_name,
    is_active: row.draft_is_active,
  };

  if (row.standard_rule_id) {
    body.standard = {
      fee_minor: parseNonNegativeInt(row.draft_standard_fee_minor),
      min_days: parseNonNegativeInt(row.draft_standard_min_days),
      max_days: parseNonNegativeInt(row.draft_standard_max_days),
      handling_days: parseNonNegativeInt(row.draft_standard_handling_days),
      carrier_service: row.draft_standard_carrier_service.trim() || null,
      eta_note: row.draft_standard_eta_note.trim() || null,
    };
  }

  if (row.express_rule_id) {
    body.express = {
      fee_minor: parseNonNegativeInt(row.draft_express_fee_minor),
      min_days: parseNonNegativeInt(row.draft_express_min_days),
      max_days: parseNonNegativeInt(row.draft_express_max_days),
      handling_days: parseNonNegativeInt(row.draft_express_handling_days),
      carrier_service: row.draft_express_carrier_service.trim() || null,
      eta_note: row.draft_express_eta_note.trim() || null,
    };
  }

  return body;
}

export default function ShippingRulesManagementPage() {
  const [rows, setRows] = useState<EditableRuleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingZoneCode, setSavingZoneCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeCount = useMemo(
    () => rows.filter((row) => row.draft_is_active).length,
    [rows],
  );

  const editableCount = useMemo(
    () =>
      rows.filter((row) => row.standard_rule_id || row.express_rule_id).length,
    [rows],
  );

  async function loadRules() {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(
        `${API_BASE}/admin/shipping/rules?storefrontCode=${encodeURIComponent(
          STOREFRONT_CODE,
        )}`,
        {
          method: "GET",
          headers: {
            accept: "application/json",
          },
        },
      );

      const data = (await res.json()) as RulesResponse;

      if (!res.ok || !data.ok) {
        throw new Error(data.error || data.message || "Failed to load rules");
      }

      setRows((data.rows || []).map(toEditableRow));
      setMessage("Shipping rules loaded.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRules();
  }, []);

  function updateRow(zoneCode: string, patch: Partial<EditableRuleRow>) {
    setRows((current) =>
      current.map((row) =>
        row.zone_code === zoneCode ? { ...row, ...patch } : row,
      ),
    );
  }

  async function saveRow(row: EditableRuleRow) {
    setSavingZoneCode(row.zone_code);
    setError(null);
    setMessage(null);

    try {
      const body = buildPatchBody(row);

      const res = await fetch(
        `${API_BASE}/admin/shipping/rules/${encodeURIComponent(row.zone_code)}`,
        {
          method: "PATCH",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );

      const data = (await res.json()) as PatchResponse;

      if (!res.ok || !data.ok) {
        throw new Error(data.error || data.message || "Failed to save rule");
      }

      setMessage(`${row.zone_name || row.zone_code} saved successfully.`);
      await loadRules();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
    } finally {
      setSavingZoneCode(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Truck className="h-6 w-6 text-slate-900" />
              <h1 className="text-2xl font-semibold text-slate-900">
                Shipping Rules Management
              </h1>
            </div>

            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Manage customer-facing shipping fees, delivery time, and active
              status for AU shipping tiers. CJ cost sampling remains in the
              Shipping Fee Calculation Dashboard.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadRules()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Storefront
            </div>
            <div className="mt-1 text-lg font-semibold text-slate-900">
              {STOREFRONT_CODE}
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Active zones
            </div>
            <div className="mt-1 text-lg font-semibold text-slate-900">
              {activeCount}
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Editable zones
            </div>
            <div className="mt-1 text-lg font-semibold text-slate-900">
              {editableCount}
            </div>
          </div>
        </div>

        {message ? (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4" />
            <div>{message}</div>
          </div>
        ) : null}

        {error ? (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            <div>{error}</div>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="border-b px-4 py-3">
            <h2 className="text-base font-semibold text-slate-900">
              AU Shipping Tiers
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Tier 4, Tier 5, and Exception are reserved. They can be renamed or
              activated later, but fee / ETA editing requires seeded shipping
              rules.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="border-b px-4 py-3 font-medium text-slate-700">
                    Zone
                  </th>
                  <th className="border-b px-4 py-3 font-medium text-slate-700">
                    Active
                  </th>
                  <th className="border-b px-4 py-3 font-medium text-slate-700">
                    Standard
                  </th>
                  <th className="border-b px-4 py-3 font-medium text-slate-700">
                    Express
                  </th>
                  <th className="border-b px-4 py-3 font-medium text-slate-700">
                    Current values
                  </th>
                  <th className="border-b px-4 py-3 font-medium text-slate-700">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading && !rows.length ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-slate-500"
                    >
                      Loading shipping rules...
                    </td>
                  </tr>
                ) : rows.length ? (
                  rows.map((row) => {
                    const saving = savingZoneCode === row.zone_code;
                    const canEditStandard = Boolean(row.standard_rule_id);
                    const canEditExpress = Boolean(row.express_rule_id);

                    return (
                      <tr key={row.zone_code} className="align-top">
                        <td className="border-b px-4 py-4">
                          <div className="space-y-2">
                            <input
                              value={row.draft_zone_name}
                              onChange={(event) =>
                                updateRow(row.zone_code, {
                                  draft_zone_name: event.target.value,
                                })
                              }
                              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-slate-900"
                            />

                            <div className="text-xs text-slate-500">
                              {row.zone_code}
                            </div>

                            <div className="text-xs text-slate-500">
                              {getTierDescription(row.zone_code)}
                            </div>
                          </div>
                        </td>

                        <td className="border-b px-4 py-4">
                          <label className="inline-flex cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={row.draft_is_active}
                              onChange={(event) =>
                                updateRow(row.zone_code, {
                                  draft_is_active: event.target.checked,
                                })
                              }
                              className="h-4 w-4 rounded border-slate-300"
                            />
                            <span className="text-sm text-slate-700">
                              {row.draft_is_active ? "Active" : "Inactive"}
                            </span>
                          </label>
                        </td>

                        <td className="border-b px-4 py-4">
                          {canEditStandard ? (
                            <div className="grid gap-2">
                              <label className="grid gap-1">
                                <span className="text-xs text-slate-500">
                                  Fee minor
                                </span>
                                <input
                                  value={row.draft_standard_fee_minor}
                                  onChange={(event) =>
                                    updateRow(row.zone_code, {
                                      draft_standard_fee_minor:
                                        event.target.value,
                                    })
                                  }
                                  inputMode="numeric"
                                  className="w-32 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                                />
                              </label>

                              <div className="grid grid-cols-3 gap-2">
                                <label className="grid gap-1">
                                  <span className="text-xs text-slate-500">
                                    Min
                                  </span>
                                  <input
                                    value={row.draft_standard_min_days}
                                    onChange={(event) =>
                                      updateRow(row.zone_code, {
                                        draft_standard_min_days:
                                          event.target.value,
                                      })
                                    }
                                    inputMode="numeric"
                                    className="w-20 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                                  />
                                </label>

                                <label className="grid gap-1">
                                  <span className="text-xs text-slate-500">
                                    Max
                                  </span>
                                  <input
                                    value={row.draft_standard_max_days}
                                    onChange={(event) =>
                                      updateRow(row.zone_code, {
                                        draft_standard_max_days:
                                          event.target.value,
                                      })
                                    }
                                    inputMode="numeric"
                                    className="w-20 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                                  />
                                </label>

                                <label className="grid gap-1">
                                  <span className="text-xs text-slate-500">
                                    Handle
                                  </span>
                                  <input
                                    value={row.draft_standard_handling_days}
                                    onChange={(event) =>
                                      updateRow(row.zone_code, {
                                        draft_standard_handling_days:
                                          event.target.value,
                                      })
                                    }
                                    inputMode="numeric"
                                    className="w-20 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                                  />
                                </label>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
                              Reserved zone. No standard rule exists yet.
                            </div>
                          )}
                        </td>

                        <td className="border-b px-4 py-4">
                          {canEditExpress ? (
                            <div className="grid gap-2">
                              <label className="grid gap-1">
                                <span className="text-xs text-slate-500">
                                  Fee minor
                                </span>
                                <input
                                  value={row.draft_express_fee_minor}
                                  onChange={(event) =>
                                    updateRow(row.zone_code, {
                                      draft_express_fee_minor:
                                        event.target.value,
                                    })
                                  }
                                  inputMode="numeric"
                                  className="w-32 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                                />
                              </label>

                              <div className="grid grid-cols-3 gap-2">
                                <label className="grid gap-1">
                                  <span className="text-xs text-slate-500">
                                    Min
                                  </span>
                                  <input
                                    value={row.draft_express_min_days}
                                    onChange={(event) =>
                                      updateRow(row.zone_code, {
                                        draft_express_min_days:
                                          event.target.value,
                                      })
                                    }
                                    inputMode="numeric"
                                    className="w-20 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                                  />
                                </label>

                                <label className="grid gap-1">
                                  <span className="text-xs text-slate-500">
                                    Max
                                  </span>
                                  <input
                                    value={row.draft_express_max_days}
                                    onChange={(event) =>
                                      updateRow(row.zone_code, {
                                        draft_express_max_days:
                                          event.target.value,
                                      })
                                    }
                                    inputMode="numeric"
                                    className="w-20 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                                  />
                                </label>

                                <label className="grid gap-1">
                                  <span className="text-xs text-slate-500">
                                    Handle
                                  </span>
                                  <input
                                    value={row.draft_express_handling_days}
                                    onChange={(event) =>
                                      updateRow(row.zone_code, {
                                        draft_express_handling_days:
                                          event.target.value,
                                      })
                                    }
                                    inputMode="numeric"
                                    className="w-20 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                                  />
                                </label>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
                              Reserved zone. No express rule exists yet.
                            </div>
                          )}
                        </td>

                        <td className="border-b px-4 py-4">
                          <div className="space-y-2 text-xs text-slate-600">
                            <div>
                              <span className="font-medium text-slate-800">
                                Standard:
                              </span>{" "}
                              {formatMinorCurrency(
                                row.standard_fee_minor,
                                row.standard_currency,
                              )}{" "}
                              ·{" "}
                              {formatEta(
                                row.standard_min_days,
                                row.standard_max_days,
                              )}
                            </div>

                            <div>
                              <span className="font-medium text-slate-800">
                                Express:
                              </span>{" "}
                              {formatMinorCurrency(
                                row.express_fee_minor,
                                row.express_currency,
                              )}{" "}
                              ·{" "}
                              {formatEta(
                                row.express_min_days,
                                row.express_max_days,
                              )}
                            </div>

                            <div>
                              Standard free over:{" "}
                              {formatMinorCurrency(
                                row.standard_free_threshold_minor,
                                row.standard_currency || "AUD",
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="border-b px-4 py-4">
                          <button
                            type="button"
                            onClick={() => void saveRow(row)}
                            disabled={saving}
                            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {saving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                            Save
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-slate-500"
                    >
                      No shipping rules found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <div className="font-medium">Important</div>
          <div className="mt-1">
            Fee minor means cents. For example, 995 = AUD 9.95, 1495 = AUD
            14.95, and 1995 = AUD 19.95. This page edits customer-facing
            shipping fees, not the raw CJ API cost.
          </div>
        </div>
      </div>
    </main>
  );
}
