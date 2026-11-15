import { MapaMunicipio } from "@/components/mapa/dinamicos";
import { puntosMunicipio } from "@/lib/municipio";
import { requerirMunicipio } from "@/lib/session";
import { listarVeredas } from "@/lib/veredas";

export const metadata = { title: "Mapa del municipio" };

export default async function MapaDelMunicipio() {
  await requerirMunicipio("municipio", "ver", "/municipio/mapa");
  const [{ casas, novedades }, veredas] = await Promise.all([puntosMunicipio(), listarVeredas()]);
  const activas = new Set(veredas.map((v) => v.id));
  return (
    <div className="-mx-4 -mt-5 -mb-28 flex h-[calc(100dvh-62px-64px)] flex-col sm:-mx-6 lg:-mx-10 lg:-mt-8 lg:-mb-12 lg:h-dvh">
      <div className="border-b border-stone-200 bg-white px-4 py-2.5">
        <h1 className="text-xl font-bold">Mapa del municipio</h1>
      </div>
      <div className="min-h-0 flex-1">
        <MapaMunicipio
          casas={casas.filter((c) => activas.has(c.vereda_id))}
          novedades={novedades.filter((n) => activas.has(n.vereda_id))}
          veredas={veredas.map((v) => ({ id: v.id, nombre: v.nombre }))}
        />
      </div>
    </div>
  );
}
