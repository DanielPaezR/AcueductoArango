/**
 * Modelo de datos — JAC Arango (censo + acueducto de la vereda)
 *
 * Convenciones:
 * - Las entidades que se pueden crear en campo (offline) usan UUID como PK para que
 *   el celular genere el id localmente y luego se sincronice sin conflictos.
 * - `deletedAt` = borrado lógico (nada se borra físicamente; la JAC necesita trazabilidad).
 * - Dinero en pesos colombianos como numeric(14,2).
 */
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  boolean,
  integer,
  numeric,
  doublePrecision,
  date,
  timestamp,
  jsonb,
  bigserial,
  serial,
  uniqueIndex,
  index,
  pgSequence,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */

export const rolEnum = pgEnum("rol", [
  "superadmin",
  "admin",
  "fontanero",
  "encuestador",
  "tesorero",
  "suscriptor",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

const softDelete = {
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

/* ------------------------------------------------------------------ */
/* Usuarios del sistema y permisos                                     */
/* ------------------------------------------------------------------ */

/**
 * `permisos` guarda la matriz sección → acciones, p.ej.
 *   { "censo": ["ver","crear","editar"], "facturacion": ["ver"] }
 * Se inicializa desde la plantilla del rol y el superadmin la puede ajustar.
 * El superadmin siempre tiene todo (no depende de esta columna).
 */
export const usuarios = pgTable("usuarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: varchar("nombre", { length: 120 }).notNull(),
  username: varchar("username", { length: 60 }).notNull().unique(),
  email: varchar("email", { length: 160 }),
  telefono: varchar("telefono", { length: 30 }),
  passwordHash: text("password_hash").notNull(),
  rol: rolEnum("rol").notNull(),
  /** Cargo en la Junta (p.ej. "Presidenta", "Tesorera"). Es lo que se muestra en la página pública. */
  cargo: varchar("cargo", { length: 60 }),
  permisos: jsonb("permisos").$type<Record<string, string[]>>().notNull().default({}),
  activo: boolean("activo").notNull().default(true),
  debeCambiarPassword: boolean("debe_cambiar_password").notNull().default(true),
  /** Versión de los términos de uso y compromiso de confidencialidad aceptados. */
  terminosVersion: varchar("terminos_version", { length: 20 }),
  terminosAceptadosEn: timestamp("terminos_aceptados_en", { withTimezone: true }),
  /** Para el futuro portal del suscriptor */
  suscriptorId: uuid("suscriptor_id"),
  ultimoAcceso: timestamp("ultimo_acceso", { withTimezone: true }),
  ...timestamps,
});

/* ------------------------------------------------------------------ */
/* Censo: sectores, viviendas, personas                                */
/* ------------------------------------------------------------------ */

export const sectores = pgTable("sectores", {
  id: serial("id").primaryKey(),
  nombre: varchar("nombre", { length: 100 }).notNull().unique(),
  descripcion: text("descripcion"),
  color: varchar("color", { length: 9 }),
});

export const viviendaCodigoSeq = pgSequence("vivienda_codigo_seq", { startWith: 1 });

export const viviendas = pgTable(
  "viviendas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Código visible, p.ej. "V-0123". Lo asigna la base de datos al crear. */
    codigo: varchar("codigo", { length: 20 })
      .unique()
      .default(sql`'V-' || lpad(nextval('vivienda_codigo_seq')::text, 4, '0')`),
    sectorId: integer("sector_id").references(() => sectores.id),

    // Ubicación
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    precisionM: doublePrecision("precision_m"),
    altitudM: doublePrecision("altitud_m"),
    ubicacionAjustada: boolean("ubicacion_ajustada").notNull().default(false),
    referencia: text("referencia"), // "Después de la escuela, portón verde"

    // Características
    nombrePredio: varchar("nombre_predio", { length: 120 }), // finca / predio
    tenencia: varchar("tenencia", { length: 30 }), // propia, arriendo, familiar, cuidandero, otra
    materialParedes: varchar("material_paredes", { length: 40 }),
    materialPiso: varchar("material_piso", { length: 40 }),
    numCuartos: integer("num_cuartos"),
    energia: boolean("energia"),
    gas: varchar("gas", { length: 30 }), // pipeta, leña, eléctrica, ninguno
    internet: boolean("internet"),
    senalCelular: varchar("senal_celular", { length: 30 }),
    saneamiento: varchar("saneamiento", { length: 40 }), // pozo séptico, alcantarillado, letrina, ninguno
    manejoBasuras: varchar("manejo_basuras", { length: 40 }),
    actividadEconomica: text("actividad_economica"), // café, ganadería, etc.

    // Agua
    usaAcueducto: boolean("usa_acueducto").notNull().default(false),
    otraFuenteAgua: varchar("otra_fuente_agua", { length: 60 }), // nacimiento propio, quebrada...
    // Matrícula (derecho) del acueducto
    tieneMatricula: boolean("tiene_matricula"),
    numeroMatricula: varchar("numero_matricula", { length: 30 }),
    titularMatriculaNombre: varchar("titular_matricula_nombre", { length: 160 }), // si la casa está alquilada
    titularMatriculaDocumento: varchar("titular_matricula_documento", { length: 30 }),
    titularMatriculaTelefono: varchar("titular_matricula_telefono", { length: 30 }),

    // Habeas Data (Ley 1581 de 2012)
    autorizacionDatos: boolean("autorizacion_datos").notNull().default(false),
    autorizacionFecha: timestamp("autorizacion_fecha", { withTimezone: true }),
    autorizacionNombre: varchar("autorizacion_nombre", { length: 120 }),
    autorizacionDocumento: varchar("autorizacion_documento", { length: 30 }),
    autorizacionMedio: varchar("autorizacion_medio", { length: 10 }), // firma, verbal
    autorizacionVersion: varchar("autorizacion_version", { length: 20 }), // versión de la política aceptada
    /** Fecha en que se suprimieron los datos personales a petición del titular. */
    datosSuprimidosEn: timestamp("datos_suprimidos_en", { withTimezone: true }),

    estado: varchar("estado", { length: 20 }).notNull().default("habitada"), // habitada, deshabitada, en_construccion, demolida
    observaciones: text("observaciones"),
    fotoPrincipalUrl: text("foto_principal_url"),

    createdBy: uuid("created_by").references(() => usuarios.id),
    updatedBy: uuid("updated_by").references(() => usuarios.id),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index("viviendas_sector_idx").on(t.sectorId)],
);

export const personas = pgTable(
  "personas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    viviendaId: uuid("vivienda_id")
      .notNull()
      .references(() => viviendas.id),
    nombres: varchar("nombres", { length: 100 }).notNull(),
    apellidos: varchar("apellidos", { length: 100 }),
    tipoDocumento: varchar("tipo_documento", { length: 10 }), // CC, TI, RC, CE, PPT
    numeroDocumento: varchar("numero_documento", { length: 30 }),
    fechaNacimiento: date("fecha_nacimiento"),
    /** Edad dicha en la visita (cuando no se conoce la fecha de nacimiento) y fecha en que se dijo,
     *  para calcular la edad actual con el paso del tiempo. */
    edadReportada: integer("edad_reportada"),
    edadReportadaEn: date("edad_reportada_en"),
    sexo: varchar("sexo", { length: 10 }),
    parentesco: varchar("parentesco", { length: 30 }), // jefe, cónyuge, hijo(a), nieto(a)...
    esJefeHogar: boolean("es_jefe_hogar").notNull().default(false),
    telefono: varchar("telefono", { length: 30 }),
    escolaridad: varchar("escolaridad", { length: 40 }),
    estudiaActualmente: boolean("estudia_actualmente"),
    ocupacion: varchar("ocupacion", { length: 80 }),
    regimenSalud: varchar("regimen_salud", { length: 20 }), // subsidiado, contributivo, ninguno
    eps: varchar("eps", { length: 60 }),
    sisbenGrupo: varchar("sisben_grupo", { length: 10 }), // A1..D21
    discapacidad: boolean("discapacidad").notNull().default(false),
    tipoDiscapacidad: varchar("tipo_discapacidad", { length: 80 }),
    grupoEtnico: varchar("grupo_etnico", { length: 40 }),
    victimaConflicto: boolean("victima_conflicto"),
    afiliadoJac: boolean("afiliado_jac").notNull().default(false),
    observaciones: text("observaciones"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index("personas_vivienda_idx").on(t.viviendaId),
    index("personas_documento_idx").on(t.numeroDocumento),
  ],
);

/* ------------------------------------------------------------------ */
/* Ayudas, proyectos y participación                                   */
/* ------------------------------------------------------------------ */

export const proyectos = pgTable("proyectos", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: varchar("nombre", { length: 160 }).notNull(),
  tipo: varchar("tipo", { length: 30 }).notNull(), // ayuda, proyecto, capacitacion, minga, evento, otro
  descripcion: text("descripcion"),
  entidad: varchar("entidad", { length: 120 }), // Alcaldía, Gobernación, ONG...
  fechaInicio: date("fecha_inicio"),
  fechaFin: date("fecha_fin"),
  estado: varchar("estado", { length: 20 }).notNull().default("activo"),
  createdBy: uuid("created_by").references(() => usuarios.id),
  ...timestamps,
  ...softDelete,
});

