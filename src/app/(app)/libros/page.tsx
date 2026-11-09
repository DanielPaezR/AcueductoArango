import { BookOpen, ChevronRight, ClipboardList, Package } from "lucide-react";
import Link from "next/link";
import { puede } from "@/lib/permisos";
import { requerirUsuario } from "@/lib/session";

export const metadata = { title: "Libros de la Junta" };

export default async function Libros() {
  const u = await requerirUsuario();
  const libros = [
    { href: "/libros/contabilidad", titulo: "Libro de contabilidad", detalle: "Ingresos, egresos y saldo de la Junta, con sus comprobantes", icono: BookOpen, seccion: "libro_contable" as const },
    { href: "/libros/actas", titulo: "Libro de actas", detalle: "Reuniones de asamblea y de junta directiva", icono: ClipboardList, seccion: "libro_actas" as const },
    { href: "/libros/inventario", titulo: "Libro de inventario", detalle: "Bienes y activos físicos de la Junta", icono: Package, seccion: "libro_inventario" as const },
  ].filter((l) => puede(u, l.seccion, "ver"));
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-[1.75rem] leading-tight font-bold">Libros de la Junta</h1>
      <ul className="tarjeta divide-y divide-stone-200 p-0 sm:p-0">
        {libros.map(({ href, titulo, detalle, icono: Icono }) => (
          <li key={href}>
            <Link href={href} className="flex items-center gap-4 px-4 py-4 hover:bg-stone-50 sm:px-5">
              <Icono className="size-7 shrink-0 text-marca-700" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-bold">{titulo}</span>
                <span className="text-stone-600">{detalle}</span>
              </span>
              <ChevronRight className="size-5 text-stone-400" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
