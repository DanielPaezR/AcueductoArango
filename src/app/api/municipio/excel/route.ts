import ExcelJS from "exceljs";
import { usuarioApi } from "@/lib/api";
import { auditar } from "@/lib/auditoria";
import { gruposPorVereda, indicadoresPorVereda, personasMunicipio } from "@/lib/municipio";
import { GRUPOS_EDAD, type GrupoEdad } from "@/lib/opciones";
import { esRolMunicipal } from "@/lib/permisos";

/** Excel de la alcaldía: indicadores por vereda, edades por vereda y personas (solo familias que autorizan a la alcaldía). */
export async function GET(req: Request) {
  const u = await usuarioApi("municipio", "ver");
  if (u instanceof Response) return u;
  if (!esRolMunicipal(u.rol) || u.vereda) return Response.json({ error: "Solo para la alcaldía" }, { status: 403 });
  const sp = new URL(req.url).searchParams;
  const grupo = GRUPOS_EDAD.some((g) => g.id === sp.get("grupo")) ? (sp.get("grupo") as GrupoEdad) : undefined;
  const filtro = { vereda: Number(sp.get("vereda")) || undefined, grupo, discapacidad: sp.get("disc") === "si" || undefined, q: sp.get("q")?.slice(0, 60) };

  const [ind, grupos, personas] = await Promise.all([indicadoresPorVereda(), gruposPorVereda(), personasMunicipio(filtro, 20000)]);
  const libro = new ExcelJS.Workbook();
  libro.creator = "Plataforma de veredas";

  const h1 = libro.addWorksheet("Veredas");
  h1.columns = [
    ["Vereda", "nombre", 22], ["Activa", "activa", 8], ["Meta viviendas", "meta", 10], ["Viviendas", "viviendas", 10], ["Hogares", "hogares", 10],
    ["Habitantes", "habitantes", 10], ["Menores de 18", "menores", 10], ["Mayores de 60", "mayores", 10], ["Con discapacidad", "con_discapacidad", 12],
    ["Encuestas pendientes", "pendientes", 12], ["Autorizan a la alcaldía", "autorizadas_alcaldia", 12], ["Con acueducto", "con_acueducto", 10],
    ["Novedades activas", "novedades_activas", 10], ["Obras realizadas (año)", "obras_realizadas_anio", 12], ["Saldo Junta", "saldo_junta", 14],
    ["Ingresos año", "ingresos_anio", 14], ["Egresos año", "egresos_anio", 14], ["Actas año", "actas_anio", 8], ["Última asamblea", "ultima_asamblea", 12],
    ["Familias con ayudas (año)", "ayudas_anio", 12], ["Presidencia", "presidencia", 24], ["Última visita", "ultima_visita", 12],
  ].map(([header, key, width]) => ({ header: header as string, key: key as string, width: width as number }));
  for (const r of ind) h1.addRow({ ...r, activa: r.activa ? "Sí" : "No" });

  const h2 = libro.addWorksheet("Edades por vereda");
  h2.addRow(["Vereda", ...GRUPOS_EDAD.map((g) => `${g.label} (${g.rango})`), "Sin edad", "Con discapacidad"]);
  for (const v of ind)
    h2.addRow([
      v.nombre,
      ...GRUPOS_EDAD.map((g) => grupos.filter((x) => x.vereda_id === v.id && x.grupo === g.id).reduce((a, x) => a + x.n, 0)),
      grupos.filter((x) => x.vereda_id === v.id && !x.grupo).reduce((a, x) => a + x.n, 0),
      grupos.filter((x) => x.vereda_id === v.id).reduce((a, x) => a + x.disc, 0),
    ]);

  const h3 = libro.addWorksheet("Personas (autorizadas)");
  h3.columns = [
    ["Vereda", "vereda", 18], ["Código vivienda", "codigo", 10], ["Nombre", "nombre", 30], ["Documento", "documento", 14], ["Edad", "edad", 6],
    ["Cabeza de familia", "jefe", 10], ["Discapacidad", "disc", 10], ["Tipo de discapacidad", "tipo_discapacidad", 20], ["Teléfono", "telefono", 14],
  ].map(([header, key, width]) => ({ header: header as string, key: key as string, width: width as number }));
  for (const p of personas) h3.addRow({ ...p, jefe: p.es_jefe ? "Sí" : "", disc: p.discapacidad ? "Sí" : "" });
  for (const h of [h1, h2, h3]) h.getRow(1).font = { bold: true };

  await auditar(u.id, "exportar", "municipio", null, { filtro, personas: personas.length });
  const fecha = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
  return new Response(await libro.xlsx.writeBuffer(), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="alcaldia-veredas-${fecha}.xlsx"`,
    },
  });
}
