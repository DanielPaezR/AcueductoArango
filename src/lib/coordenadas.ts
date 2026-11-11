import { CENTRO_MUNICIPIO } from "./opciones";

/** Número decimal escrito a mano: acepta coma o punto decimal ("6,3941" o "6.3941"). */
export function leerNumero(t: string): number | null {
  const s = t.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^[-+]?\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

/** Grados, minutos y segundos ("6°23'38.8\"N") a decimal. */
function dms(g: string, m: string, s: string, h: string) {
  const v = Number(g) + Number(m) / 60 + Number(s.replace(",", ".")) / 3600;
  return /[SWO]/i.test(h) ? -v : v;
}

/**
 * Par de coordenadas pegado de Google Maps, Google Earth, WhatsApp, etc.:
 * "6.39412, -75.26231" · "6,39412; -75,26231" · "6.39412 -75.26231" · "6°23'38.8\"N 75°15'44.3\"W"
 * o un enlace de Google Maps con "@6.39412,-75.26231" o "?q=6.39412,-75.26231".
 */
export function leerPar(t: string): [number, number] | null {
  const g = [...t.matchAll(/(\d{1,3})\s*°\s*(\d{1,2})\s*['′]\s*(\d{1,2}(?:[.,]\d+)?)\s*(?:"|″|'')?\s*([NSEWO])/gi)];
  if (g.length === 2) {
    const a = g.map((x) => ({ v: dms(x[1], x[2], x[3], x[4]), lat: /[NS]/i.test(x[4]) }));
    const lat = a.find((x) => x.lat)?.v;
    const lng = a.find((x) => !x.lat)?.v;
    return lat !== undefined && lng !== undefined ? valido([lat, lng]) : null;
  }
  const enlace = t.match(/[@=](-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  if (enlace) return valido([Number(enlace[1]), Number(enlace[2])]);
  const partes = t.trim().split(/\s*;\s*|,\s+|\s+/).filter(Boolean);
  if (partes.length !== 2) return null;
  const [lat, lng] = partes.map(leerNumero);
  return lat !== null && lng !== null ? valido([lat, lng]) : null;
}

function valido(p: [number, number]): [number, number] | null {
  return Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180 ? p : null;
}

/** Distancia en km al centro de Concepción (para advertir coordenadas mal escritas). */
export function kmAlMunicipio([lat, lng]: [number, number]) {
  const r = Math.PI / 180;
  const dLat = (lat - CENTRO_MUNICIPIO[0]) * r;
  const dLng = (lng - CENTRO_MUNICIPIO[1]) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat * r) * Math.cos(CENTRO_MUNICIPIO[0] * r) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}
