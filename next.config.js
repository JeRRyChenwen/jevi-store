// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const proxy = process.env.API_PROXY?.trim();
    if (!proxy) return [];
    return [
      { source: "/api/:path*", destination: `${proxy}/:path*` },
    ];
  },
};
module.exports = nextConfig;
