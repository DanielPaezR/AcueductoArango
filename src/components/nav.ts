import type { Seccion } from "@/lib/permisos";

export type NombreIcono =
  | "inicio"
  | "mapa"
  | "viviendas"
  | "poblacion"
  | "novedades"
  | "ayudas"
  | "libros"
  | "documentos"
  | "acueducto"
  | "mantenimientos"
  | "suscriptores"
  | "facturacion"
  | "tesoreria"
  | "transparencia"
  | "reportes"
  | "usuarios"
  | "bitacora"
  | "configuracion";

export type ItemNav = {
  href: string;
  label: string;
  icono: NombreIcono;
  seccion?: Seccion;
  /** Basta con tener permiso en cualquiera de estas secciones. */
  secciones?: Seccion[];
  /** Solo se muestra si ese módulo está activo. */
  modulo?: "acueducto";
  soloSuperadmin?: boolean;
  /** Grupo del menú lateral al que pertenece. */
  grupo?: string;
  fase?: number;
};

export const NAV: ItemNav[] = [
  { href: "/", label: "Inicio", icono: "inicio" },
  { href: "/mapa", label: "Mapa de la vereda", icono: "mapa", seccion: "mapa_usuarios", grupo: "Comunidad" },
  { href: "/viviendas", label: "Viviendas", icono: "viviendas", seccion: "censo", grupo: "Comunidad" },
  { href: "/poblacion", label: "Población", icono: "poblacion", seccion: "poblacion", grupo: "Comunidad" },
  { href: "/novedades", label: "Novedades y obras", icono: "novedades", seccion: "novedades", grupo: "Comunidad" },
  { href: "/ayudas", label: "Ayudas y proyectos", icono: "ayudas", seccion: "ayudas", grupo: "Comunidad" },
  {
    href: "/libros",
    label: "Libros de la Junta",
    icono: "libros",
    secciones: ["libro_contable", "libro_actas", "libro_inventario"],
    grupo: "Junta",
  },
  { href: "/documentos", label: "Documentos", icono: "documentos", seccion: "documentos", grupo: "Junta" },
  { href: "/acueducto", label: "Red del acueducto", icono: "acueducto", seccion: "acueducto_red", modulo: "acueducto", grupo: "Acueducto" },
  { href: "/mantenimientos", label: "Mantenimientos", icono: "mantenimientos", seccion: "mantenimientos", modulo: "acueducto", grupo: "Acueducto" },
  { href: "/suscriptores", label: "Suscriptores", icono: "suscriptores", seccion: "suscriptores", modulo: "acueducto", grupo: "Acueducto" },
  { href: "/facturacion", label: "Cobros del mes", icono: "facturacion", seccion: "facturacion", modulo: "acueducto", grupo: "Acueducto" },
  { href: "/tesoreria", label: "Tesorería del acueducto", icono: "tesoreria", seccion: "tesoreria", modulo: "acueducto", grupo: "Acueducto" },
  { href: "/transparencia", label: "Página pública", icono: "transparencia", grupo: "General" },
  { href: "/reportes", label: "Reportes", icono: "reportes", seccion: "reportes", grupo: "General" },
  { href: "/usuarios", label: "Usuarios", icono: "usuarios", seccion: "usuarios", grupo: "General" },
  { href: "/bitacora", label: "Bitácora", icono: "bitacora", seccion: "usuarios", grupo: "General" },
  { href: "/configuracion", label: "Configuración", icono: "configuracion", soloSuperadmin: true, grupo: "General" },
];

/** Fase hasta la que ya hay pantallas construidas. */
export const FASE_ACTUAL = 4;
