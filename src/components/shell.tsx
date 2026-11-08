"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/actions/auth";
import type { ItemNav } from "./nav";

export function Shell({
  items,
  faseActual,
  usuario,
  children,
}: {
  items: ItemNav[];
  faseActual: number;
  usuario: { nombre: string; rolLabel: string };
  children: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  const path = usePathname();

  const menu = (
    <nav className="flex flex-col gap-1 p-3">
      {items.map((i) => {
        const pendiente = (i.fase ?? 0) > faseActual;
        const activo = i.href === "/" ? path === "/" : path.startsWith(i.href);
        if (pendiente)
          return (
            <span key={i.href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-stone-400" title="En construcción">
              <span>{i.icono}</span>
              {i.label}
              <span className="ml-auto whitespace-nowrap rounded bg-stone-100 px-1.5 text-[10px]">Fase {i.fase}</span>
            </span>
          );
        return (
          <Link
            key={i.href}
            href={i.href}
            onClick={() => setAbierto(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
              activo ? "bg-marca-100 text-marca-900" : "text-stone-700 hover:bg-stone-100"
            }`}
          >
            <span>{i.icono}</span>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );

  const pie = (
    <div className="border-t border-stone-200 p-3 text-sm">
      <Link href="/cuenta" className="block rounded-lg px-3 py-2 hover:bg-stone-100" onClick={() => setAbierto(false)}>
        <div className="font-semibold text-stone-800">{usuario.nombre}</div>
        <div className="text-xs text-stone-500">{usuario.rolLabel}</div>
      </Link>
      <form action={logout}>
        <button className="mt-1 w-full rounded-lg px-3 py-2 text-left text-stone-600 hover:bg-stone-100">Cerrar sesión</button>
      </form>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Escritorio */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-stone-200 bg-white lg:flex">
        <div className="px-6 py-5 text-lg font-bold text-marca-800">🏡 Vereda</div>
        <div className="flex-1 overflow-y-auto">{menu}</div>
        {pie}
      </aside>

      {/* Móvil */}
      {abierto && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setAbierto(false)} />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white shadow-xl transition-transform lg:hidden ${
          abierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-6 py-5 text-lg font-bold text-marca-800">🏡 Vereda</div>
        <div className="flex-1 overflow-y-auto">{menu}</div>
        {pie}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-3 lg:hidden">
          <button onClick={() => setAbierto(true)} className="rounded-lg p-1 text-2xl leading-none" aria-label="Abrir menú">
            ☰
          </button>
          <span className="font-bold text-marca-800">🏡 Vereda</span>
        </header>
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
