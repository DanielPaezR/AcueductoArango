import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { NovedadForm } from "@/components/novedad-form";
import { requerirPermiso } from "@/lib/session";

export const metadata = { title: "Nueva novedad" };

export default async function NuevaNovedad() {
  await requerirPermiso("novedades", "crear");
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/novedades" className="inline-flex items-center gap-1 font-semibold text-marca-700 hover:underline">
        <ChevronLeft className="size-5" aria-hidden />
        Novedades y obras
      </Link>
      <h1 className="text-[1.75rem] leading-tight font-bold">Nueva novedad u obra</h1>
      <NovedadForm />
    </div>
  );
}
