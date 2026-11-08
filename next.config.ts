import type { NextConfig } from "next";

const seguridad = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // La app usa GPS y cámara (fotos); nada más
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(self), microphone=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  // App interna: todo depende de la sesión del usuario, así que renderizamos dinámico
  // (sin Cache Components / PPR).
  cacheComponents: false,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: seguridad },
      // El service worker nunca se cachea en el navegador, para que las actualizaciones lleguen
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
