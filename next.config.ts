import type { NextConfig } from "next";

const config: NextConfig = {
  reactCompiler: true,
  cacheComponents: true, 
  allowedDevOrigins: ['127.0.0.1'],

  // Security headers (backup — vercel.json is primary in production)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options",  value: "nosniff" },
          { key: "X-Frame-Options",          value: "DENY" },
          { key: "X-XSS-Protection",         value: "1; mode=block" },
          { key: "Referrer-Policy",          value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },

  // Compress responses
  compress: true,

  // Production source maps off (performance + security)
  productionBrowserSourceMaps: false,

  // PoweredBy header off
  poweredByHeader: false,

  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
  },

  logging: {
    fetches: { fullUrl: process.env.NODE_ENV === "development" },
  },
};

export default config;
