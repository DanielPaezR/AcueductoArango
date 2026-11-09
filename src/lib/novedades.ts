import { CATEGORIAS_NOVEDAD, type CategoriaNovedad } from "./opciones";

/** Marcador de novedad: gota/alfiler con el color de la categoría; hueco si ya se realizó. */
export function svgNovedad(categoria: string, estado: string, tam = 30) {
  const color = CATEGORIAS_NOVEDAD[categoria as CategoriaNovedad]?.color ?? "#5d655e";
  const lleno = estado !== "realizado";
  const centro = estado === "en_ejecucion" ? `<path d="M12 6.5v5l3 2" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round"/>` : estado === "realizado" ? `<path d="m8.5 10 2.5 2.5 4.5-5" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` : `<circle cx="12" cy="10" r="2.6" fill="${color}"/>`;
  return `<svg width="${tam}" height="${tam * 1.25}" viewBox="0 0 24 30" style="filter:drop-shadow(0 2px 2px rgba(0,0,0,.45))">
    <path d="M12 1.5C6.5 1.5 3 5.4 3 10.2c0 6.3 9 17.8 9 17.8s9-11.5 9-17.8c0-4.8-3.5-8.7-9-8.7z" fill="${lleno ? color : "#2a6b48"}" stroke="#fff" stroke-width="2"/>
    ${estado === "realizado" ? "" : `<circle cx="12" cy="10" r="5.2" fill="#fff"/>`}
    ${centro}
  </svg>`;
}
