import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { requerirPermiso } from "@/lib/session";
import { DocumentoForm } from "../documento-form";

export const metadata = { title: "Subir documento" };

export default async function NuevoDocumento({ searchParams }: PageProps<"/documentos/nuevo">) {
  await requerirPermiso("documentos", "crear");
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/documentos" className="inline-flex items-center gap-1 font-semibold text-marca-700 hover:underline">
        <ChevronLeft className="size-5" aria-hidden />
        Documentos
      </Link>
      <h1 className="text-[1.75rem] leading-tight font-bold">Subir documento</h1>
      <DocumentoForm categoria={typeof sp.categoria === "string" ? sp.categoria : undefined} />
    </div>
  );
}
