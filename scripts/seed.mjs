// Crea el superadmin inicial si no existe ningún superadmin. Idempotente.
import pg from "pg";
import bcrypt from "bcryptjs";

if (!process.env.DATABASE_URL) {
  console.error(
    "✗ Falta la variable DATABASE_URL. En Railway: servicio web → Variables → + New Variable → Add Reference → Postgres → DATABASE_URL",
  );
  process.exit(1);
}

const { SEED_SUPERADMIN_USERNAME: username, SEED_SUPERADMIN_PASSWORD: password } = process.env;
const nombre = process.env.SEED_SUPERADMIN_NOMBRE || "Superadministrador";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const { rows } = await pool.query("select 1 from usuarios where rol = 'superadmin' limit 1");
if (rows.length) {
  console.log("✓ Ya existe un superadmin; no se crea otro");
} else if (!username || !password) {
  console.log("! Sin SEED_SUPERADMIN_USERNAME/PASSWORD: no se crea superadmin");
} else {
  const hash = await bcrypt.hash(password, 12);
  await pool.query(
    `insert into usuarios (nombre, username, password_hash, rol, permisos, debe_cambiar_password)
     values ($1, $2, $3, 'superadmin', '{}'::jsonb, true)`,
    [nombre, username.toLowerCase(), hash],
  );
  console.log(`✓ Superadmin "${username}" creado (deberá cambiar la clave al entrar)`);
}
await pool.end();
