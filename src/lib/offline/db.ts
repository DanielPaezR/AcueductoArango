"use client";

import Dexie, { type Table } from "dexie";
import type { SyncViviendaInput } from "@/lib/validacion";

/** Vivienda guardada en el teléfono esperando subir al servidor. */
export type ViviendaPendiente = {
  id: string; // = vivienda.id
  payload: SyncViviendaInput;
  etiqueta: string; // texto corto para mostrar en la lista de pendientes
  guardadoEn: number;
  intentos: number;
  error?: string;
};

/** Otros registros de campo (red del acueducto y mantenimientos) esperando subir. */
export type TipoOperacion = "elemento" | "tramo" | "mantenimiento";
export type OperacionPendiente = {
  id: string; // = id del registro
  tipo: TipoOperacion;
  payload: unknown;
  etiqueta: string;
  guardadoEn: number;
  intentos: number;
  error?: string;
};

export type FotoPendiente = {
  id: string; // = id del adjunto
  entidad: string;
  entidadId: string;
  tipo: string;
  blob: Blob;
  guardadoEn: number;
  intentos: number;
  error?: string;
};

class VeredaDB extends Dexie {
  viviendas!: Table<ViviendaPendiente, string>;
  fotos!: Table<FotoPendiente, string>;
  operaciones!: Table<OperacionPendiente, string>;
  cache!: Table<{ clave: string; valor: unknown }, string>;
  constructor() {
    super("vereda");
    this.version(1).stores({
      viviendas: "id, guardadoEn",
      fotos: "id, entidadId, guardadoEn",
      cache: "clave",
    });
    this.version(2).stores({
      viviendas: "id, guardadoEn",
      fotos: "id, entidadId, guardadoEn",
      cache: "clave",
      operaciones: "id, tipo, guardadoEn",
    });
  }
}

export const dbLocal = new VeredaDB();
