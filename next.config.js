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
      // Stock API：交给 Next Route Handlers，避免直接被兜底代理转发。
      {
        source: "/api/stock/:path*",
        destination: "/api/stock/:path*",
      },

      // Braintree：交给 Next API。
      {
        source: "/api/braintree/:path*",
        destination: "/api/braintree/:path*",
      },

      // PayPal：交给 Next API。
      // 这些接口需要读取 PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET，
      // 不能被转发到 d1-worker。
      {
        source: "/api/paypal/:path*",
        destination: "/api/paypal/:path*",
      },

      // Admin API：交给本地 blocker route。
      // 注意：social-platform 已经不再提供 admin proxy。
      // 这里保留本地处理，是为了防止 /api/admin/* 掉到下面的 Worker 兜底代理。
      {
        source: "/api/admin/:path*",
        destination: "/api/admin/:path*",
      },

      // 其他 API 才转发到 Worker。
      {
        source: "/api/:path*",
        destination: `${proxy}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;