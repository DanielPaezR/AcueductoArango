"use client";

import { LogOut, Menu, Plus, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/actions/auth";
import { ICONOS } from "./iconos";
import type { ItemNav } from "./nav";
import { SyncIndicador, SyncMotor } from "./sync-status";

function Marca({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2.5 font-bold tracking-tight text-white ${className}`}>
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="7" fill="#f6f7f4" />
        <path d="M16 6 5 15h3v10h16V15h3z" fill="#1f5a3a" />
        <path d="M5 25h22v2.5H5z" fill="#1f6698" />
        <rect x="13.5" y="17" width="5" height="8" rx="1" fill="#f6f7f4" />
      </svg>
      <span className="text-[1.1rem] leading-none">JAC Arango</span>
    </Link>
  );
}

export function Shell({
  items,
  faseActual,
  puedeRegistrar,
  usuario,
  children,
}: {
  items: ItemNav[];
  faseActual: number;
  puedeRegistrar: boolean;
  usuario: { nombre: string; rolLabel: string };
  children: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  const path = usePathname();
  const activo = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const disponible = (i: ItemNav) => (i.fase ?? 0) <= faseActual;

  const enlace = (i: ItemNav) => {
    const Icono = ICONOS[i.icono];
    const a = activo(i.href);
    return (
      <Link
        key={i.href}
        href={i.href}
        onClick={() => setAbierto(false)}
        aria-current={a ? "page" : undefined}
        className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-[0.95rem] font-semibold transition-colors ${
          a ? "bg-stone-50 text-marca-900" : "text-marca-50 hover:bg-white/10"
        }`}
      >
        <Icono className="size-5 shrink-0" aria-hidden />
        {i.label}
      </Link>
    );
  };
  const proximos = items.filter((i) => !disponible(i));

  const lista = (
    <nav className="flex flex-col gap-0.5 p-3" aria-label="Secciones">
      {items.filter(disponible).map(enlace)}
      {proximos.length > 0 && (
        <div className="mt-5 border-t border-white/10 pt-4">
          <p className="px-3 pb-1.5 text-sm font-semibold text-marca-100/70">En construcción</p>
          <ul className="space-y-0.5">
            {proximos.map((i) => {
              const Icono = ICONOS[i.icono];
              return (
                <li key={i.href} className="flex min-h-9 items-center gap-3 px-3 text-[0.92rem] text-marca-100/55">
                  <Icono className="size-4.5 shrink-0" aria-hidden />
                  {i.label}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </nav>
  );

  const pie = (
    <div className="border-t border-white/10 p-3">
      <Link
        href="/cuenta"
        onClick={() => setAbierto(false)}
        className="block rounded-lg px-3 py-2 text-marca-50 hover:bg-white/10"
      >
        <div className="font-semibold">{usuario.nombre}</div>
        <div className="text-sm text-marca-100/75">{usuario.rolLabel}</div>
      </Link>
      <form action={logout}>
        <button className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-marca-100/85 hover:bg-white/10">
          <LogOut className="size-5" aria-hidden />
          Cerrar sesión
        </button>
      </form>
    </div>
  );

  // Barra inferior del celular: las tareas de campo, al alcance del pulgar
  const tabs = items.filter((i) => ["/", "/mapa", "/viviendas"].includes(i.href) && disponible(i));

  return (
    <div className="flex min-h-dvh">
      <SyncMotor />

      {/* Riel de escritorio */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-marca-800 lg:flex">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <Marca />
        </div>
        <div className="px-5 pb-2">
          <SyncIndicador />
        </div>
        <div className="flex-1 overflow-y-auto">{lista}</div>
        {pie}
      </aside>

      {/* Menú completo en el celular */}
      {abierto && <div className="fixed inset-0 z-40 bg-stone-900/50 lg:hidden" onClick={() => setAbierto(false)} />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[18rem] max-w-[85vw] flex-col bg-marca-800 shadow-2xl transition-transform duration-200 lg:hidden ${
          abierto ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!abierto}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <Marca />
          <button onClick={() => setAbierto(false)} className="rounded-lg p-2 text-marca-50 hover:bg-white/10" aria-label="Cerrar menú">
            <X className="size-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{lista}</div>
        {pie}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 bg-marca-800 px-4 py-3 lg:hidden">
          <Marca />
          <div className="ml-auto">
            <SyncIndicador />
          </div>
        </header>

        <main className="flex-1 px-4 pt-5 pb-28 sm:px-6 lg:px-10 lg:pt-8 lg:pb-12">{children}</main>

        {/* Barra inferior (celular) */}
        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
          aria-label="Accesos rápidos"
        >
          <div className="mx-auto flex max-w-lg items-stretch justify-around">
            {tabs.slice(0, 2).map((i) => {
              const Icono = ICONOS[i.icono];
              const a = activo(i.href) && !(i.href === "/viviendas" && path === "/viviendas/nueva");
              return (
                <Link
                  key={i.href}
                  href={i.href}
                  aria-current={a ? "page" : undefined}
                  className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 text-[0.78rem] font-semibold ${
                    a ? "text-marca-700" : "text-stone-600"
                  }`}
                >
                  <Icono className="size-6" aria-hidden />
                  {i.href === "/mapa" ? "Mapa" : i.label}
                </Link>
              );
            })}
            {puedeRegistrar && (
              <Link
                href="/viviendas/nueva"
                className="flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 text-[0.78rem] font-semibold text-marca-800"
              >
                <span className="-mt-5 flex size-12 items-center justify-center rounded-full bg-marca-700 text-white shadow-[0_3px_8px_rgb(18_56_38/0.35)] ring-4 ring-white">
                  <Plus className="size-6" aria-hidden />
                </span>
                Registrar
              </Link>
            )}
            {tabs.slice(2).map((i) => {
              const Icono = ICONOS[i.icono];
              const a = activo(i.href) && path !== "/viviendas/nueva";
              return (
                <Link
                  key={i.href}
                  href={i.href}
                  aria-current={a ? "page" : undefined}
                  className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 text-[0.78rem] font-semibold ${
                    a ? "text-marca-700" : "text-stone-600"
                  }`}
                >
                  <Icono className="size-6" aria-hidden />
                  {i.label}
                </Link>
              );
            })}
            <button
              onClick={() => setAbierto(true)}
              className="flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 text-[0.78rem] font-semibold text-stone-600"
              aria-label="Abrir menú"
            >
              <Menu className="size-6" aria-hidden />
              Menú
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
