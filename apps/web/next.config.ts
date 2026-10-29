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
  // Сарлавҳаҳои амниятӣ: сайтро дар iframe-и бегона кушодан мумкин нест (clickjacking),
  // браузер навъи файлро тахмин намекунад. Камера/микрофон — танҳо барои зангҳои худи сайт.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
        ],
      },
    ];
  },
  // Суроғаи кӯҳнаи мағоза (/shop/store?id=12) → суроғаи нави SEO (/shop/12); саҳифа canonical-и пурраро медиҳад.
  async redirects() {
    return [
      {
        source: "/shop/store",
        has: [{ type: "query", key: "id", value: "(?<id>\\d+)" }],
        destination: "/shop/:id",
        permanent: true,
      },
    ];
  },
  // Дархостҳои /api/* ба сервери NestJS мераванд — CORS лозим намешавад.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;
