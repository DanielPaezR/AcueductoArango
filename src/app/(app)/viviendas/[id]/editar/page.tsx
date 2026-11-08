import Link from "next/link";
import { notFound } from "next/navigation";
import { ViviendaForm } from "@/components/vivienda-form";
import { listarSectores, obtenerVivienda } from "@/lib/consultas";
import { requerirPermiso } from "@/lib/session";
import type { PersonaInput } from "@/lib/validacion";

export const metadata = { title: "Editar vivienda" };

/* eslint-disable @typescript-eslint/no-unused-vars -- se descartan columnas internas */
export default async function EditarVivienda({ params }: PageProps<"/viviendas/[id]/editar">) {
  await requerirPermiso("censo", "editar");
  const { id } = await params;
  const [d, sectores] = await Promise.all([obtenerVivienda(id), listarSectores()]);
  if (!d) notFound();
  const { v } = d;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href={`/viviendas/${id}`} className="font-semibold text-marca-700 hover:underline">← Volver a la ficha</Link>
      <h1 className="text-[1.75rem] leading-tight font-bold">Editar {v.codigo}</h1>
      <ViviendaForm
        sectores={sectores.map((s) => ({ id: s.id, nombre: s.nombre }))}
        inicial={{
          vivienda: {
            id: v.id,
            codigo: v.codigo,
            sectorId: v.sectorId,
            lat: v.lat,
            lng: v.lng,
            precisionM: v.precisionM,
            altitudM: v.altitudM,
            ubicacionAjustada: v.ubicacionAjustada,
            referencia: v.referencia,
            nombrePredio: v.nombrePredio,
            tenencia: v.tenencia,
            materialParedes: v.materialParedes,
            materialPiso: v.materialPiso,
            numCuartos: v.numCuartos,
            energia: v.energia,
            gas: v.gas,
            internet: v.internet,
            senalCelular: v.senalCelular,
            saneamiento: v.saneamiento,
            manejoBasuras: v.manejoBasuras,
            actividadEconomica: v.actividadEconomica,
            usaAcueducto: v.usaAcueducto,
            otraFuenteAgua: v.otraFuenteAgua,
            tieneMatricula: v.tieneMatricula,
            numeroMatricula: v.numeroMatricula,
            titularMatriculaNombre: v.titularMatriculaNombre,
            titularMatriculaDocumento: v.titularMatriculaDocumento,
            titularMatriculaTelefono: v.titularMatriculaTelefono,
            autorizacionDatos: v.autorizacionDatos,
            autorizacionNombre: v.autorizacionNombre,
            autorizacionDocumento: v.autorizacionDocumento,
            autorizacionMedio: v.autorizacionMedio as "firma" | "verbal" | null,
            estado: v.estado as "habitada",
            observaciones: v.observaciones,
          },
          personas: d.personas.map(
            ({ viviendaId: _v, createdAt: _c, updatedAt: _u, deletedAt: _d, ...p }) => p,
          ) as PersonaInput[],
        }}
      />
    </div>
  );
}
