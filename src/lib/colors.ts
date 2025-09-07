// src/lib/colors.ts
/** 统一颜色名：去空格、转小写、把空格换成连字符，并做少量同义词兼容 */
export function normalizeColorName(s: any): string {
  const v = String(s ?? "").trim().toLowerCase().replace(/\s+/g, "-");
  if (v === "gray") return "grey";
  if (v === "darkbrown") return "dark-brown";
  return v;
}

/** 判断字符串本身是不是一个可用的 CSS 颜色（命名色 / #hex / rgb() / hsl()） */
export function isCssColorLiteral(s: string): boolean {
  const v = (s || "").trim().toLowerCase();
  if (!v) return false;
  if (/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(v)) return true;
  if (/^(?:rgb|hsl)a?\(/.test(v)) return true;
  // 只有纯字母且不带连字符的，当作命名色
  if (/^[a-z]+$/.test(v) && !v.includes("-")) return true;
  return false;
}

/**
 * 你在分类页里用到的“品牌色映射表”——请把分类页里那份拷贝过来。
 * 我先放一份常用且较接近电商视觉的默认值；如果你分类页已经有自己的表，
 * 替换成你的即可，这样两边会 100% 一致。
 */
const PRESET: Record<string, string> = {
  black: "#000000",
  white: "#ffffff",
  grey: "#808080",
  // 棕系（可按你项目中的视觉替换）
  brown: "#6B4226",
  "dark-brown": "#4E342E",
  chocolate: "#4E342E", // 不用浏览器自带的 #D2691E（太橘），用深棕以贴近商品
  coffee: "#5C4033",
  mocha: "#6D4C41",
  camel: "#C19A6B",
  tan: "#C69C6D", // 比浏览器的 tan(#D2B48C) 稍深一点，更接近皮鞋“tan”
  beige: "#F5F5DC",
  khaki: "#BDB76B",
  navy: "#001F3F",
};

/** 把 Strapi 的颜色名映射为最终用于渲染的 CSS 颜色值 */
export function colorNameToCss(input?: string): string | undefined {
  const n = normalizeColorName(input);
  if (!n) return undefined;

  // 先看预设表
  if (PRESET[n]) return PRESET[n];

  // 兜底：如果它本身就是 CSS 颜色（命名色/hex/rgb/hsl），就直接用
  if (isCssColorLiteral(n)) return n;

  return undefined; // 最终仍然未知就交由上层决定（比如用 #ddd）
}
