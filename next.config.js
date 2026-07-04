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
    /**
     * 注意：
     * 这里是 Next.js build 阶段读取的配置。
     *
     * 不要用 NEXT_PUBLIC_API_BASE 作为服务端 proxy fallback。
     * NEXT_PUBLIC_API_BASE 是给浏览器用的，可以是 http://127.0.0.1:8787。
     *
     * 但是 jevi-store 跑在 Docker 容器里时，服务端访问宿主机 jevi-api 必须使用：
     * http://host.docker.internal:8787
     */
    const proxy = (
      process.env.API_PROXY ||
      process.env.API_BASE ||
      process.env.AUTH_UPSTREAM ||
      process.env.D1_WORKER_INTERNAL_BASE ||
      "http://host.docker.internal:8787"
    )
      .trim()
      .replace(/\/+$/, "");

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