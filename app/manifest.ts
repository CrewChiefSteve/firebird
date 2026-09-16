import type { MetadataRoute } from "next";

/** Web app manifest so the shop board can sit on a phone home screen like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Trans Am Shop Board",
    short_name: "Trans Am",
    description: "Time clock, parts, ledger and build log for Joe's Trans Am.",
    start_url: "/shop",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#1a1612",
    theme_color: "#B5432A",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
