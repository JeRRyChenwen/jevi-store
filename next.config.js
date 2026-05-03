// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
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
    if (!proxy) return [];

    return [
      // ✅ 0) Stock API：必须交给 Next Route Handlers（否则 cookie 到不了 Worker）
      {
        source: "/api/stock/:path*",
        destination: "/api/stock/:path*",
      },

      // ✅ ① Braintree：交给 Next API
      {
        source: "/api/braintree/:path*",
        destination: "/api/braintree/:path*",
      },

      // ✅ ② PayPal：交给 Next API
      // 这些接口需要读取 PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET，
      // 不能被转发到 d1-worker。
      {
        source: "/api/paypal/:path*",
        destination: "/api/paypal/:path*",
      },

      // ✅ ③ Admin API：交给 Next Route Handlers
      {
        source: "/api/admin/:path*",
        destination: "/api/admin/:path*",
      },

      // ✅ ④ 其他 API 才转发到 Worker
      {
        source: "/api/:path*",
        destination: `${proxy}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;