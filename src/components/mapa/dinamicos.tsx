"use client";

import dynamic from "next/dynamic";

const Cargando = () => <div className="flex h-64 items-center justify-center rounded-lg bg-stone-100 text-sm text-stone-500">Cargando mapa…</div>;

export const MapaSelector = dynamic(() => import("./selector"), { ssr: false, loading: Cargando });
export const MapaPunto = dynamic(() => import("./punto"), { ssr: false, loading: Cargando });
export const MapaUsuarios = dynamic(() => import("./usuarios"), { ssr: false, loading: Cargando });
export const MapaRed = dynamic(() => import("./red"), { ssr: false, loading: Cargando });
