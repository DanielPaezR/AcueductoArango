import { ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { pesos } from "@/lib/dinero";
import { estadoSuscriptores } from "@/lib/finanzas";
import { puede } from "@/lib/permisos";
import { requerirPermiso } from "@/lib/session";
import { CrearDesdeCenso } from "./crear-desde-censo";

export const metadata = { title: "Suscriptores" };

const FILTROS = { todos: "Todos", atrasados: "Atrasados", aldia: "Al día", suspendidos: "Suspendidos" } as const;

export default async function Suscriptores({ searchParams }: PageProps<"/suscriptores">) {
  const u = await requerirPermiso("suscriptores", "ver");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const filtro = (typeof sp.f === "string" && sp.f in FILTROS ? sp.f : "todos") as keyof typeof FILTROS;

  const todos = await estadoSuscriptores();
  const lista = todos.filter(
    (s) =>
      (!q || s.titularNombre.toLowerCase().includes(q) || s.codigo.toLowerCase().includes(q)) &&
      (filtro === "todos" ||
        (filtro === "atrasados" && !s.alDia && s.estado !== "retirado") ||
        (filtro === "aldia" && s.alDia && s.estado === "activo") ||
        (filtro === "suspendidos" && s.estado === "suspendido")),
  );
  const atrasados = todos.filter((s) => !s.alDia && s.estado !== "retirado").length;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[1.75rem] leading-tight font-bold">Suscriptores del acueducto</h1>
        {puede(u, "suscriptores", "crear") && <CrearDesdeCenso />}
      </div>

      <form className="space-y-2.5" role="search">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-stone-500" aria-hidden />
          <input name="q" defaultValue={q} type="search" placeholder="Nombre o número de matrícula" className="input pl-11" aria-label="Buscar suscriptor" />
          <input type="hidden" name="f" value={filtro} />
        </div>
      </form>
      <nav className="flex flex-wrap gap-2" aria-label="Filtrar">
        {Object.entries(FILTROS).map(([k, l]) => (
          <Link
            key={k}
            href={`/suscriptores?f=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            aria-current={filtro === k ? "page" : undefined}
            className={`chip min-h-10 px-4 ${filtro === k ? "bg-marca-700 text-white" : "bg-white text-stone-700 ring-1 ring-stone-300"}`}
          >
            {l}
            {k === "atrasados" && atrasados > 0 && <span className="num">({atrasados})</span>}
          </Link>
        ))}
      </nav>

      <ul className="space-y-2.5">
        {lista.map((s) => (
          <li key={s.id}>
            <Link
              href={`/suscriptores/${s.id}`}
              className={`zocalo ${s.estado === "retirado" ? "zocalo-muro" : s.alDia ? "zocalo-agua" : "zocalo-alerta"} flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-4 pb-5 hover:border-stone-300`}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[1.05rem] font-bold">{s.titularNombre}</div>
                <div className="text-sm text-stone-600">
                  <span className="num font-semibold">{s.codigo}</span>
                  {s.estado !== "activo" && <span className="font-semibold text-ocre-800"> · {s.estado === "suspendido" ? "Suspendido" : "Retirado"}</span>}
                  {s.exento && <> · Exento</>}
                </div>
              </div>
              <div className="text-right">
                {s.alDia ? (
                  <span className="font-semibold text-postigo-700">Al día</span>
                ) : (
                  <>
                    <div className="num font-bold text-teja-700">{pesos(s.deudaVencida)}</div>
                    <div className="text-sm text-teja-700">
                      <span className="num">{s.mesesAtraso}</span> mes{s.mesesAtraso === 1 ? "" : "es"} de atraso
                    </div>
                  </>
                )}
              </div>
              <ChevronRight className="size-5 shrink-0 text-stone-400" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      {!lista.length && (
        <div className="tarjeta text-stone-700">
          {todos.length
            ? "No hay suscriptores con ese filtro."
            : "Todavía no hay suscriptores. Use “Crear desde el censo” para tomar las viviendas que tienen acueducto."}
        </div>
      )}
    </div>
  );
}
