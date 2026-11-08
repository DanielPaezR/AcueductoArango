import { z } from "zod";

const txt = (max = 200) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));
const bool = z.boolean().nullish().transform((v) => v ?? null);

export const personaSchema = z.object({
  id: z.uuid(),
  nombres: z.string().trim().min(1, "Cada persona necesita nombres").max(100),
  apellidos: txt(100),
  tipoDocumento: txt(10),
  numeroDocumento: txt(30),
  fechaNacimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  edadReportada: z.number().int().min(0).max(120).nullish().transform((v) => v ?? null),
  edadReportadaEn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish()
    .transform((v) => v ?? null),
  sexo: txt(10),
  parentesco: txt(30),
  esJefeHogar: z.boolean().default(false),
  telefono: txt(30),
  escolaridad: txt(40),
  estudiaActualmente: bool,
  ocupacion: txt(80),
  regimenSalud: txt(20),
  eps: txt(60),
  sisbenGrupo: txt(10),
  discapacidad: z.boolean().default(false),
  tipoDiscapacidad: txt(80),
  grupoEtnico: txt(40),
  victimaConflicto: bool,
  afiliadoJac: z.boolean().default(false),
  observaciones: txt(1000),
});

export const viviendaSchema = z.object({
  id: z.uuid(),
  sectorId: z.number().int().nullish().transform((v) => v ?? null),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  precisionM: z.number().nullish().transform((v) => v ?? null),
  altitudM: z.number().nullish().transform((v) => v ?? null),
  ubicacionAjustada: z.boolean().default(false),
  referencia: txt(500),
  nombrePredio: txt(120),
  tenencia: txt(30),
  materialParedes: txt(40),
  materialPiso: txt(40),
  numCuartos: z.number().int().min(0).max(50).nullish().transform((v) => v ?? null),
  energia: bool,
  gas: txt(30),
  internet: bool,
  senalCelular: txt(30),
  saneamiento: txt(40),
  manejoBasuras: txt(40),
  actividadEconomica: txt(300),
  usaAcueducto: z.boolean().default(false),
  otraFuenteAgua: txt(60),
  tieneMatricula: bool,
  numeroMatricula: txt(30),
  titularMatriculaNombre: txt(160),
  titularMatriculaDocumento: txt(30),
  titularMatriculaTelefono: txt(30),
  autorizacionDatos: z.boolean().default(false),
  autorizacionNombre: txt(120),
  autorizacionDocumento: txt(30),
  autorizacionMedio: z.enum(["firma", "verbal"]).nullish().transform((v) => v ?? null),
  estado: z.enum(["habitada", "deshabitada", "en_construccion", "demolida"]).default("habitada"),
  observaciones: txt(2000),
});

export const syncViviendaSchema = z.object({
  vivienda: viviendaSchema,
  personas: z.array(personaSchema).max(40),
});

export type ViviendaInput = z.input<typeof viviendaSchema>;
export type PersonaInput = z.input<typeof personaSchema>;
export type SyncViviendaInput = z.input<typeof syncViviendaSchema>;

/* ---------------- Red del acueducto y mantenimientos ---------------- */

const fechaOpc = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullish()
  .or(z.literal(""))
  .transform((v) => (v ? v : null));
const numOpc = z.number().nullish().transform((v) => v ?? null);

export const elementoSchema = z.object({
  id: z.uuid(),
  tipo: z.enum([
    "bocatoma",
    "desarenador",
    "planta_tratamiento",
    "tanque_almacenamiento",
    "tanque_quiebre",
    "valvula",
    "purga",
    "ventosa",
    "hidrante",
    "macromedidor",
    "otro",
  ]),
  nombre: txt(120),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  precisionM: numOpc,
  altitudM: numOpc,
  estado: z.enum(["operativo", "con_falla", "en_reparacion", "fuera_servicio"]).default("operativo"),
  datos: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
  observaciones: txt(2000),
});

export const tramoSchema = z.object({
  id: z.uuid(),
  nombre: txt(120),
  tipo: z.enum(["aduccion", "conduccion", "distribucion", "acometida"]),
  coordenadas: z.array(z.tuple([z.number(), z.number()])).min(2, "La tubería necesita al menos 2 puntos").max(2000),
  diametroPulg: numOpc,
  material: txt(30),
  anioInstalacion: z.number().int().min(1950).max(2100).nullish().transform((v) => v ?? null),
  estado: z.enum(["operativo", "con_falla", "en_reparacion", "fuera_servicio"]).default("operativo"),
  observaciones: txt(2000),
});

export const mantenimientoSchema = z.object({
  id: z.uuid(),
  tipo: z.enum(["reparacion", "preventivo", "limpieza", "instalacion", "inspeccion", "conexion", "suspension", "reconexion"]),
  titulo: z.string().trim().min(3, "Escriba qué se hizo o qué pasó").max(160),
  descripcion: txt(4000),
  elementoId: z.uuid().nullish().transform((v) => v ?? null),
  tramoId: z.uuid().nullish().transform((v) => v ?? null),
  viviendaId: z.uuid().nullish().transform((v) => v ?? null),
  lat: numOpc,
  lng: numOpc,
  fechaReporte: fechaOpc,
  fechaEjecucion: fechaOpc,
  estado: z.enum(["reportado", "en_proceso", "terminado", "cancelado"]).default("reportado"),
  prioridad: z.enum(["alta", "media", "baja"]).default("media"),
  costoManoObra: z.number().min(0).default(0),
  materiales: z
    .array(
      z.object({
        id: z.uuid(),
        descripcion: z.string().trim().min(1, "Cada material necesita descripción").max(160),
        cantidad: z.number().positive("Cantidad inválida"),
        unidad: txt(20),
        valorUnitario: numOpc,
      }),
    )
    .max(100)
    .default([]),
  compra: z
    .object({
      id: z.uuid(),
      proveedor: txt(120),
      numeroFactura: txt(40),
      fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      total: z.number().positive("Escriba el total de la factura"),
    })
    .nullish()
    .transform((v) => v ?? null),
});

export type ElementoInput = z.input<typeof elementoSchema>;
export type TramoInput = z.input<typeof tramoSchema>;
export type MantenimientoInput = z.input<typeof mantenimientoSchema>;
