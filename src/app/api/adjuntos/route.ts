import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { usuarioApi } from "@/lib/api";
import { auditar } from "@/lib/auditoria";
import { cloudinaryConfigurado, subirArchivo } from "@/lib/cloudinary";
import type { Seccion } from "@/lib/permisos";

/** Qué permiso se necesita para adjuntar archivos a cada tipo de entidad. */
const SECCION_POR_ENTIDAD: Record<string, Seccion> = {
  vivienda: "censo",
  persona: "censo",
  elemento: "acueducto_red",
  tramo: "acueducto_red",
  mantenimiento: "mantenimientos",
  compra: "mantenimientos",
  pago: "facturacion",
  movimiento: "tesoreria",
  proyecto: "ayudas",
  participacion: "ayudas",
};

const MAX_BYTES = 10 * 1024 * 1024;
const UUID = /^[0-9a-f-]{36}$/i;

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) return Response.json({ error: "Formulario inválido" }, { status: 400 });

  const id = String(form.get("id") ?? "");
  const entidad = String(form.get("entidad") ?? "");
  const entidadId = String(form.get("entidadId") ?? "");
  const tipo = String(form.get("tipo") ?? "foto").slice(0, 20);
  const descripcion = String(form.get("descripcion") ?? "").slice(0, 500) || null;
  const archivo = form.get("archivo");

  const seccion = SECCION_POR_ENTIDAD[entidad];
  if (!seccion || !UUID.test(id) || !UUID.test(entidadId))
    return Response.json({ error: "Datos inválidos" }, { status: 400 });

  const u = await usuarioApi(seccion, "crear");
  if (u instanceof Response) return u;

  // Idempotencia: si ya se subió (reintento), responder ok
  const previo = await db.query.adjuntos.findFirst({ where: eq(schema.adjuntos.id, id) });
  if (previo) return Response.json({ ok: true, url: previo.url });

  if (!(archivo instanceof File)) return Response.json({ error: "Falta el archivo" }, { status: 400 });
  if (archivo.size > MAX_BYTES) return Response.json({ error: "Archivo muy grande (máx. 10 MB)" }, { status: 413 });
  if (!cloudinaryConfigurado())
    return Response.json({ error: "Cloudinary no está configurado en el servidor" }, { status: 503 });

  const privado = tipo === "firma";
  const subida = await subirArchivo(Buffer.from(await archivo.arrayBuffer()), `vereda/${entidad}/${entidadId}`, id, privado);

  await db.insert(schema.adjuntos).values({
    id,
    entidad,
    entidadId,
    tipo,
    url: subida.secure_url,
    publicId: subida.public_id,
    descripcion,
    privado,
    createdBy: u.id,
  });

  if (entidad === "vivienda" && tipo === "foto") {
    await db
      .update(schema.viviendas)
      .set({ fotoPrincipalUrl: subida.secure_url })
      .where(and(eq(schema.viviendas.id, entidadId), isNull(schema.viviendas.fotoPrincipalUrl)));
  }
  await auditar(u.id, "adjuntar", entidad, entidadId, { adjunto: id, tipo });
  return Response.json({ ok: true, url: privado ? null : subida.secure_url });
}
