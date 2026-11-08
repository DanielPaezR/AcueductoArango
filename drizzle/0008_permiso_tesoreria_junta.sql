-- La tesorería se separa en dos secciones de permisos (acueducto / Junta).
-- Quien hoy tiene acceso a tesorería conserva el mismo acceso en la Junta; el superadmin lo ajusta después.
UPDATE "usuarios" SET "permisos" = "permisos" || jsonb_build_object('tesoreria_junta', "permisos"->'tesoreria')
WHERE "permisos" ? 'tesoreria' AND NOT ("permisos" ? 'tesoreria_junta');
