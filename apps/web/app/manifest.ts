import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

// Сайтро дар телефон ҳамчун барнома насб кардан мумкин аст.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — идоракунии филиалҳо`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    lang: "tg",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#fbf7f6",
    theme_color: "#dc3b1c",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      // PNG — барои насб дар Android/iPhone ва огоҳиҳои push
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
    ],
  };
}
