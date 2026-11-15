import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Veredas de Concepción", template: "%s · Veredas de Concepción" },
  description: "Censo, libros y gestión de las Juntas de Acción Comunal de Concepción (Antioquia) y su alcaldía",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
  appleWebApp: { capable: true, title: "Veredas", statusBarStyle: "default" },
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
