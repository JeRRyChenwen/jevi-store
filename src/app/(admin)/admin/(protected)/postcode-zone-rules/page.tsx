"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  MapPinned,
} from "lucide-react";

type ZoneMemberRow = {
  id: number;
  zone_id: number;
  storefront_code: string;
  zone_code: string;
  zone_name: string;
  zone_is_active: number;

  country_code: string | null;
  country_name: string | null;
  state_code: string | null;
  postcode_from: number | null;
  postcode_to: number | null;
  postcode_prefix: string | null;
  priority: number;
  is_active: number;
  created_at_ts: number;
  updated_at_ts: number;
};

type EditableZoneMemberRow = ZoneMemberRow & {
  draft_zone_code: string;
  draft_country_code: string;
  draft_country_name: string;
  draft_state_code: string;
  draft_postcode_from: string;
  draft_postcode_to: string;
  draft_postcode_prefix: string;
  draft_priority: string;
  draft_is_active: boolean;
};

type ZoneMembersResponse = {
  ok: boolean;
  message?: string;
  storefrontCode?: string;
  count?: number;
  rows?: ZoneMemberRow[];
  error?: string;
};

type MutationResponse = {
  ok: boolean;
  message?: string;
  error?: string;
  created?: ZoneMemberRow | null;
  updated?: ZoneMemberRow | null;
  memberId?: number;
};

type ZoneOption = {
  zone_code: string;
  zone_name: string;
};

const API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "") ||
  "http://127.0.0.1:8787";

const STOREFRONT_CODE = "AU";

const ZONE_OPTIONS: ZoneOption[] = [
  {
    zone_code: "AU_CJFO_TIER_1",
    zone_name: "Tier 1 - CBD",
  },
  {
    zone_code: "AU_CJFO_TIER_2",
    zone_name: "Tier 2 - Near regional",
  },
  {
    zone_code: "AU_CJFO_TIER_3",
    zone_name: "Tier 3 - Remote",
  },
  {
    zone_code: "AU_CJFO_TIER_4",
    zone_name: "Tier 4 - Extended remote",
  },
  {
    zone_code: "AU_CJFO_TIER_5",
    zone_name: "Tier 5 - Special remote",
  },
  {
    zone_code: "AU_CJFO_EXCEPTION",
    zone_name: "Exception - Live check required",
  },
];

const STATE_OPTIONS = ["", "NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"];

function toDraftValue(value: unknown) {
  if (value == null) return "";
  return String(value);
}

function toEditableRow(row: ZoneMemberRow): EditableZoneMemberRow {
  return {
    ...row,
    draft_zone_code: row.zone_code || "AU_CJFO_TIER_3",
    draft_country_code: row.country_code || "AU",
    draft_country_name: row.country_name || "Australia",
    draft_state_code: row.state_code || "",
    draft_postcode_from: toDraftValue(row.postcode_from),
    draft_postcode_to: toDraftValue(row.postcode_to),
    draft_postcode_prefix: row.postcode_prefix || "",
    draft_priority: toDraftValue(row.priority),
    draft_is_active: Boolean(row.is_active),
  };
}

function newEditableRow(): EditableZoneMemberRow {
  return {
    id: 0,
    zone_id: 0,
    storefront_code: STOREFRONT_CODE,
    zone_code: "AU_CJFO_TIER_3",
    zone_name: "Tier 3 - Remote",
    zone_is_active: 1,

    country_code: "AU",
    country_name: "Australia",
    state_code: null,
    postcode_from: null,
    postcode_to: null,
    postcode_prefix: null,
    priority: 100,
    is_active: 1,
    created_at_ts: 0,
    updated_at_ts: 0,

    draft_zone_code: "AU_CJFO_TIER_3",
    draft_country_code: "AU",
    draft_country_name: "Australia",
    draft_state_code: "",
    draft_postcode_from: "",
    draft_postcode_to: "",
    draft_postcode_prefix: "",
    draft_priority: "100",
    draft_is_active: true,
  };
}

function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;

  return Math.floor(n);
}

function parsePriority(value: string): number {
  const n = parseOptionalInt(value);
  if (n == null || n < 0) return 100;
  return n;
}

