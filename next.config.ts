import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // App interna: todo depende de la sesión del usuario, así que renderizamos dinámico
  // (sin Cache Components / PPR).
  cacheComponents: false,
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
