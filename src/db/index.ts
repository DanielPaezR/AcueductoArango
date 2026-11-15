import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolClient } from "pg";
import { prepararContexto } from "./contexto";
import * as schema from "./schema";

/**
 * Pool de conexiones con aislamiento por vereda.
 * Cada conexión trabaja con el rol "vereda_app" (sujeto a RLS) y, cada vez que se presta,
 * recibe la vereda y el alcance de quien hace la petición. Así PostgreSQL filtra todo:
 * aunque una consulta olvide filtrar por vereda, nunca devuelve ni modifica datos de otra.
 */
class PoolVereda extends Pool {
  // @ts-expect-error: se sobreescriben las dos formas (promesa y callback) que usan pg y drizzle
  connect(cb?: (err: Error | undefined, client?: PoolClient, done?: (release?: unknown) => void) => void) {
    const p = (async () => {
      const preparar = await prepararContexto();
      const client = await super.connect();
      try {
        const ctx = await preparar(client);
        await client.query("select set_config('app.vereda_id', $1, false), set_config('app.alcance', $2, false)", [
          ctx.vereda === null ? "" : String(ctx.vereda),
          ctx.alcance,
        ]);
        return client;
      } catch (e) {
        client.release(e as Error);
        throw e;
      }
    })();
    if (!cb) return p;
    p.then(
      (c) => cb(undefined, c, (r?: unknown) => c.release(r as Error)),
      (e) => cb(e as Error),
    );
  }
}

const globalForDb = globalThis as unknown as { pool?: PoolVereda };

const pool =
  globalForDb.pool ??
  new PoolVereda({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });
if (!globalForDb.pool) pool.on("connect", (c) => void c.query("set role vereda_app"));
if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool as unknown as Pool, { schema });
export { schema };
