import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LifeOS — your AI second brain",
    short_name: "LifeOS",
    description: "An AI operating system for your whole life. Knows your dates, money and plans — and tells you what matters today.",
    start_url: "/lifeos",
    scope: "/lifeos",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0d0f1a",
    theme_color: "#7c3aed",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
