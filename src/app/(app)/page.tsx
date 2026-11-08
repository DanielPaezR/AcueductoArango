import { count, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { requerirUsuario } from "@/lib/session";

export default async function Inicio() {
  const u = await requerirUsuario();
  if (u.debeCambiarPassword) redirect("/cuenta?primera=1");

  const [[viv], [per], [sus]] = await Promise.all([
    db.select({ n: count() }).from(schema.viviendas).where(isNull(schema.viviendas.deletedAt)),
    db.select({ n: count() }).from(schema.personas).where(isNull(schema.personas.deletedAt)),
    db.select({ n: count() }).from(schema.suscriptores).where(isNull(schema.suscriptores.deletedAt)),
  ]);

  const tarjetas = [
    { label: "Viviendas registradas", valor: viv.n, meta: "de ~500–700" },
    { label: "Personas censadas", valor: per.n },
    { label: "Suscriptores del acueducto", valor: sus.n },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hola, {u.nombre.split(" ")[0]}</h1>
        <p className="text-stone-500">Resumen de la vereda</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {tarjetas.map((t) => (
          <div key={t.label} className="tarjeta">
            <div className="text-sm text-stone-500">{t.label}</div>
            <div className="mt-1 text-3xl font-bold text-marca-800">{t.valor}</div>
            {t.meta && <div className="text-xs text-stone-400">{t.meta}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