export const participaciones = pgTable(
  "participaciones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    proyectoId: uuid("proyecto_id")
      .notNull()
      .references(() => proyectos.id),
    viviendaId: uuid("vivienda_id").references(() => viviendas.id),
    personaId: uuid("persona_id").references(() => personas.id),
    fecha: date("fecha"),
    detalle: text("detalle"), // "Mercado #2", "Asistió a 3 jornadas"
    cantidad: numeric("cantidad", { precision: 10, scale: 2 }),
    valorEstimado: numeric("valor_estimado", { precision: 14, scale: 2 }),
    createdBy: uuid("created_by").references(() => usuarios.id),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index("participaciones_proyecto_idx").on(t.proyectoId)],
);

/* ------------------------------------------------------------------ */
/* Acueducto: red física                                               */
/* ------------------------------------------------------------------ */

/**
 * Elementos puntuales de la red: bocatoma, desarenador, tanques, válvulas, etc.
 * `datos` guarda atributos según el tipo (capacidad_litros, diametro_pulg, marca...).
 */
export const elementosAcueducto = pgTable("elementos_acueducto", {
  id: uuid("id").primaryKey().defaultRandom(),
  tipo: varchar("tipo", { length: 30 }).notNull(),
  // bocatoma, desarenador, planta_tratamiento, tanque_almacenamiento, tanque_quiebre,
  // valvula, purga, ventosa, hidrante, macromedidor, otro
  nombre: varchar("nombre", { length: 120 }),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  precisionM: doublePrecision("precision_m"),
  altitudM: doublePrecision("altitud_m"),
  estado: varchar("estado", { length: 20 }).notNull().default("operativo"), // operativo, con_falla, en_reparacion, fuera_servicio
  datos: jsonb("datos").$type<Record<string, unknown>>().notNull().default({}),
  fotoPrincipalUrl: text("foto_principal_url"),
  observaciones: text("observaciones"),
  createdBy: uuid("created_by").references(() => usuarios.id),
  ...timestamps,
  ...softDelete,
});

