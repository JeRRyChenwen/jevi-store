// next.config.js

/**
 * Convert a Strapi base URL into a Next.js remote image pattern.
 *
 * Examples:
 * - http://127.0.0.1:1337
 * - http://host.docker.internal:1337
 * - https://cms.jeviapparelstudio.com
 */
function createStrapiRemotePattern(rawUrl) {
  const normalizedUrl = String(rawUrl ?? "").trim();

  if (!normalizedUrl) {
    return null;
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(normalizedUrl);
  } catch {
    throw new Error(
      `[next.config] Invalid Strapi URL: ${normalizedUrl}`
    );
  }

  if (
    parsedUrl.protocol !== "http:" &&
    parsedUrl.protocol !== "https:"
  ) {
    throw new Error(
      `[next.config] Unsupported Strapi URL protocol: ${parsedUrl.protocol}`
    );
  }

  return {
    protocol: parsedUrl.protocol.replace(":", ""),
    hostname: parsedUrl.hostname,
    port: parsedUrl.port,
    pathname: "/uploads/**",
  };
}

const strapiRemotePatterns = [
  // Local Strapi
  "http://127.0.0.1:1337",
  "http://localhost:1337",

  // Docker local
  "http://host.docker.internal:1337",

  // Environment-specific public Strapi URL
  process.env.NEXT_PUBLIC_STRAPI_URL,
]
  .map(createStrapiRemotePattern)
  .filter(Boolean);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,

  // Docker / VPS deployment requires standalone output.
  output: "standalone",

  // The project currently contains historical ESLint issues.
  // Do not allow lint to block the production build yet.
  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    remotePatterns: strapiRemotePatterns,
  },

  async rewrites() {
    /**
     * This configuration is evaluated during the Next.js build.
     *
     * NEXT_PUBLIC_API_BASE is intended for browser-side requests.
     *
     * When jevi-store runs inside Docker, server-side requests should
     * use an internal Docker or host address instead.
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