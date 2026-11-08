import { and, eq, isNull, notInArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { usuarioApi } from "@/lib/api";
import { auditar } from "@/lib/auditoria";
import { puede } from "@/lib/permisos";
import { VERSION_POLITICA } from "@/lib/legal";
import { syncViviendaSchema } from "@/lib/validacion";

/**
 * Crea o actualiza (upsert por UUID generado en el celular) una vivienda con su familia.
 * Es idempotente: reenviar el mismo paquete no duplica nada.
 */
export async function POST(req: Request) {
  const usuario = await usuarioApi();
  if (usuario instanceof Response) return usuario;

  const p = syncViviendaSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) return Response.json({ error: p.error.issues[0].message }, { status: 400 });
  const { vivienda: v, personas } = p.data;

  const existente = await db.query.viviendas.findFirst({ where: eq(schema.viviendas.id, v.id) });
  if (existente?.deletedAt) return Response.json({ error: "Esta vivienda fue eliminada" }, { status: 409 });
  if (existente && !puede(usuario, "censo", "editar"))
    return Response.json({ error: "No tiene permiso para editar viviendas" }, { status: 403 });
  if (!existente && !puede(usuario, "censo", "crear"))
    return Response.json({ error: "No tiene permiso para crear viviendas" }, { status: 403 });

  // Personas: no permitir "robar" un id que pertenezca a otra vivienda
  if (personas.length) {
    const ajenas = await db
      .select({ id: schema.personas.id })
      .from(schema.personas)
      .where(
        and(
          sql`${schema.personas.id} in ${personas.map((x) => x.id)}`,
          sql`${schema.personas.viviendaId} <> ${v.id}`,
        ),
      );
    if (ajenas.length) return Response.json({ error: "Datos de personas inconsistentes" }, { status: 400 });
  }

  const ahora = new Date();
  const datos = {
    ...v,
    autorizacionFecha: v.autorizacionDatos ? (existente?.autorizacionDatos ? existente.autorizacionFecha : ahora) : null,
    // La versión de la política queda fijada al momento de autorizar
    autorizacionVersion: v.autorizacionDatos ? (existente?.autorizacionDatos ? (existente.autorizacionVersion ?? VERSION_POLITICA) : VERSION_POLITICA) : null,
    updatedBy: usuario.id,
    updatedAt: ahora,
  };

  const resultado = await db.transaction(async (tx) => {
    const [viv] = await tx
      .insert(schema.viviendas)
      .values({ ...datos, createdBy: usuario.id })
      .onConflictDoUpdate({ target: schema.viviendas.id, set: datos })
      .returning({ id: schema.viviendas.id, codigo: schema.viviendas.codigo });

    for (const per of personas) {
      const fila = { ...per, viviendaId: v.id, updatedAt: ahora, deletedAt: null };
      await tx.insert(schema.personas).values(fila).onConflictDoUpdate({ target: schema.personas.id, set: fila });
    }
    // Las personas que ya no vienen en el formulario se eliminan (borrado lógico)
    const ids = personas.map((x) => x.id);
    await tx
      .update(schema.personas)
      .set({ deletedAt: ahora })
      .where(
        and(
          eq(schema.personas.viviendaId, v.id),
          isNull(schema.personas.deletedAt),
          ids.length ? notInArray(schema.personas.id, ids) : undefined,
        ),
      );
    return viv;
  });

  await auditar(usuario.id, existente ? "editar" : "crear", "vivienda", v.id, {
    codigo: resultado.codigo,
    personas: personas.length,
  });
  return Response.json({ ok: true, id: resultado.id, codigo: resultado.codigo });
}