/** Tramos de tubería: geometría como lista de [lat, lng]. */
export const tramosAcueducto = pgTable("tramos_acueducto", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: varchar("nombre", { length: 120 }),
  tipo: varchar("tipo", { length: 20 }).notNull().default("distribucion"), // aduccion, conduccion, distribucion, acometida
  coordenadas: jsonb("coordenadas").$type<[number, number][]>().notNull(),
  diametroPulg: numeric("diametro_pulg", { precision: 5, scale: 2 }),
  material: varchar("material", { length: 30 }), // PVC, PEAD, galvanizado, manguera
  longitudM: doublePrecision("longitud_m"),
  anioInstalacion: integer("anio_instalacion"),
  estado: varchar("estado", { length: 20 }).notNull().default("operativo"),
  observaciones: text("observaciones"),
  createdBy: uuid("created_by").references(() => usuarios.id),
  ...timestamps,
  ...softDelete,
});

/* ------------------------------------------------------------------ */
/* Acueducto: mantenimientos, reparaciones y compras (rol fontanero)   */
/* ------------------------------------------------------------------ */

export const mantenimientos = pgTable(
  "mantenimientos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tipo: varchar("tipo", { length: 30 }).notNull(), // reparacion, preventivo, limpieza, instalacion, inspeccion, conexion, suspension, reconexion
    titulo: varchar("titulo", { length: 160 }).notNull(),
    descripcion: text("descripcion"),
    // A qué se le hizo (todo opcional; puede ser un punto suelto en el mapa)
    elementoId: uuid("elemento_id").references(() => elementosAcueducto.id),
    tramoId: uuid("tramo_id").references(() => tramosAcueducto.id),
    viviendaId: uuid("vivienda_id").references(() => viviendas.id),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    fechaReporte: date("fecha_reporte"),
    fechaEjecucion: date("fecha_ejecucion"),
    estado: varchar("estado", { length: 20 }).notNull().default("reportado"), // reportado, en_proceso, terminado, cancelado
    prioridad: varchar("prioridad", { length: 10 }).notNull().default("media"),
    responsableId: uuid("responsable_id").references(() => usuarios.id),
    costoManoObra: numeric("costo_mano_obra", { precision: 14, scale: 2 }).notNull().default("0"),
    createdBy: uuid("created_by").references(() => usuarios.id),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index("mantenimientos_elemento_idx").on(t.elementoId)],
);

