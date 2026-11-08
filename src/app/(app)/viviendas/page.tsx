import Link from "next/link";
import { listarSectores, listarViviendas } from "@/lib/consultas";
import { miniatura } from "@/lib/imagenes";
import { ESTADO_VIVIENDA_LABEL } from "@/lib/opciones";
import { puede } from "@/lib/permisos";
import { requerirPermiso } from "@/lib/session";

export const metadata = { title: "Viviendas" };
const POR_PAGINA = 50;

export default async function Viviendas({ searchParams }: PageProps<"/viviendas">) {
  const u = await requerirPermiso("censo", "ver");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const sector = Number(sp.sector) || undefined;
  const acueducto = sp.acueducto === "si" ? true : sp.acueducto === "no" ? false : undefined;
  const pagina = Math.max(1, Number(sp.pagina) || 1);

  const [{ filas, total }, sectores] = await Promise.all([
    listarViviendas({ q, sector, acueducto, pagina, porPagina: POR_PAGINA }),
    listarSectores(),
  ]);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const enlace = (p: number) => {
    const s = new URLSearchParams();
    if (q) s.set("q", q);
    if (sector) s.set("sector", String(sector));
    if (sp.acueducto) s.set("acueducto", String(sp.acueducto));
    s.set("pagina", String(p));
    return `/viviendas?${s}`;
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Viviendas y personas</h1>
        <div className="flex gap-2">
          {puede(u, "censo", "editar") && <Link href="/viviendas/sectores" className="btn-secundario">Sectores</Link>}
          {puede(u, "censo", "crear") && <Link href="/viviendas/nueva" className="btn-primario">+ Nueva vivienda</Link>}
        </div>
      </div>

      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Buscar por nombre, cédula, código o referencia" className="input min-w-60 flex-1" />
        <select name="sector" defaultValue={sector ?? ""} className="input w-auto">
          <option value="">Todos los sectores</option>
          {sectores.map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </select>
        <select name="acueducto" defaultValue={String(sp.acueducto ?? "")} className="input w-auto">
          <option value="">Con y sin acueducto</option>
          <option value="si">Usan acueducto</option>
          <option value="no">No usan acueducto</option>
        </select>
        <button className="btn-secundario">Filtrar</button>
      </form>

      <p className="text-sm text-stone-500">{total} vivienda(s)</p>

      <div className="space-y-2">
        {filas.map((v) => (
          <Link key={v.id} href={`/viviendas/${v.id}`} className="tarjeta flex items-center gap-3 p-3 hover:border-marca-600">
            {v.fotoPrincipalUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={miniatura(v.fotoPrincipalUrl, 120, 120)!} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-2xl">🏠</div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-stone-500">{v.codigo}</span>
                <span className="truncate font-semibold">{v.jefe ?? "Sin familia registrada"}</span>
              </div>
              <div className="truncate text-sm text-stone-500">
                {[v.sector, v.nombrePredio, v.referencia].filter(Boolean).join(" · ") || "—"}
              </div>
            </div>
            <div className="shrink-0 text-right text-xs">
              <div>{v.personas} 👤</div>
              {v.usaAcueducto && <div className="text-sky-700">💧 Acueducto</div>}
              {v.estado !== "habitada" && <div className="text-amber-700">{ESTADO_VIVIENDA_LABEL[v.estado]}</div>}
            </div>
          </Link>
        ))}
        {!filas.length && (
          <div className="tarjeta py-10 text-center text-stone-500">
            {q || sector || acueducto !== undefined ? "No hay resultados con esos filtros." : "Aún no hay viviendas registradas."}
          </div>
        )}
      </div>

      {paginas > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          {pagina > 1 && <Link className="btn-secundario" href={enlace(pagina - 1)}>← Anterior</Link>}
          <span>Página {pagina} de {paginas}</span>
          {pagina < paginas && <Link className="btn-secundario" href={enlace(pagina + 1)}>Siguiente →</Link>}
        </div>
      )}
    </div>
  );
}
