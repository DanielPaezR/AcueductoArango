import { NAV, FASE_ACTUAL } from "@/components/nav";
import { Shell } from "@/components/shell";
import { puede, ROLES, type Rol } from "@/lib/permisos";
import { requerirUsuario } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const u = await requerirUsuario();
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
