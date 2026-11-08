import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "JAC Arango", template: "%s · JAC Arango" },
  description: "Censo, mapa y acueducto de la vereda Arango, Concepción (Antioquia)",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
  appleWebApp: { capable: true, title: "JAC Arango", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#184a30",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
