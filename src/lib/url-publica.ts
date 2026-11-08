import "server-only";
import { headers } from "next/headers";
import QRCode from "qrcode";

/** URL absoluta de la página pública según el dominio con que se abrió la app (Railway usa https). */
export async function urlPublica() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/transparencia`;
}

/** Código QR como SVG (nítido al imprimir, sin descargar imágenes). */
export function qrSvg(texto: string) {
  return QRCode.toString(texto, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1a201c", light: "#ffffff" } });
}
