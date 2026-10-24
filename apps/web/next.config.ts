import type { NextConfig } from "next";

const API_URL = process.env.API_URL ?? "http://localhost:4100";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Танҳо барои `next dev`: сайтро аз 127.0.0.1 ҳам кушодан мумкин (масалан ду корбар дар ду таб барои санҷиши занг).
  allowedDevOrigins: ["127.0.0.1"],
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
