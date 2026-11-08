/**
 * Matriz de permisos: sección × acción.
 * Cada rol trae una plantilla por defecto; el superadmin puede ajustar los
 * permisos de cada usuario individualmente.
 */
export const SECCIONES = {
  censo: "Censo (viviendas y personas)",
  mapa_usuarios: "Mapa de usuarios",
  ayudas: "Ayudas y proyectos",
  acueducto_red: "Mapa del acueducto (red)",
  mantenimientos: "Mantenimientos y compras",
  suscriptores: "Suscriptores del acueducto",
  facturacion: "Cobros y pagos",
  tesoreria: "Tesorería del acueducto",
  tesoreria_junta: "Tesorería de la Junta",
  reportes: "Reportes y exportaciones",
  usuarios: "Usuarios del sistema",
} as const;

export const ACCIONES = {
  ver: "Ver",
  crear: "Crear",
  editar: "Editar",
  eliminar: "Eliminar",
  aprobar: "Aprobar",
} as const;

/** Acciones que aplican a cada sección (la matriz solo muestra estas). */
export function accionesDe(seccion: string): Accion[] {
  return seccion === "tesoreria" || seccion === "tesoreria_junta" ? ["ver", "crear", "editar", "aprobar"] : ["ver", "crear", "editar", "eliminar"];
}

/** Cada fondo tiene su propia sección de permisos: el mismo cargo puede manejar uno, otro o ambos. */
export type FondoPermiso = "acueducto" | "junta";
export const seccionFondo = (f: FondoPermiso): Seccion => (f === "junta" ? "tesoreria_junta" : "tesoreria");

/** Fondos en los que el usuario puede hacer la acción. */
export function fondosPermitidos(
  usuario: { rol: string; permisos: Permisos | Record<string, string[]> },
  accion: Accion = "ver",
): FondoPermiso[] {
  return (["acueducto", "junta"] as const).filter((f) => puede(usuario, seccionFondo(f), accion));
}

export type Seccion = keyof typeof SECCIONES;
export type Accion = keyof typeof ACCIONES;
export type Permisos = Partial<Record<Seccion, Accion[]>>;

export const ROLES = {
  superadmin: "Superadministrador",
  admin: "Administrador",
  fontanero: "Fontanero",
  encuestador: "Encuestador",
  tesorero: "Tesorero",
  suscriptor: "Suscriptor",
} as const;
export type Rol = keyof typeof ROLES;

const TODO: Accion[] = ["ver", "crear", "editar", "eliminar", "aprobar"];
const VCE: Accion[] = ["ver", "crear", "editar"];

export const PLANTILLAS: Record<Rol, Permisos> = {
  superadmin: Object.fromEntries(Object.keys(SECCIONES).map((s) => [s, TODO])) as Permisos,
  admin: {
    censo: TODO,
    mapa_usuarios: ["ver"],
    ayudas: TODO,
    acueducto_red: TODO,
    mantenimientos: TODO,
    suscriptores: TODO,
    facturacion: VCE,
    tesoreria: ["ver", "crear", "editar", "aprobar"],
    tesoreria_junta: ["ver", "crear", "editar", "aprobar"],
    reportes: ["ver"],
  },
  fontanero: {
    mapa_usuarios: ["ver"],
    acueducto_red: VCE,
    mantenimientos: VCE,
    suscriptores: ["ver"],
  },
  encuestador: {
    censo: VCE,
    mapa_usuarios: ["ver"],
  },
  tesorero: {
    suscriptores: ["ver"],
    facturacion: VCE,
    tesoreria: ["ver", "crear"],
    tesoreria_junta: ["ver", "crear"],
    reportes: ["ver"],
  },
  suscriptor: {},
};

export function puede(
  usuario: { rol: string; permisos: Permisos | Record<string, string[]> },
  seccion: Seccion,
  accion: Accion = "ver",
): boolean {
  if (usuario.rol === "superadmin") return true;
  const acciones = (usuario.permisos as Record<string, string[]>)[seccion] ?? [];
  return acciones.includes(accion);
}
