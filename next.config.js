// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,

  // Docker / VPS 部署需要 standalone 输出
  output: "standalone",

  // 当前项目已有大量历史 ESLint 问题；
  // P1-4 阶段先不要让 lint 阻塞 production build。
  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    remotePatterns: [
      // Local Strapi
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

      // Docker local：jevi-store 容器访问宿主机 Strapi 图片时可能用到
      {
        protocol: "http",
        hostname: "host.docker.internal",
        port: "1337",
        pathname: "/uploads/**",
      },

      // Production Strapi
      {
        protocol: "https",
        hostname: "cms.jevi.com",
        pathname: "/uploads/**",
      },
    ],
  },

  async rewrites() {
    const proxy = process.env.API_PROXY && process.env.API_PROXY.trim();
    if (!proxy) return [];

    return [
      {
        source: "/api/stock/:path*",
        destination: "/api/stock/:path*",
      },
      {
        source: "/api/braintree/:path*",
        destination: "/api/braintree/:path*",
      },
      {
        source: "/api/paypal/:path*",
        destination: "/api/paypal/:path*",
      },
      {
        source: "/api/admin/:path*",
        destination: "/api/admin/:path*",
      },
      {
        source: "/api/:path*",
        destination: `${proxy}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;