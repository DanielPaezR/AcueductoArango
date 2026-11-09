import ExcelJS from "exceljs";
import { usuarioApi } from "@/lib/api";
import { auditar } from "@/lib/auditoria";
import { GRUPOS_EDAD, type GrupoEdad } from "@/lib/opciones";
import { filtrar, habitantes, jefesAlfabetico, nucleos } from "@/lib/poblacion";

/** Listados de población en Excel: cabezas de familia, núcleos familiares o personas filtradas. */
export async function GET(req: Request) {
  const u = await usuarioApi("poblacion", "ver");
  if (u instanceof Response) return u;
  const q = new URL(req.url).searchParams;
  const vista = q.get("vista") === "nucleos" || q.get("vista") === "filtro" ? q.get("vista")! : "jefes";
  const todos = await habitantes();
  const grupoTxt = (g: string | null) => GRUPOS_EDAD.find((x) => x.id === g)?.label ?? "";

  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet(vista === "jefes" ? "Cabezas de familia" : vista === "nucleos" ? "Núcleos familiares" : "Personas", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  const cols: [string, string, number][] = [
    ["N.º", "n", 6],
    ["Núcleo (cabeza de familia)", "nucleo", 30],
    ["Nombre", "nombre", 30],
    ["Documento", "documento", 14],
    ["Edad", "edad", 7],
    ["Grupo de edad", "grupo", 16],
    ["Cabeza de familia", "jefe", 10],
    ["Discapacidad", "disc", 18],
    ["Teléfono", "telefono", 14],
    ["Sector", "sector", 16],
    ["Vivienda", "codigo", 10],
  ];
  hoja.columns = cols.map(([header, key, width]) => ({ header, key, width }));
  hoja.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  hoja.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF184A30" } };
  const fila = (h: ReturnType<typeof jefesAlfabetico>[number], n: number | string, nucleo = "") => ({
    n,
    nucleo,
    nombre: h.nombre,
    documento: h.documento,
    edad: h.edad,
    grupo: grupoTxt(h.grupo),
    jefe: h.esJefe ? "Sí" : "",
    disc: h.discapacidad ? h.tipoDiscapacidad || "Sí" : "",
    telefono: h.telefono,
    sector: h.sector,
    codigo: h.codigo,
  });

  if (vista === "jefes") jefesAlfabetico(todos).forEach((h, i) => hoja.addRow(fila(h, i + 1)));
  else if (vista === "nucleos")
    nucleos(todos).forEach((f, i) => f.miembros.forEach((m, j) => hoja.addRow(fila(m, j === 0 ? i + 1 : "", f.jefe?.nombre ?? ""))));
  else
    filtrar(todos, {
      sector: Number(q.get("sector")) || undefined,
      grupo: (GRUPOS_EDAD.find((g) => g.id === q.get("grupo"))?.id as GrupoEdad) || undefined,
      discapacidad: q.get("disc") === "si" ? true : undefined,
    }).forEach((h, i) => hoja.addRow(fila(h, i + 1)));

  await auditar(u.id, "exportar", "reporte", `poblacion-${vista}`, { filas: hoja.rowCount - 1 });
  const fecha = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
  return new Response(await libro.xlsx.writeBuffer(), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Poblacion-${vista}-${fecha}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