/** Factura de compra de materiales (puede asociarse o no a un mantenimiento). */
export const compras = pgTable("compras", {
  id: uuid("id").primaryKey().defaultRandom(),
  mantenimientoId: uuid("mantenimiento_id").references(() => mantenimientos.id),
  proveedor: varchar("proveedor", { length: 120 }),
  numeroFactura: varchar("numero_factura", { length: 40 }),
  fecha: date("fecha").notNull(),
  total: numeric("total", { precision: 14, scale: 2 }).notNull(),
  observaciones: text("observaciones"),
  /** Movimiento de tesorería creado a partir de esta compra (para no duplicarlo). */
  movimientoId: uuid("movimiento_id"),
  createdBy: uuid("created_by").references(() => usuarios.id),
  ...timestamps,
  ...softDelete,
});

export const materialesUsados = pgTable("materiales_usados", {
  id: uuid("id").primaryKey().defaultRandom(),
  mantenimientoId: uuid("mantenimiento_id")
    .notNull()
    .references(() => mantenimientos.id),
  compraId: uuid("compra_id").references(() => compras.id),
  descripcion: varchar("descripcion", { length: 160 }).notNull(), // "Tubo PVC 1/2'' x 6m"
  cantidad: numeric("cantidad", { precision: 10, scale: 2 }).notNull(),
  unidad: varchar("unidad", { length: 20 }),
  valorUnitario: numeric("valor_unitario", { precision: 14, scale: 2 }),
});

/* ------------------------------------------------------------------ */
/* Acueducto: suscriptores y facturación (tarifa fija mensual)         */
/* ------------------------------------------------------------------ */

export const suscriptorCodigoSeq = pgSequence("suscriptor_codigo_seq", { startWith: 1 });

export const suscriptores = pgTable("suscriptores", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Número de matrícula si la tiene; si no, "S-0001" consecutivo. */
  codigo: varchar("codigo", { length: 30 })
    .notNull()
    .unique()
    .default(sql`'S-' || lpad(nextval('suscriptor_codigo_seq')::text, 4, '0')`),
  viviendaId: uuid("vivienda_id")
    .notNull()
    .references(() => viviendas.id),
  titularPersonaId: uuid("titular_persona_id").references(() => personas.id),
  titularNombre: varchar("titular_nombre", { length: 160 }).notNull(),
  fechaConexion: date("fecha_conexion"),
  estado: varchar("estado", { length: 20 }).notNull().default("activo"), // activo, suspendido, retirado
  exento: boolean("exento").notNull().default(false),
  observaciones: text("observaciones"),
  ...timestamps,
  ...softDelete,
});

