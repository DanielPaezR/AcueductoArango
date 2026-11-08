import ExcelJS from "exceljs";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { usuarioApi } from "@/lib/api";
import { auditar } from "@/lib/auditoria";
import { estadoSuscriptores } from "@/lib/finanzas";
import { TIPOS_PROYECTO } from "@/lib/ayudas";
import { ESTADO_MOVIMIENTO } from "@/lib/dinero";
import { edadPersona } from "@/lib/opciones";
import { ESTADOS_MANTENIMIENTO, PRIORIDADES, TIPOS_ELEMENTO, TIPOS_MANTENIMIENTO, TIPOS_TRAMO } from "@/lib/red";

/** Traduce códigos internos a texto legible en el Excel. */
const ETIQUETAS: Record<string, Record<string, string>> = {
  tipoMov: { ingreso: "Ingreso", egreso: "Gasto" },
  estadoMov: ESTADO_MOVIMIENTO,
  tipoMant: TIPOS_MANTENIMIENTO,
  estadoMant: ESTADOS_MANTENIMIENTO,
  prioridad: PRIORIDADES,
  tipoProyecto: TIPOS_PROYECTO,
  red: { ...Object.fromEntries(Object.entries(TIPOS_ELEMENTO).map(([k, v]) => [k, v.label])), ...Object.fromEntries(Object.entries(TIPOS_TRAMO).map(([k, v]) => [k, v.corto])) },
  servicio: { activo: "Activo", suspendido: "Suspendido", retirado: "Retirado" },
};
const traducir = (rows: Record<string, unknown>[], mapa: Record<string, keyof typeof ETIQUETAS>) =>
  rows.map((r) => {
    const x = { ...r };
    for (const [campo, cat] of Object.entries(mapa)) if (typeof x[campo] === "string") x[campo] = ETIQUETAS[cat][x[campo] as string] ?? x[campo];
    return x;
  });

type Columna = { titulo: string; clave: string; ancho?: number; formato?: "pesos" | "numero" | "fecha" };
type Reporte = { nombre: string; columnas: Columna[]; filas: () => Promise<Record<string, unknown>[]> };

const filas = async (q: ReturnType<typeof sql>) => (await db.execute(q)).rows as Record<string, unknown>[];

