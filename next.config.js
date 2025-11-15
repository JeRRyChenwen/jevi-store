// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "127.0.0.1", port: "1337", pathname: "/uploads/**" },
      { protocol: "http", hostname: "localhost",  port: "1337", pathname: "/uploads/**" },
    ],
  },

  async rewrites() {
    // 只在本地开发且设置了 API_PROXY 时启用代理
    const proxy = process.env.API_PROXY && process.env.API_PROXY.trim();
    if (!proxy) return [];

    return [
      // ① 保留 Braintree 路由给 Next 自己的 API 处理（不转发到 Worker）
      {
        source: "/api/braintree/:path*",
        destination: "/api/braintree/:path*",
      },

      // 如果你之后有 Stripe 相关的 Next API，也可以类似保留：
      // {
      //   source: "/api/stripe/:path*",
      //   destination: "/api/stripe/:path*",
      // },

      // ② 其他 /api/* 再转发到 Cloudflare Worker / 远程 API
      {
        source: "/api/:path*",
        destination: `${proxy}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