/** Historial de tarifas: la vigente para un mes es la de mayor `vigenteDesde` <= mes. */
export const tarifas = pgTable("tarifas", {
  id: serial("id").primaryKey(),
  valorMensual: numeric("valor_mensual", { precision: 14, scale: 2 }).notNull(),
  vigenteDesde: date("vigente_desde").notNull().unique(),
  actaAprobacion: varchar("acta_aprobacion", { length: 120 }),
  notas: text("notas"),
  createdBy: uuid("created_by").references(() => usuarios.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const periodos = pgTable(
  "periodos",
  {
    id: serial("id").primaryKey(),
    anio: integer("anio").notNull(),
    mes: integer("mes").notNull(),
    fechaEmision: date("fecha_emision").notNull(),
    fechaVencimiento: date("fecha_vencimiento").notNull(),
    tarifaId: integer("tarifa_id")
      .notNull()
      .references(() => tarifas.id),
    estado: varchar("estado", { length: 10 }).notNull().default("abierto"), // abierto, cerrado
    generadoPor: uuid("generado_por").references(() => usuarios.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("periodos_anio_mes_uq").on(t.anio, t.mes)],
);

/** Lado DEBE del estado de cuenta. */
export const cargos = pgTable(
  "cargos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    suscriptorId: uuid("suscriptor_id")
      .notNull()
      .references(() => suscriptores.id),
    periodoId: integer("periodo_id").references(() => periodos.id),
    tipo: varchar("tipo", { length: 20 }).notNull(), // mensualidad, extraordinaria, multa, reconexion, matricula, saldo_inicial, ajuste
    concepto: varchar("concepto", { length: 160 }).notNull(),
    valor: numeric("valor", { precision: 14, scale: 2 }).notNull(),
    fecha: date("fecha").notNull(),
    anulado: boolean("anulado").notNull().default(false),
    motivoAnulacion: text("motivo_anulacion"),
    createdBy: uuid("created_by").references(() => usuarios.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("cargos_suscriptor_idx").on(t.suscriptorId),
    uniqueIndex("cargos_mensualidad_uq").on(t.suscriptorId, t.periodoId, t.tipo),
  ],
);

/** Lado HABER del estado de cuenta. */
export const pagos = pgTable(
  "pagos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    suscriptorId: uuid("suscriptor_id")
      .notNull()
      .references(() => suscriptores.id),
    numeroRecibo: serial("numero_recibo").notNull().unique(),
    fecha: date("fecha").notNull(),
    valor: numeric("valor", { precision: 14, scale: 2 }).notNull(),
    medio: varchar("medio", { length: 20 }).notNull().default("efectivo"), // efectivo, transferencia, nequi, daviplata, consignacion
    /** Cuenta de tesorería donde entró el dinero. */
    cuentaId: integer("cuenta_id").references(() => cuentas.id),
    referencia: varchar("referencia", { length: 80 }),
    observaciones: text("observaciones"),
    anulado: boolean("anulado").notNull().default(false),
    motivoAnulacion: text("motivo_anulacion"),
    createdBy: uuid("created_by").references(() => usuarios.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("pagos_suscriptor_idx").on(t.suscriptorId)],
);

/* ------------------------------------------------------------------ */
/* Tesorería del acueducto (pública en /transparencia)                 */
/* ------------------------------------------------------------------ */

export const cuentas = pgTable("cuentas", {
  id: serial("id").primaryKey(),
  nombre: varchar("nombre", { length: 80 }).notNull(), // "Cuenta de ahorros Bancolombia"
  /** A qué plata pertenece: el acueducto y la Junta llevan cuentas separadas. */
  fondo: varchar("fondo", { length: 12 }).notNull().default("acueducto"), // acueducto, junta
  tipo: varchar("tipo", { length: 20 }).notNull().default("banco"), // banco, efectivo, billetera
  entidad: varchar("entidad", { length: 60 }),
  /** Solo los últimos dígitos: la página pública no debe exponer el número completo. */
  ultimosDigitos: varchar("ultimos_digitos", { length: 6 }),
  saldoInicial: numeric("saldo_inicial", { precision: 14, scale: 2 }).notNull().default("0"),
  fechaSaldoInicial: date("fecha_saldo_inicial").notNull(),
  activa: boolean("activa").notNull().default(true),
  createdBy: uuid("created_by").references(() => usuarios.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Movimientos de dinero. Nada se borra: se rechaza o se anula con motivo.
 * Solo los aprobados cuentan para el saldo y aparecen como definitivos en la página pública.
 * Se guarda el CARGO de quien registra/aprueba en ese momento (es lo que se publica).
 */
export const movimientos = pgTable(
  "movimientos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cuentaId: integer("cuenta_id")
      .notNull()
      .references(() => cuentas.id),
    tipo: varchar("tipo", { length: 10 }).notNull(), // ingreso, egreso
    categoria: varchar("categoria", { length: 40 }).notNull(),
    concepto: varchar("concepto", { length: 300 }).notNull(),
    valor: numeric("valor", { precision: 14, scale: 2 }).notNull(), // siempre positivo
    fecha: date("fecha").notNull(),
    estado: varchar("estado", { length: 12 }).notNull().default("pendiente"), // pendiente, aprobado, rechazado, anulado
    origen: varchar("origen", { length: 10 }).notNull().default("manual"), // manual, pago
    pagoId: uuid("pago_id").references(() => pagos.id),
    registradoPor: uuid("registrado_por").references(() => usuarios.id),
    cargoRegistro: varchar("cargo_registro", { length: 60 }),
    aprobadoPor: uuid("aprobado_por").references(() => usuarios.id),
    cargoAprobacion: varchar("cargo_aprobacion", { length: 60 }),
    aprobadoEn: timestamp("aprobado_en", { withTimezone: true }),
    motivo: text("motivo"), // de rechazo o anulación
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("movimientos_cuenta_idx").on(t.cuentaId), index("movimientos_fecha_idx").on(t.fecha)],
);

/* ------------------------------------------------------------------ */
/* Adjuntos (Cloudinary) — fotos, facturas, documentos de cualquier    */
/* entidad                                                             */
/* ------------------------------------------------------------------ */

export const adjuntos = pgTable(
  "adjuntos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entidad: varchar("entidad", { length: 30 }).notNull(), // vivienda, persona, elemento, tramo, mantenimiento, compra, pago, participacion, proyecto
    entidadId: uuid("entidad_id").notNull(),
    tipo: varchar("tipo", { length: 20 }).notNull().default("foto"), // foto, factura, documento, antes, despues, soporte, firma
    /** Archivo privado en Cloudinary (solo se ve con URL firmada; p. ej. firmas de autorización). */
    privado: boolean("privado").notNull().default(false),
    url: text("url").notNull(),
    publicId: text("public_id").notNull(),
    descripcion: text("descripcion"),
    createdBy: uuid("created_by").references(() => usuarios.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    ...softDelete,
  },
  (t) => [index("adjuntos_entidad_idx").on(t.entidad, t.entidadId)],
);

/* ------------------------------------------------------------------ */
/* Auditoría                                                           */
/* ------------------------------------------------------------------ */

export const auditoria = pgTable(
  "auditoria",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    usuarioId: uuid("usuario_id").references(() => usuarios.id),
    accion: varchar("accion", { length: 30 }).notNull(), // crear, editar, eliminar, login, anular, generar_periodo...
    entidad: varchar("entidad", { length: 30 }).notNull(),
    entidadId: text("entidad_id"),
    datos: jsonb("datos"),
    ip: varchar("ip", { length: 60 }),
    fecha: timestamp("fecha", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("auditoria_entidad_idx").on(t.entidad, t.entidadId)],
);
