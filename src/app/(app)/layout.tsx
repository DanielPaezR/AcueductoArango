import { redirect } from "next/navigation";
import { FASE_ACTUAL, NAV, NAV_MUNICIPIO, type ItemNav } from "@/components/nav";
import { Shell } from "@/components/shell";
import { modulos } from "@/lib/config";
import { PLATAFORMA, VERSION_TERMINOS } from "@/lib/legal";
import { puede, ROLES, type Rol } from "@/lib/permisos";
import { requerirUsuario } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const u = await requerirUsuario();
  // Nadie usa el sistema sin aceptar los términos y el compromiso de confidencialidad vigentes
  if (u.terminosVersion !== VERSION_TERMINOS) redirect("/aceptar");
  const visible = (i: ItemNav, m: { acueducto: boolean }) =>
    (!i.seccion || puede(u, i.seccion, "ver")) &&
    (!i.secciones || i.secciones.some((x) => puede(u, x, "ver"))) &&
    (!i.modulo || m[i.modulo]) &&
    (!i.soloSuperadmin || u.rol === "superadmin");

  // Alcaldía (o superadmin sin vereda elegida): menú municipal
  if (!u.vereda) {
    return (
      <Shell
        items={NAV_MUNICIPIO.filter((i) => visible(i, { acueducto: true }))}
        faseActual={FASE_ACTUAL}
        accionPrincipal={null}
        usuario={{ nombre: u.nombre, rolLabel: ROLES[u.rol as Rol] }}
        marca={{ titulo: PLATAFORMA.alcaldia, subtitulo: "Todas las veredas" }}
      >
        {children}
      </Shell>
    );
  }

  const m = await modulos();
  const items = NAV.filter((i) => visible(i, m));
  // El superadmin trabajando dentro de una vereda puede volver a la vista de la alcaldía
  if (u.rol === "superadmin")
    items.push(
      { href: "/api/vista?salir=1&a=/municipio/veredas", label: "Cambiar de vereda", icono: "cambiar", grupo: "Alcaldía" },
      { href: "/api/vista?salir=1", label: "Volver a la alcaldía", icono: "alcaldia", grupo: "Alcaldía" },
    );
  return (
    <Shell
      items={items}
      faseActual={FASE_ACTUAL}
      accionPrincipal={
        puede(u, "censo", "crear")
          ? { href: "/viviendas/nueva", label: "Registrar" }
          : m.acueducto && puede(u, "mantenimientos", "crear")
            ? { href: "/mantenimientos/nuevo", label: "Arreglo" }
            : null
      }
      usuario={{ nombre: u.nombre, rolLabel: ROLES[u.rol as Rol] }}
      marca={{ titulo: `JAC ${u.vereda.nombre}`, subtitulo: u.rol === "superadmin" ? "Trabajando en esta vereda" : undefined }}
    >
      {children}
    </Shell>
  );
}
