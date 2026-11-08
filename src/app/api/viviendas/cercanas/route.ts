import { usuarioApi } from "@/lib/api";
import { viviendasCercanas } from "@/lib/consultas";

export async function GET(req: Request) {
  const u = await usuarioApi("censo", "ver");
  if (u instanceof Response) return u;
  const q = new URL(req.url).searchParams;
  const lat = Number(q.get("lat"));
  const lng = Number(q.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return Response.json({ error: "Coordenadas inválidas" }, { status: 400 });
  const excluir = q.get("excluir");
  return Response.json({ cercanas: await viviendasCercanas(lat, lng, 20, excluir && /^[0-9a-f-]{36}$/i.test(excluir) ? excluir : undefined) });
}
