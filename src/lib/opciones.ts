/** Listas de opciones de los formularios del censo. */
export const OPC = {
  tenencia: ["Propia", "Alquilada", "Otra"],
  materialParedes: ["Ladrillo / bloque", "Tapia / bahareque", "Madera", "Prefabricado", "Mixto", "Otro"],
  materialPiso: ["Cemento", "Baldosa", "Madera", "Tierra", "Otro"],
  gas: ["Pipeta", "Leña", "Eléctrica", "Mixto", "Ninguno"],
  senalCelular: ["Buena", "Regular", "Mala", "No hay"],
  saneamiento: ["Pozo séptico", "Alcantarillado", "Letrina", "Campo abierto", "Otro"],
  manejoBasuras: ["Recolección", "Quema", "Entierro", "Compostaje / reciclaje", "Otro"],
  otraFuenteAgua: ["Nacimiento propio", "Quebrada", "Aljibe / pozo", "Agua lluvia", "Otro acueducto", "Otra"],
  estadoVivienda: ["habitada", "deshabitada", "en_construccion", "demolida"],
  tipoDocumento: ["CC", "TI", "RC", "CE", "PPT", "Pasaporte", "Sin documento"],
  sexo: ["F", "M", "Otro"],
  parentesco: [
    "Jefe(a) de hogar",
    "Cónyuge / compañero(a)",
    "Hijo(a)",
    "Hijastro(a)",
    "Nieto(a)",
    "Padre / madre",
    "Hermano(a)",
    "Suegro(a)",
    "Yerno / nuera",
    "Sobrino(a)",
    "Otro familiar",
    "No familiar",
  ],
  escolaridad: [
    "Ninguna",
    "Preescolar",
    "Primaria incompleta",
    "Primaria completa",
    "Secundaria incompleta",
    "Bachiller",
    "Técnico / tecnólogo",
    "Universitario",
    "Posgrado",
  ],
  regimenSalud: ["Subsidiado", "Contributivo", "Especial", "Ninguno"],
  grupoEtnico: ["Ninguno", "Afrodescendiente", "Indígena", "Raizal", "Rrom", "Palenquero"],
} as const;

export const ESTADO_VIVIENDA_LABEL: Record<string, string> = {
  habitada: "Habitada",
  deshabitada: "Deshabitada",
  en_construccion: "En construcción",
  demolida: "Demolida",
};

/** Edad actual de una persona: por fecha de nacimiento o, si no hay, por la edad reportada en la visita. */
export function edadPersona(p: {
  fechaNacimiento?: string | null;
  edadReportada?: number | null;
  edadReportadaEn?: string | null;
}): number | null {
  const porFecha = edad(p.fechaNacimiento);
  if (porFecha !== null) return porFecha;
  if (p.edadReportada == null) return null;
  if (!p.edadReportadaEn) return p.edadReportada;
  const [y, m, d] = p.edadReportadaEn.split("-").map(Number);
  const hoy = new Date();
  let anios = hoy.getFullYear() - y;
  if (hoy.getMonth() + 1 < m || (hoy.getMonth() + 1 === m && hoy.getDate() < d)) anios--;
  return p.edadReportada + Math.max(0, anios);
}

export function edad(fechaNacimiento: string | null | undefined, hoy = new Date()): number | null {
  if (!fechaNacimiento) return null;
  const [y, m, d] = fechaNacimiento.split("-").map(Number);
  if (!y) return null;
  let e = hoy.getFullYear() - y;
  if (hoy.getMonth() + 1 < m || (hoy.getMonth() + 1 === m && hoy.getDate() < d)) e--;
  return e;
}

/** Centro aproximado de Concepción, Antioquia (para el mapa vacío). */
export const CENTRO_MUNICIPIO: [number, number] = [6.3944, -75.2575];
