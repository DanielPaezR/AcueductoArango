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
  facturacion: "Facturación y pagos",
  reportes: "Reportes y exportaciones",
  usuarios: "Usuarios del sistema",
} as const;

export const ACCIONES = {
  ver: "Ver",
  crear: "Crear",
  editar: "Editar",
  eliminar: "Eliminar",
} as const;

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

const TODO: Accion[] = ["ver", "crear", "editar", "eliminar"];
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
