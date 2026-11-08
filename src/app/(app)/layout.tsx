import { NAV, FASE_ACTUAL } from "@/components/nav";
import { Shell } from "@/components/shell";
import { puede, ROLES, type Rol } from "@/lib/permisos";
import { redirect } from "next/navigation";
import { VERSION_TERMINOS } from "@/lib/legal";
import { requerirUsuario } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const u = await requerirUsuario();
  // Nadie usa el sistema sin aceptar los términos y el compromiso de confidencialidad vigentes
  if (u.terminosVersion !== VERSION_TERMINOS) redirect("/aceptar");
  const items = NAV.filter((i) => !i.seccion || puede(u, i.seccion, "ver"));
  return (
    <Shell
      items={items}
      faseActual={FASE_ACTUAL}
      accionPrincipal={
        puede(u, "censo", "crear")
          ? { href: "/viviendas/nueva", label: "Registrar" }
          : puede(u, "mantenimientos", "crear")
            ? { href: "/mantenimientos/nuevo", label: "Arreglo" }
            : null
      }
      usuario={{ nombre: u.nombre, rolLabel: ROLES[u.rol as Rol] }}
    >
      {children}
    </Shell>
  );
}
