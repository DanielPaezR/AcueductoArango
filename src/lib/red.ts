/** Catálogo de la red del acueducto (sirve en cliente y servidor). */

export type Forma = "triangulo" | "cuadrado" | "rombo" | "circulo";

export const TIPOS_ELEMENTO = {
  bocatoma: { label: "Bocatoma", forma: "triangulo", campos: ["fuente", "caudalLps"] },
  desarenador: { label: "Desarenador", forma: "cuadrado", campos: ["capacidadLitros", "material"] },
  planta_tratamiento: { label: "Planta de tratamiento", forma: "cuadrado", campos: ["capacidadLitros"] },
  tanque_almacenamiento: { label: "Tanque de almacenamiento", forma: "cuadrado", campos: ["capacidadLitros", "material"] },
  tanque_quiebre: { label: "Tanque de quiebre de presión", forma: "cuadrado", campos: ["capacidadLitros", "material"] },
  valvula: { label: "Válvula / llave de paso", forma: "rombo", campos: ["diametroPulg"] },
  purga: { label: "Purga", forma: "rombo", campos: ["diametroPulg"] },
  ventosa: { label: "Ventosa", forma: "rombo", campos: ["diametroPulg"] },
  hidrante: { label: "Hidrante", forma: "circulo", campos: ["diametroPulg"] },
  macromedidor: { label: "Macromedidor", forma: "circulo", campos: ["diametroPulg", "marca"] },
  otro: { label: "Otro", forma: "circulo", campos: [] },
} as const satisfies Record<string, { label: string; forma: Forma; campos: readonly string[] }>;

export type TipoElemento = keyof typeof TIPOS_ELEMENTO;

export const CAMPOS_DATOS: Record<string, { label: string; numero?: boolean; placeholder?: string }> = {
  fuente: { label: "Fuente de agua", placeholder: "Ej: Quebrada La Arango" },
  caudalLps: { label: "Caudal (litros por segundo)", numero: true },
  capacidadLitros: { label: "Capacidad (litros)", numero: true },
  material: { label: "Material", placeholder: "Concreto, plástico, ferrocemento…" },
  diametroPulg: { label: "Diámetro (pulgadas)", numero: true },
  marca: { label: "Marca" },
};

export const ESTADOS_RED = {
  operativo: { label: "Funcionando", color: "#1f6698" },
  con_falla: { label: "Con falla", color: "#c48a1c" },
  en_reparacion: { label: "En reparación", color: "#d0632a" },
  fuera_servicio: { label: "Fuera de servicio", color: "#a8382c" },
} as const;
export type EstadoRed = keyof typeof ESTADOS_RED;

export const TIPOS_TRAMO = {
  aduccion: { label: "Aducción (bocatoma → desarenador)", corto: "Aducción", peso: 6 },
  conduccion: { label: "Conducción (hacia los tanques)", corto: "Conducción", peso: 5 },
  distribucion: { label: "Red de distribución", corto: "Distribución", peso: 4 },
  acometida: { label: "Acometida (a una casa)", corto: "Acometida", peso: 2 },
} as const;
export type TipoTramo = keyof typeof TIPOS_TRAMO;

export const MATERIALES_TUBO = ["PVC", "PEAD (polietileno)", "Galvanizado", "Manguera", "Otro"];

export const TIPOS_MANTENIMIENTO = {
  reparacion: "Reparación de daño",
  preventivo: "Mantenimiento preventivo",
  limpieza: "Limpieza / lavado",
  instalacion: "Instalación nueva",
  inspeccion: "Inspección / revisión",
  conexion: "Conexión de usuario",
  suspension: "Suspensión de servicio",
  reconexion: "Reconexión",
} as const;

export const ESTADOS_MANTENIMIENTO = {
  reportado: "Reportado",
  en_proceso: "En proceso",
  terminado: "Terminado",
  cancelado: "Cancelado",
} as const;

export const PRIORIDADES = { alta: "Alta", media: "Media", baja: "Baja" } as const;

/** Longitud de una línea en metros (fórmula de haversine). */
export function longitudMetros(puntos: [number, number][]) {
  const R = 6371000;
  const rad = (g: number) => (g * Math.PI) / 180;
  let total = 0;
  for (let i = 1; i < puntos.length; i++) {
    const [la1, lo1] = puntos[i - 1];
    const [la2, lo2] = puntos[i];
    const a = Math.sin(rad(la2 - la1) / 2) ** 2 + Math.cos(rad(la1)) * Math.cos(rad(la2)) * Math.sin(rad(lo2 - lo1) / 2) ** 2;
    total += 2 * R * Math.asin(Math.sqrt(a));
  }
  return Math.round(total);
}

/** SVG del marcador de un punto de la red: la forma dice el tipo y el color el estado. */
export function svgElemento(tipo: string, estado: string, tamano = 26) {
  const forma = (TIPOS_ELEMENTO[tipo as TipoElemento] ?? TIPOS_ELEMENTO.otro).forma;
  const color = ESTADOS_RED[estado as EstadoRed]?.color ?? ESTADOS_RED.operativo.color;
  const t = tamano;
  const c = t / 2;
  const trazo = `fill="${color}" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"`;
  const figura =
    forma === "triangulo"
      ? `<path d="M${c} 2 L${t - 2} ${t - 3} L2 ${t - 3} Z" ${trazo}/>`
      : forma === "cuadrado"
        ? `<rect x="3" y="3" width="${t - 6}" height="${t - 6}" rx="3" ${trazo}/>`
        : forma === "rombo"
          ? `<path d="M${c} 2 L${t - 2} ${c} L${c} ${t - 2} L2 ${c} Z" ${trazo}/>`
          : `<circle cx="${c}" cy="${c}" r="${c - 3}" ${trazo}/>`;
  return `<svg width="${t}" height="${t}" viewBox="0 0 ${t} ${t}" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))">${figura}</svg>`;
}
