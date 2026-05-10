// src/lib/country.ts
export const COUNTRY_OPTIONS = [
  { code: "AU", label: "Australia" },
  { code: "NZ", label: "New Zealand" },
  { code: "US", label: "United States" },
  { code: "CA", label: "Canada" },
  { code: "GB", label: "United Kingdom" },

  // EU member countries.
  // Important:
  // - "EU" is not listed here because it is a storefront / regional market code,
  //   not a real delivery country.
  // - Checkout and shipping APIs should use real destination country codes,
  //   such as DE, FR, IT, ES, NL, BE, etc.
  { code: "AT", label: "Austria" },
  { code: "BE", label: "Belgium" },
  { code: "BG", label: "Bulgaria" },
  { code: "HR", label: "Croatia" },
  { code: "CY", label: "Cyprus" },
  { code: "CZ", label: "Czechia" },
  { code: "DK", label: "Denmark" },
  { code: "EE", label: "Estonia" },
  { code: "FI", label: "Finland" },
  { code: "FR", label: "France" },
  { code: "DE", label: "Germany" },
  { code: "GR", label: "Greece" },
  { code: "HU", label: "Hungary" },
  { code: "IE", label: "Ireland" },
  { code: "IT", label: "Italy" },
  { code: "LV", label: "Latvia" },
  { code: "LT", label: "Lithuania" },
  { code: "LU", label: "Luxembourg" },
  { code: "MT", label: "Malta" },
  { code: "NL", label: "Netherlands" },
  { code: "PL", label: "Poland" },
  { code: "PT", label: "Portugal" },
  { code: "RO", label: "Romania" },
  { code: "SK", label: "Slovakia" },
  { code: "SI", label: "Slovenia" },
  { code: "ES", label: "Spain" },
  { code: "SE", label: "Sweden" },

  { code: "CN", label: "China" },
  { code: "JP", label: "Japan" },
  { code: "KR", label: "South Korea" },
  { code: "SG", label: "Singapore" },

  { code: "TH", label: "Thailand" },
  { code: "MY", label: "Malaysia" },
  { code: "VN", label: "Vietnam" },
  { code: "PH", label: "Philippines" },
  { code: "ID", label: "Indonesia" },
] as const;

export type CountryCode = (typeof COUNTRY_OPTIONS)[number]["code"];

// ✅ 统一成大写存 set，避免大小写导致校验失败
const CODE_SET = new Set<string>(COUNTRY_OPTIONS.map((x) => x.code.toUpperCase()));

/** 是否是支持的 ISO2 code（允许输入小写/带空格） */
export function isCountryCode(x: unknown): x is CountryCode {
  if (typeof x !== "string") return false;
  const v = x.trim().toUpperCase();
  return v.length === 2 && CODE_SET.has(v);
}

/**
 * 把任意输入“纠正”为支持的 ISO2 code：
 * - 已经是 AU/NZ/... -> 返回大写
 * - 其他任何内容 -> 返回 fallback（默认 AU）
 */
export function coerceCountryCode(input: unknown, fallback: CountryCode = "AU"): CountryCode {
  if (typeof input === "string") {
    const v = input.trim().toUpperCase();
    if (CODE_SET.has(v)) return v as CountryCode;
  }
  return fallback;
}


/**
 * 把 ISO2 国家码（AU/NZ/US…）映射为展示用国家名
 * - AU -> Australia
 * - 未识别 -> 原样返回（兜底，避免 UI 炸）
 */
export function countryLabelOf(code?: unknown): string {
  if (typeof code !== "string") return "";

  const v = code.trim().toUpperCase();
  if (!v) return "";

  const found = COUNTRY_OPTIONS.find((c) => c.code === v);
  return found?.label ?? v;
}