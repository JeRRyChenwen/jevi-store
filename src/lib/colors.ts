// src/lib/colors.ts

/**
 * 统一颜色名：
 * - 去除首尾空格
 * - 转为小写
 * - 空格和下划线统一转成连字符
 * - 兼容 gray / grey
 * - 兼容 darkbrown / lightbrown 等无连字符写法
 */
export function normalizeColorName(input: unknown): string {
  const value = String(input ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  const aliases: Record<string, string> = {
    gray: "grey",
    "light-gray": "light-grey",
    "dark-gray": "dark-grey",

    lightgray: "light-grey",
    darkgray: "dark-grey",
    lightgrey: "light-grey",
    darkgrey: "dark-grey",

    lightbrown: "light-brown",
    darkbrown: "dark-brown",
  };

  return aliases[value] ?? value;
}

/**
 * 判断字符串本身是不是一个可用的 CSS 颜色：
 * - #hex
 * - rgb()/rgba()
 * - hsl()/hsla()
 * - 不带连字符的 CSS 命名色
 */
export function isCssColorLiteral(input: string): boolean {
  const value = String(input || "")
    .trim()
    .toLowerCase();

  if (!value) {
    return false;
  }

  if (
    /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(
      value,
    )
  ) {
    return true;
  }

  if (/^(?:rgb|hsl)a?\(/.test(value)) {
    return true;
  }

  /*
   * CSS 命名色一般不带连字符。
   * light-grey / dark-brown 这类业务颜色由 PRESET 映射。
   */
  return /^[a-z]+$/.test(value);
}

/**
 * 商品颜色映射表。
 *
 * Strapi 中保存的是业务颜色名称，
 * 这里统一映射成用于颜色圆点展示的 CSS 色值。
 */
const PRESET: Record<string, string> = {
  black: "#000000",
  white: "#FFFFFF",

  grey: "#808080",
  "light-grey": "#D3D3D3",
  "dark-grey": "#4A4A4A",

  brown: "#6B4226",
  "light-brown": "#B88963",
  "dark-brown": "#4E342E",

  chocolate: "#5A3825",
  coffee: "#5C4033",
  mocha: "#6D4C41",
  camel: "#C19A6B",
  tan: "#C69C6D",
  beige: "#F5F5DC",
  khaki: "#BDB76B",

  navy: "#001F3F",
};

/**
 * 把 Strapi 的颜色名映射为最终用于渲染的 CSS 颜色值。
 */
export function colorNameToCss(
  input?: string,
): string | undefined {
  const normalized =
    normalizeColorName(input);

  if (!normalized) {
    return undefined;
  }

  const preset = PRESET[normalized];

  if (preset) {
    return preset;
  }

  /*
   * 输入本身如果就是 CSS 合法色值，
   * 例如 red、#ffffff、rgb(...)，则直接使用。
   */
  if (isCssColorLiteral(normalized)) {
    return normalized;
  }

  return undefined;
}