import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { usuarioApi } from "@/lib/api";
import { auditar } from "@/lib/auditoria";
import { puede } from "@/lib/permisos";
import { longitudMetros } from "@/lib/red";
import { tramoSchema } from "@/lib/validacion";

/** Crea o actualiza un tramo de tubería. Idempotente por UUID. */
export async function POST(req: Request) {
  const u = await usuarioApi();
  if (u instanceof Response) return u;
  const p = tramoSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) return Response.json({ error: p.error.issues[0].message }, { status: 400 });

  const existente = await db.query.tramosAcueducto.findFirst({ where: eq(schema.tramosAcueducto.id, p.data.id) });
  if (existente?.deletedAt) return Response.json({ error: "Esta tubería fue eliminada" }, { status: 409 });
  if (!puede(u, "acueducto_red", existente ? "editar" : "crear"))
    return Response.json({ error: "No tiene permiso para registrar tuberías" }, { status: 403 });

  const datos = {
    ...p.data,
    diametroPulg: p.data.diametroPulg === null ? null : String(p.data.diametroPulg),
    longitudM: longitudMetros(p.data.coordenadas),
    updatedAt: new Date(),
  };
  await db
    .insert(schema.tramosAcueducto)
    .values({ ...datos, createdBy: u.id })
    .onConflictDoUpdate({ target: schema.tramosAcueducto.id, set: datos });
  await auditar(u.id, existente ? "editar" : "crear", "tramo", p.data.id, { tipo: p.data.tipo, puntos: p.data.coordenadas.length });
  return Response.json({ ok: true, id: p.data.id });
}
