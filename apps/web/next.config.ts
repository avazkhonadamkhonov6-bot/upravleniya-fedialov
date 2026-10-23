import type { NextConfig } from "next";

const API_URL = process.env.API_URL ?? "http://localhost:4100";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Дархостҳои /api/* ба сервери NestJS мераванд — CORS лозим намешавад.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;