function getZoneDisplayName(zoneCode: string) {
  const matched = ZONE_OPTIONS.find((item) => item.zone_code === zoneCode);
  return matched ? matched.zone_name : zoneCode;
}

function getPriorityHint(priority: number) {
  if (priority >= 400) return "Special override";
  if (priority >= 300) return "Tier 1 override";
  if (priority >= 200) return "Tier 2 override";
  if (priority >= 100) return "Regional override";
  return "Fallback";
}

function buildPayload(row: EditableZoneMemberRow) {
  return {
    storefrontCode: STOREFRONT_CODE,
    zoneCode: row.draft_zone_code,
    countryCode: row.draft_country_code.trim().toUpperCase() || "AU",
    countryName: row.draft_country_name.trim() || "Australia",
    stateCode: row.draft_state_code.trim().toUpperCase() || null,
    postcodeFrom: parseOptionalInt(row.draft_postcode_from),
    postcodeTo: parseOptionalInt(row.draft_postcode_to),
    postcodePrefix: row.draft_postcode_prefix.trim() || null,
    priority: parsePriority(row.draft_priority),
    isActive: row.draft_is_active,
  };
}

function validateRow(row: EditableZoneMemberRow): string | null {
  if (!row.draft_zone_code.trim()) {
    return "Zone is required.";
  }

  const postcodeFrom = parseOptionalInt(row.draft_postcode_from);
  const postcodeTo = parseOptionalInt(row.draft_postcode_to);

  if (row.draft_postcode_from.trim() && postcodeFrom == null) {
    return "Postcode From must be a number.";
  }

  if (row.draft_postcode_to.trim() && postcodeTo == null) {
    return "Postcode To must be a number.";
  }

  if (postcodeFrom != null && postcodeTo != null && postcodeFrom > postcodeTo) {
    return "Postcode From cannot be greater than Postcode To.";
  }

  if (
    !row.draft_postcode_prefix.trim() &&
    postcodeFrom == null &&
    postcodeTo == null
  ) {
    return "Please set either a postcode range or a postcode prefix.";
  }

  return null;
}

