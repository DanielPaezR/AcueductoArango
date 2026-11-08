import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vereda — JAC y Acueducto",
    short_name: "Vereda",
    description: "Censo, mapas y acueducto de la vereda",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f7f5",
    theme_color: "#166534",
    lang: "es-CO",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
