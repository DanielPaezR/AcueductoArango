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

/** Por qué una visita quedó con la información pendiente. */
export const MOTIVOS_PENDIENTE = {
  veraneo: "Finca de veraneo",
  sin_atender: "No había nadie",
  otro: "Otro motivo",
} as const;
export type MotivoPendiente = keyof typeof MOTIVOS_PENDIENTE;

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

/** Grupos de edad (curso de vida, Ministerio de Salud) con los nombres que usa la Junta. */
export const GRUPOS_EDAD = [
  { id: "infantes", label: "Infantes", rango: "0 a 5 años", min: 0, max: 5 },
  { id: "ninos", label: "Niños", rango: "6 a 11 años", min: 6, max: 11 },
  { id: "adolescentes", label: "Adolescentes", rango: "12 a 17 años", min: 12, max: 17 },
  { id: "jovenes", label: "Jóvenes", rango: "18 a 28 años", min: 18, max: 28 },
  { id: "adultos", label: "Adultos", rango: "29 a 59 años", min: 29, max: 59 },
  { id: "mayores", label: "Adultos mayores", rango: "60 años o más", min: 60, max: 200 },
] as const;
export type GrupoEdad = (typeof GRUPOS_EDAD)[number]["id"];

export function grupoDeEdad(e: number | null): GrupoEdad | null {
  if (e === null) return null;
  return GRUPOS_EDAD.find((g) => e >= g.min && e <= g.max)?.id ?? null;
}

/* ---------- Libros de la Junta ---------- */

export const TIPOS_ACTA = {
  asamblea: "Asamblea general",
  asamblea_extraordinaria: "Asamblea extraordinaria",
  junta_directiva: "Junta directiva",
  otra: "Otra reunión",
} as const;

export const ESTADOS_BIEN = {
  bueno: { label: "Bueno", clase: "bg-marca-50 text-marca-800" },
  regular: { label: "Regular", clase: "bg-ocre-50 text-ocre-800" },
  malo: { label: "Malo", clase: "bg-teja-50 text-teja-700" },
  dado_de_baja: { label: "Dado de baja", clase: "bg-stone-200 text-stone-700" },
} as const;

/* ---------- Novedades y obras ---------- */

export const CATEGORIAS_NOVEDAD = {
  vias: { label: "Vías y caminos", color: "#a8382c" },
  puentes: { label: "Puentes y pasos", color: "#7a4fa0" },
  ambiental: { label: "Ambiental", color: "#2a6b48" },
  limpieza: { label: "Limpieza y convites", color: "#3f7f8c" },
  infraestructura: { label: "Infraestructura", color: "#1f6698" },
  social: { label: "Social y comunitario", color: "#c48a1c" },
  otro: { label: "Otro", color: "#5d655e" },
} as const;
export type CategoriaNovedad = keyof typeof CATEGORIAS_NOVEDAD;

export const ESTADOS_NOVEDAD = {
  pendiente: { label: "Pendiente", clase: "bg-ocre-50 text-ocre-800" },
  en_ejecucion: { label: "En ejecución", clase: "bg-postigo-50 text-postigo-800" },
  realizado: { label: "Realizado", clase: "bg-marca-50 text-marca-800" },
} as const;
export type EstadoNovedad = keyof typeof ESTADOS_NOVEDAD;

export const CATEGORIAS_DOCUMENTO = {
  estatutos: "Estatutos",
  reglamento: "Reglamento interno",
  fondo_rotatorio: "Fondo rotatorio",
  otro: "Otro documento",
} as const;