export default function PostcodeZoneRulesPage() {
  const [rows, setRows] = useState<EditableZoneMemberRow[]>([]);
  const [newRow, setNewRow] = useState<EditableZoneMemberRow>(() =>
    newEditableRow(),
  );

  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<number | "new" | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeCount = useMemo(
    () => rows.filter((row) => row.draft_is_active).length,
    [rows],
  );

  const fallbackRows = useMemo(
    () => rows.filter((row) => Number(row.draft_priority) < 100),
    [rows],
  );

  async function loadMembers() {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(
        `${API_BASE}/admin/shipping/zone-members?storefrontCode=${encodeURIComponent(
          STOREFRONT_CODE,
        )}`,
        {
          method: "GET",
          headers: {
            accept: "application/json",
          },
        },
      );

      const data = (await res.json()) as ZoneMembersResponse;

      if (!res.ok || !data.ok) {
        throw new Error(
          data.error || data.message || "Failed to load postcode zone rules",
        );
      }

      setRows((data.rows || []).map(toEditableRow));
      setMessage("Postcode zone rules loaded.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMembers();
  }, []);

  function updateRow(id: number, patch: Partial<EditableZoneMemberRow>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  function updateNewRow(patch: Partial<EditableZoneMemberRow>) {
    setNewRow((current) => ({ ...current, ...patch }));
  }

  async function createRow() {
    const validation = validateRow(newRow);
    if (validation) {
      setError(validation);
      setMessage(null);
      return;
    }

    setSavingId("new");
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`${API_BASE}/admin/shipping/zone-members`, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify(buildPayload(newRow)),
      });

      const data = (await res.json()) as MutationResponse;

      if (!res.ok || !data.ok) {
        throw new Error(data.error || data.message || "Failed to create rule");
      }

      setMessage("Postcode zone rule created successfully.");
      setNewRow(newEditableRow());
      await loadMembers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
    } finally {
      setSavingId(null);
    }
  }

  async function saveRow(row: EditableZoneMemberRow) {
    const validation = validateRow(row);
    if (validation) {
      setError(validation);
      setMessage(null);
      return;
    }

    setSavingId(row.id);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(
        `${API_BASE}/admin/shipping/zone-members/${encodeURIComponent(
          String(row.id),
        )}`,
        {
          method: "PATCH",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
          },
          body: JSON.stringify(buildPayload(row)),
        },
      );

      const data = (await res.json()) as MutationResponse;

      if (!res.ok || !data.ok) {
        throw new Error(data.error || data.message || "Failed to save rule");
      }

      setMessage(`Rule #${row.id} saved successfully.`);
      await loadMembers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
    } finally {
      setSavingId(null);
    }
  }

  async function deleteRow(row: EditableZoneMemberRow) {
    const confirmed = window.confirm(
      `Delete postcode zone rule #${row.id}? This cannot be undone.`,
    );

    if (!confirmed) return;

    setDeletingId(row.id);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(
        `${API_BASE}/admin/shipping/zone-members/${encodeURIComponent(
          String(row.id),
        )}`,
        {
          method: "DELETE",
          headers: {
            accept: "application/json",
          },
        },
      );

      const data = (await res.json()) as MutationResponse;

      if (!res.ok || !data.ok) {
        throw new Error(data.error || data.message || "Failed to delete rule");
      }

      setMessage(`Rule #${row.id} deleted successfully.`);
      await loadMembers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
    } finally {
      setDeletingId(null);
    }
  }

  function renderRuleInputs(row: EditableZoneMemberRow, isNew = false) {
    const updater = isNew
      ? updateNewRow
      : (patch: Partial<EditableZoneMemberRow>) => updateRow(row.id, patch);

    return (
      <>
        <td className="border-b px-4 py-4">
          <div className="grid gap-2">
            <select
              value={row.draft_zone_code}
              onChange={(event) =>
                updater({
                  draft_zone_code: event.target.value,
                })
              }
              className="w-64 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
            >
              {ZONE_OPTIONS.map((zone) => (
                <option key={zone.zone_code} value={zone.zone_code}>
                  {zone.zone_name}
                </option>
              ))}
            </select>

            <div className="text-xs text-slate-500">{row.draft_zone_code}</div>
          </div>
        </td>

        <td className="border-b px-4 py-4">
          <div className="grid gap-2">
            <input
              value={row.draft_country_code}
              onChange={(event) =>
                updater({
                  draft_country_code: event.target.value.toUpperCase(),
                })
              }
              className="w-20 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
            />

            <input
              value={row.draft_country_name}
              onChange={(event) =>
                updater({
                  draft_country_name: event.target.value,
                })
              }
              className="w-36 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
            />
          </div>
        </td>

        <td className="border-b px-4 py-4">
          <select
            value={row.draft_state_code}
            onChange={(event) =>
              updater({
                draft_state_code: event.target.value,
              })
            }
            className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          >
            {STATE_OPTIONS.map((state) => (
              <option key={state || "ALL"} value={state}>
                {state || "All"}
              </option>
            ))}
          </select>
        </td>

        <td className="border-b px-4 py-4">
          <div className="flex items-center gap-2">
            <input
              value={row.draft_postcode_from}
              onChange={(event) =>
                updater({
                  draft_postcode_from: event.target.value,
                })
              }
              inputMode="numeric"
              placeholder="From"
              className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
            />

            <span className="text-slate-400">to</span>

            <input
              value={row.draft_postcode_to}
              onChange={(event) =>
                updater({
                  draft_postcode_to: event.target.value,
                })
              }
              inputMode="numeric"
              placeholder="To"
              className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
            />
          </div>

          <div className="mt-2">
            <input
              value={row.draft_postcode_prefix}
              onChange={(event) =>
                updater({
                  draft_postcode_prefix: event.target.value,
                })
              }
              placeholder="Optional prefix"
              className="w-40 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
            />
          </div>
        </td>

        <td className="border-b px-4 py-4">
          <input
            value={row.draft_priority}
            onChange={(event) =>
              updater({
                draft_priority: event.target.value,
              })
            }
            inputMode="numeric"
            className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />

          <div className="mt-1 text-xs text-slate-500">
            {getPriorityHint(parsePriority(row.draft_priority))}
          </div>
        </td>

        <td className="border-b px-4 py-4">
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={row.draft_is_active}
              onChange={(event) =>
                updater({
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
      </>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <MapPinned className="h-6 w-6 text-slate-900" />
              <h1 className="text-2xl font-semibold text-slate-900">
                Postcode Zone Rules
              </h1>
            </div>

            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Manage postcode ranges and priorities that decide which AU_CJFO
              tier a checkout address will match. Higher priority wins when
              multiple rules match.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadMembers()}
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
              Active rules
            </div>
            <div className="mt-1 text-lg font-semibold text-slate-900">
              {activeCount}
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Fallback rules
            </div>
            <div className="mt-1 text-lg font-semibold text-slate-900">
              {fallbackRows.length}
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

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <div className="font-medium">Priority model</div>
          <div className="mt-1">
            Your current fallback rule should usually have low priority, for
            example 10. More specific postcode ranges should use higher
            priority, for example Tier 2 = 200, Tier 1 = 300, and special remote
            overrides = 400.
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="border-b px-4 py-3">
            <h2 className="text-base font-semibold text-slate-900">
              Add New Rule
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Example: WA 6700–6799 → Tier 4 - Extended remote, priority 400.
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
                    Country
                  </th>
                  <th className="border-b px-4 py-3 font-medium text-slate-700">
                    State
                  </th>
                  <th className="border-b px-4 py-3 font-medium text-slate-700">
                    Postcode Range / Prefix
                  </th>
                  <th className="border-b px-4 py-3 font-medium text-slate-700">
                    Priority
                  </th>
                  <th className="border-b px-4 py-3 font-medium text-slate-700">
                    Active
                  </th>
                  <th className="border-b px-4 py-3 font-medium text-slate-700">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr className="align-top">
                  {renderRuleInputs(newRow, true)}

                  <td className="border-b px-4 py-4">
                    <button
                      type="button"
                      onClick={() => void createRow()}
                      disabled={savingId === "new"}
                      className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingId === "new" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      Add
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="border-b px-4 py-3">
            <h2 className="text-base font-semibold text-slate-900">
              Existing Rules
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              These rules are read from shipping_zone_members. Checkout chooses
              the highest priority matching rule.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1300px] w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="border-b px-4 py-3 font-medium text-slate-700">
                    ID
                  </th>
                  <th className="border-b px-4 py-3 font-medium text-slate-700">
                    Zone
                  </th>
                  <th className="border-b px-4 py-3 font-medium text-slate-700">
                    Country
                  </th>
                  <th className="border-b px-4 py-3 font-medium text-slate-700">
                    State
                  </th>
                  <th className="border-b px-4 py-3 font-medium text-slate-700">
                    Postcode Range / Prefix
                  </th>
                  <th className="border-b px-4 py-3 font-medium text-slate-700">
                    Priority
                  </th>
                  <th className="border-b px-4 py-3 font-medium text-slate-700">
                    Active
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
                      colSpan={8}
                      className="px-4 py-10 text-center text-sm text-slate-500"
                    >
                      Loading postcode zone rules...
                    </td>
                  </tr>
                ) : rows.length ? (
                  rows.map((row) => {
                    const saving = savingId === row.id;
                    const deleting = deletingId === row.id;

                    return (
                      <tr key={row.id} className="align-top">
                        <td className="border-b px-4 py-4 text-slate-500">
                          #{row.id}
                        </td>

                        {renderRuleInputs(row)}

                        <td className="border-b px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void saveRow(row)}
                              disabled={saving || deleting}
                              className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {saving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                              Save
                            </button>

                            <button
                              type="button"
                              onClick={() => void deleteRow(row)}
                              disabled={saving || deleting}
                              className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deleting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                              Delete
                            </button>
                          </div>

                          <div className="mt-2 text-xs text-slate-500">
                            {getZoneDisplayName(row.draft_zone_code)}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-sm text-slate-500"
                    >
                      No postcode zone rules found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