const REPORTES: Record<string, Reporte> = {
  viviendas: {
    nombre: "Censo de viviendas",
    columnas: [
      { titulo: "Código", clave: "codigo", ancho: 10 },
      { titulo: "Sector", clave: "sector", ancho: 16 },
      { titulo: "Cabeza de familia", clave: "jefe", ancho: 28 },
      { titulo: "Cédula", clave: "cedula", ancho: 14 },
      { titulo: "Teléfono", clave: "telefono", ancho: 14 },
      { titulo: "Predio", clave: "nombre_predio", ancho: 20 },
      { titulo: "Referencia", clave: "referencia", ancho: 30 },
      { titulo: "Alquilada o propia", clave: "tenencia", ancho: 12 },
      { titulo: "Principal sustento", clave: "actividad_economica", ancho: 24 },
      { titulo: "Personas", clave: "personas", formato: "numero" },
      { titulo: "Usa acueducto", clave: "acueducto" },
      { titulo: "Tiene matrícula", clave: "matricula" },
      { titulo: "N.º matrícula", clave: "numero_matricula", ancho: 12 },
      { titulo: "Titular matrícula", clave: "titular_matricula_nombre", ancho: 24 },
      { titulo: "Cédula titular", clave: "titular_matricula_documento", ancho: 14 },
      { titulo: "Teléfono titular", clave: "titular_matricula_telefono", ancho: 14 },
      { titulo: "Autorizó datos", clave: "autorizacion" },
      { titulo: "Latitud", clave: "lat", ancho: 12 },
      { titulo: "Longitud", clave: "lng", ancho: 12 },
    ],
    filas: () =>
      filas(sql`
        select v.codigo, s.nombre as sector, v.nombre_predio, v.referencia, v.tenencia, v.actividad_economica,
          case when v.usa_acueducto then 'Sí' else 'No' end as acueducto,
          case when v.tiene_matricula then 'Sí' when v.tiene_matricula = false then 'No' end as matricula,
          v.numero_matricula, v.titular_matricula_nombre, v.titular_matricula_documento, v.titular_matricula_telefono,
          case when v.autorizacion_datos then 'Sí' else 'No' end as autorizacion, v.lat, v.lng,
          j.nombre as jefe, j.numero_documento as cedula, j.telefono,
          (select count(*)::int from personas p where p.vivienda_id = v.id and p.deleted_at is null) as personas
        from viviendas v
        left join sectores s on s.id = v.sector_id
        left join lateral (select trim(p.nombres || ' ' || coalesce(p.apellidos,'')) as nombre, p.numero_documento, p.telefono
          from personas p where p.vivienda_id = v.id and p.deleted_at is null order by p.es_jefe_hogar desc, p.created_at limit 1) j on true
        where v.deleted_at is null order by v.codigo`),
  },
  personas: {
    nombre: "Personas censadas",
    columnas: [
      { titulo: "Vivienda", clave: "codigo", ancho: 10 },
      { titulo: "Sector", clave: "sector", ancho: 16 },
      { titulo: "Nombre", clave: "nombre", ancho: 30 },
      { titulo: "Documento", clave: "numero_documento", ancho: 14 },
      { titulo: "Edad", clave: "edad", formato: "numero" },
      { titulo: "Cabeza de familia", clave: "jefe" },
      { titulo: "Teléfono", clave: "telefono", ancho: 14 },
    ],
    filas: async () =>
      (
        await filas(sql`
          select v.codigo, s.nombre as sector, trim(p.nombres || ' ' || coalesce(p.apellidos,'')) as nombre, p.numero_documento,
            p.fecha_nacimiento::text as fecha_nacimiento, p.edad_reportada, p.edad_reportada_en::text as edad_reportada_en,
            case when p.es_jefe_hogar then 'Sí' else '' end as jefe, p.telefono
          from personas p join viviendas v on v.id = p.vivienda_id and v.deleted_at is null
          left join sectores s on s.id = v.sector_id
          where p.deleted_at is null order by v.codigo, p.es_jefe_hogar desc`)
      ).map((f) => ({
        ...f,
        edad: edadPersona({
          fechaNacimiento: f.fecha_nacimiento as string | null,
          edadReportada: f.edad_reportada as number | null,
          edadReportadaEn: f.edad_reportada_en as string | null,
        }),
      })),
  },
  suscriptores: {
    nombre: "Suscriptores y cartera",
    columnas: [
      { titulo: "Matrícula", clave: "codigo", ancho: 12 },
      { titulo: "Titular", clave: "titularNombre", ancho: 28 },
      { titulo: "Estado del servicio", clave: "estado", ancho: 14 },
      { titulo: "Al día", clave: "alDiaTexto" },
      { titulo: "Meses de atraso", clave: "mesesAtraso", formato: "numero" },
      { titulo: "Deuda vencida", clave: "deudaVencida", formato: "pesos", ancho: 14 },
      { titulo: "Saldo total", clave: "deuda", formato: "pesos", ancho: 14 },
      { titulo: "Último pago", clave: "ultimoPago", ancho: 12 },
    ],
    filas: async () =>
      traducir(
        (await estadoSuscriptores()).map((e) => ({ ...e, alDiaTexto: e.alDia ? "Sí" : "No" })),
        { estado: "servicio" },
      ),
  },
  movimientos: {
    nombre: "Movimientos de tesorería",
    columnas: [
      { titulo: "Fecha", clave: "fecha", ancho: 12 },
      { titulo: "Cuenta", clave: "cuenta", ancho: 22 },
      { titulo: "Tipo", clave: "tipo" },
      { titulo: "Categoría", clave: "categoria", ancho: 20 },
      { titulo: "Concepto", clave: "concepto", ancho: 40 },
      { titulo: "Valor", clave: "valor", formato: "pesos", ancho: 14 },
      { titulo: "Estado", clave: "estado" },
      { titulo: "Registró", clave: "cargo_registro", ancho: 18 },
      { titulo: "Aprobó", clave: "cargo_aprobacion", ancho: 18 },
      { titulo: "Motivo (rechazo/anulación)", clave: "motivo", ancho: 28 },
    ],
    filas: async () =>
      traducir(await filas(sql`select m.fecha::text, c.nombre as cuenta, m.tipo, m.categoria, m.concepto, m.valor::float as valor, m.estado,
        m.cargo_registro, m.cargo_aprobacion, m.motivo
        from movimientos m join cuentas c on c.id = m.cuenta_id order by m.fecha desc, m.created_at desc`), { tipo: "tipoMov", estado: "estadoMov" }),
  },
  mantenimientos: {
    nombre: "Mantenimientos y arreglos",
    columnas: [
      { titulo: "Reportado", clave: "fecha_reporte", ancho: 12 },
      { titulo: "Arreglado", clave: "fecha_ejecucion", ancho: 12 },
      { titulo: "Tipo", clave: "tipo", ancho: 14 },
      { titulo: "Resumen", clave: "titulo", ancho: 36 },
      { titulo: "Estado", clave: "estado" },
      { titulo: "Prioridad", clave: "prioridad" },
      { titulo: "Punto de la red", clave: "punto", ancho: 22 },
      { titulo: "Tubería", clave: "tramo", ancho: 22 },
      { titulo: "Materiales", clave: "materiales", formato: "pesos", ancho: 14 },
      { titulo: "Mano de obra", clave: "mano_obra", formato: "pesos", ancho: 14 },
      { titulo: "Total", clave: "total", formato: "pesos", ancho: 14 },
    ],
    filas: async () =>
      traducir(await filas(sql`select m.fecha_reporte::text, m.fecha_ejecucion::text, m.tipo, m.titulo, m.estado, m.prioridad,
          coalesce(e.nombre, e.tipo) as punto, coalesce(t.nombre, t.tipo) as tramo,
          coalesce(mu.total, 0)::float as materiales, m.costo_mano_obra::float as mano_obra,
          (coalesce(mu.total, 0) + m.costo_mano_obra)::float as total
        from mantenimientos m
        left join elementos_acueducto e on e.id = m.elemento_id
        left join tramos_acueducto t on t.id = m.tramo_id
        left join lateral (select sum(cantidad * coalesce(valor_unitario, 0)) as total from materiales_usados where mantenimiento_id = m.id) mu on true
        where m.deleted_at is null order by m.created_at desc`), { tipo: "tipoMant", estado: "estadoMant", prioridad: "prioridad", punto: "red", tramo: "red" }),
  },
  ayudas: {
    nombre: "Ayudas y proyectos",
    columnas: [
      { titulo: "Ayuda o proyecto", clave: "proyecto", ancho: 30 },
      { titulo: "Tipo", clave: "tipo" },
      { titulo: "Entidad", clave: "entidad", ancho: 18 },
      { titulo: "Vivienda", clave: "codigo", ancho: 10 },
      { titulo: "Cabeza de familia", clave: "jefe", ancho: 28 },
      { titulo: "Fecha", clave: "fecha", ancho: 12 },
      { titulo: "Detalle", clave: "detalle", ancho: 28 },
      { titulo: "Cantidad", clave: "cantidad", formato: "numero" },
      { titulo: "Valor estimado", clave: "valor", formato: "pesos", ancho: 14 },
    ],
    filas: async () =>
      traducir(await filas(sql`select pr.nombre as proyecto, pr.tipo, pr.entidad, v.codigo, pa.fecha::text, pa.detalle,
          pa.cantidad::float as cantidad, pa.valor_estimado::float as valor,
          (select trim(p.nombres || ' ' || coalesce(p.apellidos,'')) from personas p where p.vivienda_id = v.id and p.deleted_at is null
            order by p.es_jefe_hogar desc, p.created_at limit 1) as jefe
        from participaciones pa join proyectos pr on pr.id = pa.proyecto_id and pr.deleted_at is null
        join viviendas v on v.id = pa.vivienda_id
        where pa.deleted_at is null order by pr.nombre, v.codigo`), { tipo: "tipoProyecto" }),
  },
};

