/**
 * Matriz de permisos: sección × acción.
 * Cada rol trae una plantilla por defecto; el superadmin puede ajustar los
 * permisos de cada usuario individualmente.
 */
export const SECCIONES = {
  // Comunidad y Junta
  censo: "Censo (viviendas y personas)",
  poblacion: "Población (estadísticas y listados)",
  mapa_usuarios: "Mapa de la vereda",
  novedades: "Novedades y obras",
  ayudas: "Ayudas y proyectos",
  libro_actas: "Libro de actas",
  libro_inventario: "Libro de inventario",
  libro_contable: "Libro de contabilidad (Junta)",
  documentos: "Documentos (estatutos, reglamentos)",
  // Acueducto (módulo que se puede desactivar)
  acueducto_red: "Acueducto: red",
  mantenimientos: "Acueducto: mantenimientos",
  suscriptores: "Acueducto: suscriptores",
  facturacion: "Acueducto: cobros y pagos",
  tesoreria: "Acueducto: tesorería",
  // Administración
  reportes: "Reportes y exportaciones",
  usuarios: "Usuarios y bitácora",
} as const;

/** Secciones que pertenecen al módulo de acueducto. */
export const SECCIONES_ACUEDUCTO = ["acueducto_red", "mantenimientos", "suscriptores", "facturacion", "tesoreria"] as const;

export const ACCIONES = {
  ver: "Ver",
  crear: "Crear",
  editar: "Editar",
  eliminar: "Eliminar",
  aprobar: "Aprobar",
} as const;

/** Acciones que aplican a cada sección (la matriz solo muestra estas). */
export function accionesDe(seccion: string): Accion[] {
  if (seccion === "tesoreria") return ["ver", "crear", "editar", "aprobar"];
  // Un asiento contable no se borra: se corrige (editar) o se anula, y todo queda en su historial
  if (seccion === "libro_contable") return ["ver", "crear", "editar"];
  if (seccion === "poblacion") return ["ver"];
  return ["ver", "crear", "editar", "eliminar"];
}

export type Seccion = keyof typeof SECCIONES;
export type Accion = keyof typeof ACCIONES;
export type Permisos = Partial<Record<Seccion, Accion[]>>;

export const ROLES = {
  superadmin: "Superadministrador",
  admin: "Presidencia",
  tesorero: "Tesorería",
  encuestador: "Encuestador",
  consulta: "Fiscal / veedor (consulta)",
  fontanero: "Fontanero (acueducto)",
  suscriptor: "Suscriptor (acueducto)",
} as const;
export type Rol = keyof typeof ROLES;

const TODO: Accion[] = ["ver", "crear", "editar", "eliminar", "aprobar"];
const CRUD: Accion[] = ["ver", "crear", "editar", "eliminar"];
const VCE: Accion[] = ["ver", "crear", "editar"];

export const PLANTILLAS: Record<Rol, Permisos> = {
  superadmin: Object.fromEntries(Object.keys(SECCIONES).map((s) => [s, TODO])) as Permisos,
  admin: {
    censo: CRUD,
    poblacion: ["ver"],
    mapa_usuarios: ["ver"],
    novedades: CRUD,
    ayudas: CRUD,
    libro_actas: CRUD,
    libro_inventario: CRUD,
    libro_contable: VCE,
    documentos: CRUD,
    acueducto_red: CRUD,
    mantenimientos: CRUD,
    suscriptores: CRUD,
    facturacion: VCE,
    tesoreria: ["ver", "crear", "editar", "aprobar"],
    reportes: ["ver"],
  },
  tesorero: {
    libro_contable: VCE,
    documentos: ["ver"],
    suscriptores: ["ver"],
    facturacion: VCE,
    tesoreria: ["ver", "crear"],
    reportes: ["ver"],
  },
  encuestador: {
    censo: VCE,
    poblacion: ["ver"],
    mapa_usuarios: ["ver"],
    novedades: ["ver", "crear"],
    documentos: ["ver"],
  },
  consulta: {
    libro_contable: ["ver"],
    tesoreria: ["ver"],
  },
  fontanero: {
    mapa_usuarios: ["ver"],
    acueducto_red: VCE,
    mantenimientos: VCE,
    suscriptores: ["ver"],
  },
  suscriptor: {},
};

/**
 * La contabilidad de la Junta solo la escriben quienes tienen el permiso explícito (presidencia y tesorería):
 * el superadministrador puede verla, pero no crear ni editar asientos sin que se le asigne (queda en la bitácora).
 */
const SOLO_EXPLICITO: Partial<Record<Seccion, Accion[]>> = { libro_contable: ["crear", "editar", "eliminar", "aprobar"] };

export function puede(
  usuario: { rol: string; permisos: Permisos | Record<string, string[]> },
  seccion: Seccion,
  accion: Accion = "ver",
): boolean {
  const acciones = (usuario.permisos as Record<string, string[]>)[seccion] ?? [];
  if (usuario.rol === "superadmin" && !SOLO_EXPLICITO[seccion]?.includes(accion)) return true;
  return acciones.includes(accion);
}

/** Cada fondo tiene su propia sección de permisos: acueducto → tesorería; Junta → libro de contabilidad. */
export type FondoPermiso = "acueducto" | "junta";
export const seccionFondo = (f: FondoPermiso): Seccion => (f === "junta" ? "libro_contable" : "tesoreria");

/** Fondos en los que el usuario puede hacer la acción. */
export function fondosPermitidos(
  usuario: { rol: string; permisos: Permisos | Record<string, string[]> },
  accion: Accion = "ver",
): FondoPermiso[] {
  return (["acueducto", "junta"] as const).filter((f) => puede(usuario, seccionFondo(f), accion));
}
