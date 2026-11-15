import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Veredas de Concepción",
    short_name: "Veredas",
    description: "Censo, libros y gestión de las Juntas de Acción Comunal y su alcaldía",
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
