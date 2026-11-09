import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { hoyBogota } from "@/lib/dinero";
import { requerirPermiso } from "@/lib/session";
import { ItemForm } from "../item-form";

export const metadata = { title: "Agregar bien" };

export default async function NuevoItem() {
  await requerirPermiso("libro_inventario", "crear");
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/libros/inventario" className="inline-flex items-center gap-1 font-semibold text-marca-700 hover:underline">
        <ChevronLeft className="size-5" aria-hidden />
        Libro de inventario
      </Link>
      <h1 className="text-[1.75rem] leading-tight font-bold">Agregar bien al inventario</h1>
      <ItemForm hoy={hoyBogota()} />
    </div>
  );
}
