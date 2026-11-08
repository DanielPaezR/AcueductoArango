import { MapaRed } from "@/components/mapa/dinamicos";
import { datosMapaRed } from "@/lib/consultas-red";
import { puede } from "@/lib/permisos";
import { requerirPermiso } from "@/lib/session";

export const metadata = { title: "Red del acueducto" };

export default async function Acueducto() {
  const u = await requerirPermiso("acueducto_red", "ver");
  const d = await datosMapaRed();
  return (
    <div className="-mx-4 -mt-5 -mb-28 flex h-[calc(100dvh-62px-64px)] flex-col sm:-mx-6 lg:-mx-10 lg:-mt-8 lg:-mb-12 lg:h-dvh">
      <div className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-2.5">
        <h1 className="text-xl font-bold">Red del acueducto</h1>
        <span className="text-stone-600">
          <span className="num font-semibold">{d.elementos.length}</span> punto{d.elementos.length === 1 ? "" : "s"} ·{" "}
          <span className="num font-semibold">{(d.tramos.reduce((a, t) => a + (t.longitudM ?? 0), 0) / 1000).toFixed(1)}</span> km
        </span>
      </div>
      <div className="min-h-0 flex-1">
        <MapaRed {...d} puedeCrear={puede(u, "acueducto_red", "crear")} />
      </div>
    </div>
  );
}
