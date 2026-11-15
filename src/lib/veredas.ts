import "server-only";
import { asc, eq } from "drizzle-orm";
import { cache } from "react";
import { db, schema } from "@/db";
import { responsableDe } from "./legal";
import { usuarioActual } from "./session";

export type Vereda = typeof schema.veredas.$inferSelect;

export const veredaPorId = cache(async (id: number | null | undefined) =>
  id ? ((await db.query.veredas.findFirst({ where: eq(schema.veredas.id, id) })) ?? null) : null,
);

export const veredaPorSlug = cache(async (slug: string | null | undefined) =>
  slug ? ((await db.query.veredas.findFirst({ where: eq(schema.veredas.slug, slug) })) ?? null) : null,
);

export const listarVeredas = cache(async (soloActivas = true) => {
  const xs = await db.select().from(schema.veredas).orderBy(asc(schema.veredas.nombre));
  return soloActivas ? xs.filter((v) => v.activa) : xs;
});

/** Vereda en la que trabaja el usuario de esta petición (o null si está en la vista municipal). */
export async function veredaActual() {
  const u = await usuarioActual();
  return veredaPorId(u?.vereda?.id);
}

/** Datos de la Junta responsable para la vereda del usuario (o de la indicada por su slug, en páginas públicas). */
export async function responsableActual(slug?: string | null) {
  return responsableDe(slug ? await veredaPorSlug(slug) : await veredaActual());
}

/** Nombre de la vereda en la que trabaja el usuario (para encabezados impresos). */
export async function nombreVereda() {
  return (await usuarioActual())?.vereda?.nombre ?? "";
}
