/** Inserta una transformación de Cloudinary en una URL (miniaturas). Sirve en cliente y servidor. */
export function miniatura(url: string | null | undefined, ancho = 400, alto = 300) {
  if (!url) return null;
  if (!url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/c_fill,w_${ancho},h_${alto},q_auto,f_auto/`);
}
