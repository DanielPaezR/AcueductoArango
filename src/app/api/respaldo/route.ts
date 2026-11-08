import ExcelJS from "exceljs";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { auditar } from "@/lib/auditoria";
import { usuarioActual } from "@/lib/session";

/** Tablas incluidas en el respaldo (nunca las contraseñas). */
const TABLAS: [string, string][] = [
  ["usuarios", "select id, nombre, username, email, telefono, rol, cargo, permisos::text, activo, ultimo_acceso, created_at from usuarios"],
  ["sectores", "select * from sectores"],
  ["viviendas", "select * from viviendas"],
  ["personas", "select * from personas"],
  ["proyectos", "select * from proyectos"],
  ["participaciones", "select * from participaciones"],
  ["elementos_acueducto", "select id, tipo, nombre, lat, lng, precision_m, altitud_m, estado, datos::text, foto_principal_url, observaciones, created_by, created_at, updated_at, deleted_at from elementos_acueducto"],
  ["tramos_acueducto", "select id, nombre, tipo, coordenadas::text, diametro_pulg, material, longitud_m, anio_instalacion, estado, observaciones, created_by, created_at, updated_at, deleted_at from tramos_acueducto"],
  ["mantenimientos", "select * from mantenimientos"],
  ["compras", "select * from compras"],
  ["materiales_usados", "select * from materiales_usados"],
  ["suscriptores", "select * from suscriptores"],
  ["tarifas", "select * from tarifas"],
  ["periodos", "select * from periodos"],
  ["cargos", "select * from cargos"],
  ["pagos", "select * from pagos"],
  ["cuentas", "select * from cuentas"],
  ["movimientos", "select * from movimientos"],
  ["adjuntos", "select * from adjuntos"],
  ["auditoria", "select id, usuario_id, accion, entidad, entidad_id, datos::text, fecha from auditoria"],
];

/** Respaldo completo en Excel (una hoja por tabla). Solo superadministrador. */
export async function GET() {
  const u = await usuarioActual();
  if (!u) return Response.json({ error: "Sesión vencida. Ingrese de nuevo." }, { status: 401 });
  if (u.rol !== "superadmin") return Response.json({ error: "Solo el superadministrador puede descargar el respaldo" }, { status: 403 });

  const libro = new ExcelJS.Workbook();
  libro.creator = "JAC Arango";
  const resumen = libro.addWorksheet("LEAME");
  resumen.addRow(["Respaldo completo de JAC Arango"]);
  resumen.addRow(["Generado", new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" })]);
  resumen.addRow(["Contiene datos personales protegidos por la Ley 1581 de 2012. Guárdelo en un lugar seguro y no lo comparta."]);
  resumen.addRow([]);
  resumen.addRow(["Tabla", "Filas"]);

  for (const [nombre, consulta] of TABLAS) {
    const { rows, fields } = await db.execute(sql.raw(consulta));
    const hoja = libro.addWorksheet(nombre.slice(0, 31));
    hoja.addRow(fields.map((f) => f.name)).font = { bold: true };
    for (const r of rows as Record<string, unknown>[])
      hoja.addRow(fields.map((f) => (r[f.name] instanceof Date ? (r[f.name] as Date).toISOString() : r[f.name])));
    resumen.addRow([nombre, rows.length]);
  }

  await auditar(u.id, "respaldo", "sistema", null);
  const fecha = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
  return new Response(await libro.xlsx.writeBuffer(), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="JAC-Arango-respaldo-${fecha}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
