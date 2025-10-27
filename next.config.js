// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // 允许从 Strapi 的 /uploads/** 加载图片（本地开发）
    remotePatterns: [
      { protocol: 'http', hostname: '127.0.0.1', port: '1337', pathname: '/uploads/**' },
      { protocol: 'http', hostname: 'localhost',  port: '1337', pathname: '/uploads/**' },
    ],
    // 如果你以后把 Strapi 部署到线上域名，也在这里再加一条：
    // remotePatterns: [
    //   ...,
    //   { protocol: 'https', hostname: 'cms.example.com', pathname: '/uploads/**' },
    // ],
  },

  async rewrites() {
    const proxy = process.env.API_PROXY?.trim();
    if (!proxy) return [];
    return [{ source: "/api/:path*", destination: `${proxy}/:path*` }];
  },
};

module.exports = nextConfig;
