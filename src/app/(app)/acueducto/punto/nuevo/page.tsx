import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { ElementoForm } from "@/components/elemento-form";
import { requerirPermiso } from "@/lib/session";

export const metadata = { title: "Nuevo punto de la red" };

export default async function NuevoPunto() {
  await requerirPermiso("acueducto_red", "crear");
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/acueducto" className="inline-flex items-center gap-1 font-semibold text-marca-700 hover:underline">
        <ChevronLeft className="size-5" aria-hidden />
        Red del acueducto
      </Link>
      <h1 className="text-[1.75rem] leading-tight font-bold">Nuevo punto de la red</h1>
      <ElementoForm />
    </div>
  );
}
