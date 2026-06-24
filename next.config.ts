import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ── Gzip / Brotli compression ──────────────────────────────────────────────
  compress: true,

  // ── Remove the "X-Powered-By: Next.js" header ─────────────────────────────
  poweredByHeader: false,

  // ── Custom headers for aggressive CDN caching ──────────────────────────────
  async headers() {
    return [
      {
        // Movie & TV detail pages — immutable (never revalidate)
        source: "/:path(movie|tv)/:id*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=31536000, immutable",
          },
        ],
      },
      {
        // List pages — immutable (force-static, no ISR)
        source: "/:path(movies|trending|popular|series|search)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=31536000, immutable",
          },
        ],
      },
      {
        // Homepage — immutable
        source: "/",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=31536000, immutable",
          },
        ],
      },
    ];
  },

  // ── Image optimisation ────────────────────────────────────────────────────
  images: {
    // Serve AVIF first (smallest), fall back to WebP (wide compat)
    formats: ["image/avif", "image/webp"],

    // Cache optimised images for 7 days (CDN / ISR friendly)
    minimumCacheTTL: 60 * 60 * 24 * 7,

    // Only generate the widths the UI actually uses — avoids unnecessary
    // derivative images being generated and cached on the disk.
    deviceSizes: [640, 768, 1080, 1280, 1920],
    imageSizes: [180, 240, 300, 500],

    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
    ],
  },

  // ── Tree-shake heavy icon libraries ──────────────────────────────────────
  // Tells the bundler to only import the icons actually used, rather than
  // pulling in the entire lucide-react barrel.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