export async function GET(_req: Request, ctx: { params: Promise<{ tipo: string }> }) {
  const { tipo } = await ctx.params;
  const r = REPORTES[tipo];
  if (!r) return Response.json({ error: "Reporte desconocido" }, { status: 404 });
  const u = await usuarioApi("reportes", "ver");
  if (u instanceof Response) return u;

  const libro = new ExcelJS.Workbook();
  libro.creator = "JAC Arango";
  const hoja = libro.addWorksheet(r.nombre.slice(0, 31), { views: [{ state: "frozen", ySplit: 1 }] });
  hoja.columns = r.columnas.map((c) => ({
    header: c.titulo,
    key: c.clave,
    width: c.ancho ?? 12,
    style: c.formato === "pesos" ? { numFmt: '"$" #,##0' } : undefined,
  }));
  hoja.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  hoja.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF184A30" } };
  const datos = await r.filas();
  for (const f of datos) hoja.addRow(Object.fromEntries(r.columnas.map((c) => [c.clave, f[c.clave] ?? null])));
  hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: r.columnas.length } };

  await auditar(u.id, "exportar", "reporte", tipo, { filas: datos.length });
  const buffer = await libro.xlsx.writeBuffer();
  const fecha = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="JAC-Arango-${tipo}-${fecha}.xlsx"`,
    },
  });
}
