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
  titularMatriculaTelefono: txt(30),
  autorizacionDatos: z.boolean().default(false),
  autorizacionNombre: txt(120),
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
