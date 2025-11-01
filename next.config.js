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
    if (!proxy) return []; // 不设置就不代理，避免生产环境误转发

    return [
      // 前端所有 /api/* → 转发到你的 Worker 或远端API
      { source: "/api/:path*", destination: `${proxy}/:path*` },
    ];
  },
};

module.exports = nextConfig;
