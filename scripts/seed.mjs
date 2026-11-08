// Crea el superadmin inicial si no existe ninguno. Idempotente.
// Recuperación de acceso: si existe la variable RESET_SUPERADMIN_PASSWORD, al arrancar se asigna esa clave
// (temporal) al superadmin SEED_SUPERADMIN_USERNAME y se le pide cambiarla al entrar. Luego borre la variable.
import pg from "pg";
import bcrypt from "bcryptjs";

if (!process.env.DATABASE_URL) {
  console.error(
    "✗ Falta la variable DATABASE_URL. En Railway: servicio web → Variables → + New Variable → Add Reference → Postgres → DATABASE_URL",
  );
  process.exit(1);
}

const username = process.env.SEED_SUPERADMIN_USERNAME?.trim().toLowerCase();
const password = process.env.SEED_SUPERADMIN_PASSWORD;
const reset = process.env.RESET_SUPERADMIN_PASSWORD;
const nombre = process.env.SEED_SUPERADMIN_NOMBRE || "Superadministrador";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const { rows } = await pool.query("select username from usuarios where rol = 'superadmin'");
if (rows.length) {
  console.log(`✓ Superadmin existente: ${rows.map((r) => r.username).join(", ")}`);
} else if (!username || !password) {
  console.log("! Sin SEED_SUPERADMIN_USERNAME/PASSWORD: no se crea superadmin");
} else {
  await pool.query(
    `insert into usuarios (nombre, username, password_hash, rol, permisos, debe_cambiar_password)
     values ($1, $2, $3, 'superadmin', '{}'::jsonb, true)`,
    [nombre, username, await bcrypt.hash(password, 12)],
  );
  console.log(`✓ Superadmin "${username}" creado (deberá cambiar la clave al entrar)`);
}

if (reset) {
  if (reset.length < 8) {
    console.error("✗ RESET_SUPERADMIN_PASSWORD debe tener al menos 8 caracteres; no se cambió nada");
  } else if (!username) {
    console.error("✗ Para usar RESET_SUPERADMIN_PASSWORD también debe existir SEED_SUPERADMIN_USERNAME");
  } else {
    const r = await pool.query(
      `update usuarios set password_hash = $1, debe_cambiar_password = true, activo = true, updated_at = now()
       where username = $2 and rol = 'superadmin' returning id`,
      [await bcrypt.hash(reset, 12), username],
    );
    if (r.rowCount) {
      await pool.query(
        `insert into auditoria (usuario_id, accion, entidad, entidad_id, datos) values ($1::uuid, 'restablecer_password', 'usuario', $1::text, '{"medio":"variable RESET_SUPERADMIN_PASSWORD"}')`,
        [r.rows[0].id],
      );
      console.log(`✓ Clave del superadmin "${username}" restablecida. BORRE la variable RESET_SUPERADMIN_PASSWORD.`);
    } else {
      console.error(`✗ No existe un superadmin con usuario "${username}". Superadmins: ${rows.map((x) => x.username).join(", ") || "ninguno"}`);
    }
  }
}
await pool.end();
