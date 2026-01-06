// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 你之前已经关掉 Strict Mode，这里保持不变
  reactStrictMode: false,

  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "1337",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "1337",
        pathname: "/uploads/**",
      },
    ],
  },

  async rewrites() {
    const proxy = process.env.API_PROXY && process.env.API_PROXY.trim();

    // 没有配置 API_PROXY（例如生产环境）时，不启用任何代理
    if (!proxy) return [];

    return [
      // ✅ ① Braintree / Stripe 等支付相关：交给 Next 自己的 API
      {
        source: "/api/braintree/:path*",
        destination: "/api/braintree/:path*",
      },
      // 如果你之后有 stripe
      // {
      //   source: "/api/stripe/:path*",
      //   destination: "/api/stripe/:path*",
      // },

      // ✅ ② Admin API：必须优先交给 Next Route Handlers
      // 否则 approve / reject 会被转发到 worker，导致 x-admin-token 丢失
      {
        source: "/api/admin/:path*",
        destination: "/api/admin/:path*",
      },

      // ✅ ③ 其他所有 /api/* 请求，才统一转发到 Cloudflare Worker
      {
        source: "/api/:path*",
        destination: `${proxy}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
