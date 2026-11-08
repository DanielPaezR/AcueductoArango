/** Utilidades de dinero y fechas (sirven en cliente y servidor). */

const fmt = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

export function pesos(v: number | string | null | undefined) {
  return fmt.format(Number(v ?? 0));
}

/** Convierte "25.000", "$ 25 000" o "25000" a número. */
export function leerPesos(v: FormDataEntryValue | string | null): number {
  const n = Number(String(v ?? "").replace(/[^\d,-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n) : NaN;
}

export function hoyBogota() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" }); // YYYY-MM-DD
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const nombreMes = (m: number) => MESES[m - 1];

export function fechaCorta(iso: string | null | undefined) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES[m - 1].slice(0, 3)} ${y}`;
}

export const FONDOS = { acueducto: "Acueducto", junta: "Junta de Acción Comunal" } as const;
export type Fondo = keyof typeof FONDOS;

/** Categorías de ingresos y gastos según el fondo de la cuenta. */
export const CATEGORIAS_POR_FONDO = {
  acueducto: {
    ingreso: [
      "Mensualidades",
      "Matrículas y conexiones",
      "Multas y reconexiones",
      "Cuotas extraordinarias",
      "Donaciones y aportes",
      "Rendimientos bancarios",
      "Otros ingresos",
    ],
    egreso: [
      "Materiales",
      "Mano de obra y fontanería",
      "Mantenimiento de la red",
      "Análisis y tratamiento del agua",
      "Gastos bancarios",
      "Papelería y administración",
      "Otros gastos",
    ],
  },
  junta: {
    ingreso: [
      "Cuotas de afiliados",
      "Eventos, rifas y bazares",
      "Aportes de entidades (Alcaldía, Gobernación…)",
      "Donaciones",
      "Rendimientos bancarios",
      "Otros ingresos",
    ],
    egreso: [
      "Obras y mejoras comunitarias",
      "Ayudas a familias",
      "Asambleas y reuniones",
      "Eventos comunitarios",
      "Papelería y administración",
      "Gastos bancarios",
      "Otros gastos",
    ],
  },
} as const;

/** Compatibilidad: categorías del acueducto. */
export const CATEGORIAS = CATEGORIAS_POR_FONDO.acueducto;

export const ESTADO_MOVIMIENTO: Record<string, string> = {
  pendiente: "Por aprobar",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  anulado: "Anulado",
};

export const TIPO_CARGO: Record<string, string> = {
  mensualidad: "Mensualidad",
  extraordinaria: "Cuota extraordinaria",
  multa: "Multa",
  reconexion: "Reconexión",
  matricula: "Matrícula / conexión",
  saldo_inicial: "Saldo anterior",
  ajuste: "Ajuste",
};

export const MEDIOS_PAGO = ["efectivo", "transferencia", "consignacion", "nequi", "daviplata"] as const;
export const MEDIO_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  consignacion: "Consignación",
  nequi: "Nequi",
  daviplata: "Daviplata",
};
