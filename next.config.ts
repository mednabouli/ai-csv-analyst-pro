import type { NextConfig } from "next";

const config: NextConfig = {
  experimental: {
    reactCompiler: true,
    ppr: true,
    cacheComponents: true,
  },
};

export default config;
