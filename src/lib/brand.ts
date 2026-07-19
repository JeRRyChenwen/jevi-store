// src/lib/brand.ts


function requirePublicEnv(
  name: string,
  value: string | undefined
): string {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    throw new Error(
      `[brand] Missing required environment variable: ${name}`
    );
  }

  return normalizedValue;
}

const SITE_URL = requirePublicEnv(
  "NEXT_PUBLIC_SITE_URL",
  process.env.NEXT_PUBLIC_SITE_URL
).replace(/\/+$/, "");

const SUPPORT_EMAIL = requirePublicEnv(
  "NEXT_PUBLIC_SUPPORT_EMAIL",
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL
);

/**
 * 前端品牌中心
 * 品牌名、支持邮箱、站点描述、法务页联系邮箱、SEO 站点 URL，统一从这里取。
 */
export const BRAND = {
  /**
   * 品牌正式名称
   */
  name: "JEVI | APPAREL STUDIO",

  /**
   * 网站展示品牌名
   * 会用于网页标题、Open Graph、footer、部分 SEO 内容。
   */
  displayName: "JEVI | APPAREL STUDIO",

  /**
   * 品牌简短描述
   */
  tagline: "Modern apparel, footwear and lifestyle essentials.",

  /**
   * SEO 默认描述
   * 首页、默认 metadata、分享卡片会使用这个描述。
   */
  siteDescription:
    "Shop JEVI | APPAREL STUDIO online for modern apparel, footwear and lifestyle essentials designed for everyday style.",

  /**
   * 支持邮箱
   * 现在先使用符合品牌名的临时邮箱占位。
   * 等你买好真实域名并配置邮箱后，再替换成真实邮箱。
   */
  supportEmail: SUPPORT_EMAIL,

  /**
   * 联系邮箱
   */
  contactEmail: SUPPORT_EMAIL,


  /**
   * 隐私联系邮箱
   */
  privacyContactEmail: SUPPORT_EMAIL,

  /**
   * 售后 / 退货联系邮箱
   */
  returnsContactEmail: SUPPORT_EMAIL,

  /**
   * 法务页 / footer 用的版权名
   */
  legalName: "JEVI | APPAREL STUDIO",

  /**
   * 网站经营者名称
   */
  legalEntityName: "Wenxuan Chen, operating JEVI | APPAREL STUDIO",

  /**
   * 网站经营者所在国家
   */
  legalEntityCountry: "China",

  /**
   * 当前没有单独公开的商业地址。
   *
   * 保持为空时，Terms 页面不会显示 Business address。
   */
  legalEntityAddress: "",

  /**
   * 当前没有澳大利亚 ABN 或其他需要公开展示的注册号码。
   *
   * 保持为空时，Terms 页面不会显示 Registration / business number。
   */
  companyRegistrationNumber: "",

  /**
   * 默认适用法标签
   */
  governingLawLabel: "Applicable law of the storefront’s operating region",

  /**
   * 正式站点 URL
   *
   * 重要：
   * 这里会用于 canonical、Open Graph、sitemap、robots。
   * 现在先用符合 JEVI | APPAREL STUDIO 品牌名的临时正式域名占位。
   * 等你买好真实域名后，必须改成你的真实域名。
   */
  siteUrl: SITE_URL,
} as const;