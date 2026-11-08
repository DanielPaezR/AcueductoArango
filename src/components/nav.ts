import type { Seccion } from "@/lib/permisos";

export type NombreIcono =
  | "inicio"
  | "mapa"
  | "viviendas"
  | "ayudas"
  | "acueducto"
  | "mantenimientos"
  | "suscriptores"
  | "facturacion"
  | "tesoreria"
  | "transparencia"
  | "reportes"
  | "usuarios";

export type ItemNav = { href: string; label: string; icono: NombreIcono; seccion?: Seccion; fase?: number };

/** `fase` marca módulos aún no construidos (se muestran deshabilitados). */
export const NAV: ItemNav[] = [
  { href: "/", label: "Inicio", icono: "inicio" },
  { href: "/mapa", label: "Mapa de la vereda", icono: "mapa", seccion: "mapa_usuarios", fase: 1 },
  { href: "/viviendas", label: "Viviendas", icono: "viviendas", seccion: "censo", fase: 1 },
  { href: "/ayudas", label: "Ayudas y proyectos", icono: "ayudas", seccion: "ayudas", fase: 4 },
  { href: "/acueducto", label: "Red del acueducto", icono: "acueducto", seccion: "acueducto_red", fase: 2 },
  { href: "/mantenimientos", label: "Mantenimientos", icono: "mantenimientos", seccion: "mantenimientos", fase: 2 },
  { href: "/suscriptores", label: "Suscriptores", icono: "suscriptores", seccion: "suscriptores" },
  { href: "/facturacion", label: "Cobros del mes", icono: "facturacion", seccion: "facturacion" },
  { href: "/tesoreria", label: "Tesorería", icono: "tesoreria", seccion: "tesoreria" },
  { href: "/transparencia", label: "Página pública", icono: "transparencia" },
  { href: "/reportes", label: "Reportes", icono: "reportes", seccion: "reportes", fase: 4 },
  { href: "/usuarios", label: "Usuarios", icono: "usuarios", seccion: "usuarios" },
];

/** Fase hasta la que ya hay pantallas construidas. */
export const FASE_ACTUAL = 1;
