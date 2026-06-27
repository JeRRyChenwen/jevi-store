// src/lib/address/auStates.ts

export type AuStateCode =
  | "NSW"
  | "VIC"
  | "QLD"
  | "SA"
  | "WA"
  | "TAS"
  | "ACT"
  | "NT";

export const AU_STATE_OPTIONS: Array<{
  code: AuStateCode;
  name: string;
  label: string;
}> = [
  { code: "NSW", name: "New South Wales", label: "New South Wales (NSW)" },
  { code: "VIC", name: "Victoria", label: "Victoria (VIC)" },
  { code: "QLD", name: "Queensland", label: "Queensland (QLD)" },
  { code: "SA", name: "South Australia", label: "South Australia (SA)" },
  { code: "WA", name: "Western Australia", label: "Western Australia (WA)" },
  { code: "TAS", name: "Tasmania", label: "Tasmania (TAS)" },
  {
    code: "ACT",
    name: "Australian Capital Territory",
    label: "Australian Capital Territory (ACT)",
  },
  { code: "NT", name: "Northern Territory", label: "Northern Territory (NT)" },
];

export function isAustraliaCountry(country?: string | null) {
  const raw = String(country || "")
    .trim()
    .toLowerCase();

  const compact = raw.replace(/[^a-z]/g, "");

  return (
    raw === "au" ||
    raw === "aus" ||
    raw === "australia" ||
    compact === "australia"
  );
}

export function normalizeAuState(input?: string | null): AuStateCode | "" {
  const raw = String(input || "").trim();

  if (!raw) return "";

  const compact = raw.toLowerCase().replace(/[^a-z]/g, "");

  const map: Record<string, AuStateCode> = {
    nsw: "NSW",
    newsouthwales: "NSW",

    vic: "VIC",
    victoria: "VIC",

    qld: "QLD",
    queensland: "QLD",

    sa: "SA",
    southaustralia: "SA",

    wa: "WA",
    westernaustralia: "WA",

    tas: "TAS",
    tasmania: "TAS",

    act: "ACT",
    australiancapitalterritory: "ACT",

    nt: "NT",
    northernterritory: "NT",
  };

  return map[compact] || "";
}

export function normalizeStateForCountry(
  state?: string | null,
  country?: string | null
) {
  const raw = String(state || "").trim();

  if (!raw) return "";

  if (isAustraliaCountry(country)) {
    return normalizeAuState(raw) || raw.toUpperCase();
  }

  return raw;
}