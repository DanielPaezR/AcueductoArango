import type { Seccion } from "@/lib/permisos";

export type ItemNav = { href: string; label: string; icono: string; seccion?: Seccion; fase?: number };

/** `fase` marca módulos aún no construidos (se muestran deshabilitados). */
export const NAV: ItemNav[] = [
  { href: "/", label: "Inicio", icono: "🏠" },
  { href: "/mapa", label: "Mapa de usuarios", icono: "🗺️", seccion: "mapa_usuarios", fase: 1 },
  { href: "/viviendas", label: "Viviendas y personas", icono: "👨‍👩‍👧", seccion: "censo", fase: 1 },
  { href: "/ayudas", label: "Ayudas y proyectos", icono: "🤝", seccion: "ayudas", fase: 4 },
  { href: "/acueducto", label: "Mapa del acueducto", icono: "💧", seccion: "acueducto_red", fase: 2 },
  { href: "/mantenimientos", label: "Mantenimientos", icono: "🔧", seccion: "mantenimientos", fase: 2 },
  { href: "/suscriptores", label: "Suscriptores", icono: "🧾", seccion: "suscriptores", fase: 3 },
  { href: "/facturacion", label: "Facturación y pagos", icono: "💵", seccion: "facturacion", fase: 3 },
  { href: "/reportes", label: "Reportes", icono: "📊", seccion: "reportes", fase: 4 },
  { href: "/usuarios", label: "Usuarios del sistema", icono: "🔐", seccion: "usuarios" },
];

/** Fase hasta la que ya hay pantallas construidas. */
export const FASE_ACTUAL = 0;
