// src/lib/country.ts
export const COUNTRY_OPTIONS = [
  { code: "AU", label: "Australia" },
  { code: "NZ", label: "New Zealand" },
  { code: "US", label: "United States" },
  { code: "CA", label: "Canada" },
  { code: "GB", label: "United Kingdom" },

  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "IT", label: "Italy" },
  { code: "ES", label: "Spain" },
  { code: "NL", label: "Netherlands" },
  { code: "BE", label: "Belgium" },

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
