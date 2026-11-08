import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JAC Arango",
    short_name: "JAC Arango",
    description: "Censo, mapa y acueducto de la vereda Arango",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f7f4",
    theme_color: "#184a30",
    lang: "es-CO",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
