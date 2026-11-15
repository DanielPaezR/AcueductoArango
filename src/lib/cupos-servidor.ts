import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Cupo de una vereda en un proyecto y cuántas familias distintas ya registró. `cupo` null = sin límite. */
export async function estadoCupo(proyectoId: string, veredaId: number, tx: Tx | typeof db = db) {
  const pr = await tx.query.proyectos.findFirst({ where: eq(schema.proyectos.id, proyectoId), columns: { cupoFamilias: true, veredaId: true } });
  if (!pr || pr.veredaId !== null || pr.cupoFamilias === null) return { cupo: null, usadas: 0 };
  const c = await tx.query.proyectoCupos.findFirst({
    where: and(eq(schema.proyectoCupos.proyectoId, proyectoId), eq(schema.proyectoCupos.veredaId, veredaId)),
  });
  const [{ n }] = await tx
    .select({ n: sql<number>`count(distinct ${schema.participaciones.viviendaId})::int` })
    .from(schema.participaciones)
    .where(and(eq(schema.participaciones.proyectoId, proyectoId), eq(schema.participaciones.veredaId, veredaId), isNull(schema.participaciones.deletedAt)));
  return { cupo: c?.cupo ?? 0, usadas: n };
}

/**
 * Registra una entrega respetando el cupo de la vereda de la familia (solo proyectos de la alcaldía con cupo).
 * Una familia que ya está en el proyecto puede recibir más entregas sin gastar cupo.
 * El candado evita que dos personas registren a la vez la última familia del cupo.
 */
export async function insertarConCupo(valores: typeof schema.participaciones.$inferInsert & { viviendaId: string }, veredaId: number) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${valores.proyectoId}:${veredaId}`}))`);
    const { cupo, usadas } = await estadoCupo(valores.proyectoId, veredaId, tx);
    if (cupo !== null) {
      const ya = await tx.query.participaciones.findFirst({
        where: and(eq(schema.participaciones.proyectoId, valores.proyectoId), eq(schema.participaciones.viviendaId, valores.viviendaId), isNull(schema.participaciones.deletedAt)),
        columns: { id: true },
      });
      if (!ya && usadas >= cupo)
        return { error: cupo === 0 ? "Esta vereda no tiene cupos asignados en este proyecto." : `La vereda ya registró sus ${cupo} familias autorizadas en este proyecto.` };
    }
    await tx.insert(schema.participaciones).values(valores);
    return { ok: true as const };
  });
}
