import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { requerirMunicipio } from "@/lib/session";
import { NuevaVeredaForm } from "../forms";

export const metadata = { title: "Nueva vereda" };

export default async function NuevaVereda() {
  await requerirMunicipio("municipio_veredas", "crear", "/municipio/veredas/nueva");
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/municipio/veredas" className="inline-flex items-center gap-1 font-semibold text-marca-700 hover:underline">
        <ChevronLeft className="size-5" aria-hidden />
        Veredas
      </Link>
      <h1 className="text-[1.75rem] leading-tight font-bold">Nueva vereda</h1>
      <NuevaVeredaForm />
    </div>
  );
}
