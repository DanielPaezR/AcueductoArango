"use client";

import {
  ClipboardList,
  Droplets,
  HandHeart,
  House,
  Map,
  Receipt,
  ChartColumn,
  ShieldUser,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { NombreIcono } from "./nav";

export const ICONOS: Record<NombreIcono, LucideIcon> = {
  inicio: House,
  mapa: Map,
  viviendas: Users,
  ayudas: HandHeart,
  acueducto: Droplets,
  mantenimientos: Wrench,
  suscriptores: ClipboardList,
  facturacion: Receipt,
  reportes: ChartColumn,
  usuarios: ShieldUser,
};
