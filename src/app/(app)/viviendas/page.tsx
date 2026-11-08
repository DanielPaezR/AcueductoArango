import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { FilaVivienda } from "@/components/fila-vivienda";
import { listarSectores, listarViviendas } from "@/lib/consultas";
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

  const filtrando = Boolean(q || sector || acueducto !== undefined);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[1.75rem] leading-tight font-bold">Viviendas</h1>
        <div className="flex gap-2">
          {puede(u, "censo", "editar") && (
            <Link href="/viviendas/sectores" className="btn-secundario">Sectores</Link>
          )}
          {puede(u, "censo", "crear") && (
            <Link href="/viviendas/nueva" className="btn-primario">
              <Plus className="size-5" aria-hidden />
              Registrar visita
            </Link>
          )}
        </div>
      </div>

      <form className="space-y-2.5" role="search">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-stone-500" aria-hidden />
          <input
            name="q"
            defaultValue={q}
            placeholder="Nombre, cédula, código o referencia"
            className="input pl-11"
            aria-label="Buscar vivienda"
            type="search"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select name="sector" defaultValue={sector ?? ""} className="input w-auto flex-1" aria-label="Sector">
            <option value="">Todos los sectores</option>
            {sectores.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
          <select name="acueducto" defaultValue={String(sp.acueducto ?? "")} className="input w-auto flex-1" aria-label="Acueducto">
            <option value="">Con y sin acueducto</option>
            <option value="si">Con acueducto</option>
            <option value="no">Sin acueducto</option>
          </select>
          <button className="btn-secundario">Buscar</button>
        </div>
      </form>

      <p className="text-stone-600" role="status">
        <span className="num font-semibold text-stone-900">{total}</span> vivienda{total === 1 ? "" : "s"}
        {filtrando && (
          <>
            {" · "}
            <Link href="/viviendas" className="font-semibold text-marca-700 hover:underline">Quitar filtros</Link>
          </>
        )}
      </p>

      <div className="space-y-2.5">
        {filas.map((v) => (
          <FilaVivienda key={v.id} v={v} />
        ))}
        {!filas.length && (
          <div className="tarjeta text-stone-600">
            {filtrando ? "No hay viviendas con esos filtros." : "Aún no hay viviendas registradas."}
          </div>
        )}
      </div>

      {paginas > 1 && (
        <nav className="flex items-center justify-center gap-3" aria-label="Páginas">
          {pagina > 1 && <Link className="btn-secundario" href={enlace(pagina - 1)}>Anterior</Link>}
          <span className="num text-stone-700">Página {pagina} de {paginas}</span>
          {pagina < paginas && <Link className="btn-secundario" href={enlace(pagina + 1)}>Siguiente</Link>}
        </nav>
      )}
    </div>
  );
}
