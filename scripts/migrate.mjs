// Aplica las migraciones pendientes. Se ejecuta en cada despliegue (Railway) antes de iniciar.
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

if (!process.env.DATABASE_URL) {
  console.error(
    "✗ Falta la variable DATABASE_URL. En Railway: servicio web → Variables → + New Variable → Add Reference → Postgres → DATABASE_URL",
  );
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
await pool.end();
console.log(`✓ Migraciones aplicadas en ${new URL(process.env.DATABASE_URL).host}`);
