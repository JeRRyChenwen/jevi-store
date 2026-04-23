// src/lib/brand.ts

/**
 * ✅ 这里是前端品牌中心
 * 以后品牌名、支持邮箱、站点描述、法务页联系邮箱，统一从这里取
 * 不要再在页面里到处手写 "SocialPlatform"
 */
export const BRAND = {
  /**
   * ✅ 品牌正式名称（浏览器标题 / 法务页 / 邮件里都建议使用这个）
   * 例子：Jevi
   */
  name: "Jevi",

  /**
   * ✅ 品牌展示名称
   * 如果你想和正式名称一样，就保持一致
   * 如果未来你有大写、小写、特殊写法，可以单独配
   */
  displayName: "Jevi",

  /**
   * ✅ 品牌简短描述
   * 会用于 metadata / footer / SEO
   */
  tagline: "A modern fashion & lifestyle store.",

  /**
   * ✅ 浏览器 / SEO 描述
   */
  siteDescription:
    "A modern fashion & lifestyle store built with Next.js, focused on fashion, lifestyle, and a polished shopping experience.",

  /**
   * ✅ 支持邮箱
   * 建议未来换成 support@你的域名
   * 目前主要是使用这个变量
   */
  supportEmail: "support@jevi.com",

  /**
   * ✅ 联系邮箱
   * 如果你暂时只有一个邮箱，也可以先和 supportEmail 一样
   */
  contactEmail: "support@jevi.com",

  /**
   * ✅ 隐私联系邮箱
   * 先默认与 support 一样，后续 storefront 可覆盖
   */
  privacyContactEmail: "support@jevi.com",

  /**
   * ✅ 售后 / 退货联系邮箱
   * 先默认与 support 一样，后续 storefront 可覆盖
   */
  returnsContactEmail: "support@jevi.com",

  /**
   * ✅ 法务页 / footer 用的版权名
   */
  legalName: "Jevi",

  /**
   * ✅ 经营主体默认名称
   * 当前按你的实际情况先写 sole trader / operator
   */
  legalEntityName: "Wenxuan Chen trading as Jevi",

  /**
   * ✅ 经营主体默认国家
   * storefront 未覆盖时的兜底显示
   */
  legalEntityCountry: "Australia",

  /**
   * ✅ 经营主体默认地址
   * 暂时先留占位，后面你确认可公开地址后再替换
   */
  legalEntityAddress: "Business address to be provided before launch",

  /**
   * ✅ 注册号 / ABN / company number
   * 暂时先留占位，后续 storefront 可覆盖
   */
  companyRegistrationNumber: "ABN / registration number to be provided before launch",

  /**
   * ✅ 默认适用法标签
   * storefront 未覆盖时兜底
   */
  governingLawLabel: "Applicable law of the storefront’s operating region",

  /**
   * ✅ 站点 URL（未来做 OG / canonical / sitemap 时会用到）
   * 暂时没有正式域名也没关系，先留占位
   */
  siteUrl: "https://www.yourdomain.com",
} as const;