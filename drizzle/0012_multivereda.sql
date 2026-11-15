-- ====================================================================
-- Multi-vereda: cada JAC es un "inquilino" y la alcaldía ve todas.
-- Todo lo existente pasa a la vereda Arango (id 1).
-- El aislamiento lo hace PostgreSQL con seguridad por filas (RLS): la app
-- se conecta con el rol "vereda_app" y fija app.vereda_id / app.alcance.
-- ====================================================================
ALTER TYPE "public"."rol" ADD VALUE IF NOT EXISTS 'alcaldia';--> statement-breakpoint
ALTER TYPE "public"."rol" ADD VALUE IF NOT EXISTS 'alcaldia_admin';--> statement-breakpoint
CREATE TABLE "veredas" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"slug" varchar(60) NOT NULL,
	"municipio" varchar(80) DEFAULT 'Concepción' NOT NULL,
	"departamento" varchar(80) DEFAULT 'Antioquia' NOT NULL,
	"nombre_jac" varchar(160),
	"nit" varchar(30),
	"personeria_juridica" varchar(60),
	"direccion" varchar(200),
	"telefono" varchar(30),
	"email" varchar(160),
	"meta_viviendas" integer DEFAULT 100 NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"activa" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "veredas_slug_unique" UNIQUE("slug")
);--> statement-breakpoint
INSERT INTO "veredas" ("id", "nombre", "slug", "meta_viviendas", "lat", "lng") VALUES (1, 'Arango', 'arango', 600, 6.3944, -75.2575);--> statement-breakpoint
SELECT setval(pg_get_serial_sequence('veredas', 'id'), 1);--> statement-breakpoint
CREATE TABLE "contadores" (
	"vereda_id" integer NOT NULL REFERENCES "veredas"("id"),
	"clave" varchar(30) NOT NULL,
	"valor" integer DEFAULT 0 NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "contadores_pk" ON "contadores" USING btree ("vereda_id","clave");--> statement-breakpoint
-- Vereda y alcance de la sesión (los fija la app en cada conexión)
CREATE OR REPLACE FUNCTION app_vereda() RETURNS integer LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.vereda_id', true), '')::int
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_municipal() RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT coalesce(current_setting('app.alcance', true), '') = 'municipio'
$$;--> statement-breakpoint
-- Siguiente número consecutivo de la vereda de la sesión (códigos de casa, asientos, recibos)
CREATE OR REPLACE FUNCTION siguiente_numero(p_clave text) RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  v integer := app_vereda();
  n integer;
BEGIN
  IF v IS NULL THEN
    RAISE EXCEPTION 'No hay una vereda en la sesión para numerar %', p_clave;
  END IF;
  INSERT INTO contadores (vereda_id, clave, valor) VALUES (v, p_clave, 1)
  ON CONFLICT (vereda_id, clave) DO UPDATE SET valor = contadores.valor + 1
  RETURNING valor INTO n;
  RETURN n;
END $$;--> statement-breakpoint
ALTER TABLE "actas" ADD COLUMN "vereda_id" integer REFERENCES "veredas"("id");--> statement-breakpoint
UPDATE "actas" SET "vereda_id" = 1;--> statement-breakpoint
ALTER TABLE "actas" ALTER COLUMN "vereda_id" SET DEFAULT nullif(current_setting('app.vereda_id', true), '')::int;--> statement-breakpoint
ALTER TABLE "actas" ALTER COLUMN "vereda_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "cargos" ADD COLUMN "vereda_id" integer REFERENCES "veredas"("id");--> statement-breakpoint
UPDATE "cargos" SET "vereda_id" = 1;--> statement-breakpoint
ALTER TABLE "cargos" ALTER COLUMN "vereda_id" SET DEFAULT nullif(current_setting('app.vereda_id', true), '')::int;--> statement-breakpoint
ALTER TABLE "cargos" ALTER COLUMN "vereda_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "compras" ADD COLUMN "vereda_id" integer REFERENCES "veredas"("id");--> statement-breakpoint
UPDATE "compras" SET "vereda_id" = 1;--> statement-breakpoint
ALTER TABLE "compras" ALTER COLUMN "vereda_id" SET DEFAULT nullif(current_setting('app.vereda_id', true), '')::int;--> statement-breakpoint
ALTER TABLE "compras" ALTER COLUMN "vereda_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "configuracion" ADD COLUMN "vereda_id" integer REFERENCES "veredas"("id");--> statement-breakpoint
UPDATE "configuracion" SET "vereda_id" = 1;--> statement-breakpoint
ALTER TABLE "configuracion" ALTER COLUMN "vereda_id" SET DEFAULT nullif(current_setting('app.vereda_id', true), '')::int;--> statement-breakpoint
ALTER TABLE "configuracion" ALTER COLUMN "vereda_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "cuentas" ADD COLUMN "vereda_id" integer REFERENCES "veredas"("id");--> statement-breakpoint
UPDATE "cuentas" SET "vereda_id" = 1;--> statement-breakpoint
ALTER TABLE "cuentas" ALTER COLUMN "vereda_id" SET DEFAULT nullif(current_setting('app.vereda_id', true), '')::int;--> statement-breakpoint
ALTER TABLE "cuentas" ALTER COLUMN "vereda_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "documentos" ADD COLUMN "vereda_id" integer REFERENCES "veredas"("id");--> statement-breakpoint
UPDATE "documentos" SET "vereda_id" = 1;--> statement-breakpoint
ALTER TABLE "documentos" ALTER COLUMN "vereda_id" SET DEFAULT nullif(current_setting('app.vereda_id', true), '')::int;--> statement-breakpoint
ALTER TABLE "documentos" ALTER COLUMN "vereda_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "elementos_acueducto" ADD COLUMN "vereda_id" integer REFERENCES "veredas"("id");--> statement-breakpoint
UPDATE "elementos_acueducto" SET "vereda_id" = 1;--> statement-breakpoint
ALTER TABLE "elementos_acueducto" ALTER COLUMN "vereda_id" SET DEFAULT nullif(current_setting('app.vereda_id', true), '')::int;--> statement-breakpoint
ALTER TABLE "elementos_acueducto" ALTER COLUMN "vereda_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "inventario" ADD COLUMN "vereda_id" integer REFERENCES "veredas"("id");--> statement-breakpoint
UPDATE "inventario" SET "vereda_id" = 1;--> statement-breakpoint
ALTER TABLE "inventario" ALTER COLUMN "vereda_id" SET DEFAULT nullif(current_setting('app.vereda_id', true), '')::int;--> statement-breakpoint
ALTER TABLE "inventario" ALTER COLUMN "vereda_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "mantenimientos" ADD COLUMN "vereda_id" integer REFERENCES "veredas"("id");--> statement-breakpoint
UPDATE "mantenimientos" SET "vereda_id" = 1;--> statement-breakpoint
ALTER TABLE "mantenimientos" ALTER COLUMN "vereda_id" SET DEFAULT nullif(current_setting('app.vereda_id', true), '')::int;--> statement-breakpoint
ALTER TABLE "mantenimientos" ALTER COLUMN "vereda_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "materiales_usados" ADD COLUMN "vereda_id" integer REFERENCES "veredas"("id");--> statement-breakpoint
UPDATE "materiales_usados" SET "vereda_id" = 1;--> statement-breakpoint
ALTER TABLE "materiales_usados" ALTER COLUMN "vereda_id" SET DEFAULT nullif(current_setting('app.vereda_id', true), '')::int;--> statement-breakpoint
ALTER TABLE "materiales_usados" ALTER COLUMN "vereda_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "movimientos" ADD COLUMN "vereda_id" integer REFERENCES "veredas"("id");--> statement-breakpoint
UPDATE "movimientos" SET "vereda_id" = 1;--> statement-breakpoint
ALTER TABLE "movimientos" ALTER COLUMN "vereda_id" SET DEFAULT nullif(current_setting('app.vereda_id', true), '')::int;--> statement-breakpoint
ALTER TABLE "movimientos" ALTER COLUMN "vereda_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "movimientos_historial" ADD COLUMN "vereda_id" integer REFERENCES "veredas"("id");--> statement-breakpoint
UPDATE "movimientos_historial" SET "vereda_id" = 1;--> statement-breakpoint
ALTER TABLE "movimientos_historial" ALTER COLUMN "vereda_id" SET DEFAULT nullif(current_setting('app.vereda_id', true), '')::int;--> statement-breakpoint
ALTER TABLE "movimientos_historial" ALTER COLUMN "vereda_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "novedades" ADD COLUMN "vereda_id" integer REFERENCES "veredas"("id");--> statement-breakpoint
UPDATE "novedades" SET "vereda_id" = 1;--> statement-breakpoint
ALTER TABLE "novedades" ALTER COLUMN "vereda_id" SET DEFAULT nullif(current_setting('app.vereda_id', true), '')::int;--> statement-breakpoint
ALTER TABLE "novedades" ALTER COLUMN "vereda_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "pagos" ADD COLUMN "vereda_id" integer REFERENCES "veredas"("id");--> statement-breakpoint
UPDATE "pagos" SET "vereda_id" = 1;--> statement-breakpoint
ALTER TABLE "pagos" ALTER COLUMN "vereda_id" SET DEFAULT nullif(current_setting('app.vereda_id', true), '')::int;--> statement-breakpoint
ALTER TABLE "pagos" ALTER COLUMN "vereda_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "participaciones" ADD COLUMN "vereda_id" integer REFERENCES "veredas"("id");--> statement-breakpoint
UPDATE "participaciones" SET "vereda_id" = 1;--> statement-breakpoint
ALTER TABLE "participaciones" ALTER COLUMN "vereda_id" SET DEFAULT nullif(current_setting('app.vereda_id', true), '')::int;--> statement-breakpoint
ALTER TABLE "participaciones" ALTER COLUMN "vereda_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "periodos" ADD COLUMN "vereda_id" integer REFERENCES "veredas"("id");--> statement-breakpoint
UPDATE "periodos" SET "vereda_id" = 1;--> statement-breakpoint
ALTER TABLE "periodos" ALTER COLUMN "vereda_id" SET DEFAULT nullif(current_setting('app.vereda_id', true), '')::int;--> statement-breakpoint
ALTER TABLE "periodos" ALTER COLUMN "vereda_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "personas" ADD COLUMN "vereda_id" integer REFERENCES "veredas"("id");--> statement-breakpoint
UPDATE "personas" SET "vereda_id" = 1;--> statement-breakpoint
ALTER TABLE "personas" ALTER COLUMN "vereda_id" SET DEFAULT nullif(current_setting('app.vereda_id', true), '')::int;--> statement-breakpoint
ALTER TABLE "personas" ALTER COLUMN "vereda_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sectores" ADD COLUMN "vereda_id" integer REFERENCES "veredas"("id");--> statement-breakpoint
UPDATE "sectores" SET "vereda_id" = 1;--> statement-breakpoint
ALTER TABLE "sectores" ALTER COLUMN "vereda_id" SET DEFAULT nullif(current_setting('app.vereda_id', true), '')::int;--> statement-breakpoint
ALTER TABLE "sectores" ALTER COLUMN "vereda_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "suscriptores" ADD COLUMN "vereda_id" integer REFERENCES "veredas"("id");--> statement-breakpoint
UPDATE "suscriptores" SET "vereda_id" = 1;--> statement-breakpoint
ALTER TABLE "suscriptores" ALTER COLUMN "vereda_id" SET DEFAULT nullif(current_setting('app.vereda_id', true), '')::int;--> statement-breakpoint
ALTER TABLE "suscriptores" ALTER COLUMN "vereda_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tarifas" ADD COLUMN "vereda_id" integer REFERENCES "veredas"("id");--> statement-breakpoint
UPDATE "tarifas" SET "vereda_id" = 1;--> statement-breakpoint
ALTER TABLE "tarifas" ALTER COLUMN "vereda_id" SET DEFAULT nullif(current_setting('app.vereda_id', true), '')::int;--> statement-breakpoint
ALTER TABLE "tarifas" ALTER COLUMN "vereda_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tramos_acueducto" ADD COLUMN "vereda_id" integer REFERENCES "veredas"("id");--> statement-breakpoint
UPDATE "tramos_acueducto" SET "vereda_id" = 1;--> statement-breakpoint
ALTER TABLE "tramos_acueducto" ALTER COLUMN "vereda_id" SET DEFAULT nullif(current_setting('app.vereda_id', true), '')::int;--> statement-breakpoint
ALTER TABLE "tramos_acueducto" ALTER COLUMN "vereda_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "viviendas" ADD COLUMN "vereda_id" integer REFERENCES "veredas"("id");--> statement-breakpoint
UPDATE "viviendas" SET "vereda_id" = 1;--> statement-breakpoint
ALTER TABLE "viviendas" ALTER COLUMN "vereda_id" SET DEFAULT nullif(current_setting('app.vereda_id', true), '')::int;--> statement-breakpoint
ALTER TABLE "viviendas" ALTER COLUMN "vereda_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "adjuntos" ADD COLUMN "vereda_id" integer REFERENCES "veredas"("id");--> statement-breakpoint
UPDATE "adjuntos" SET "vereda_id" = 1;--> statement-breakpoint
ALTER TABLE "adjuntos" ALTER COLUMN "vereda_id" SET DEFAULT nullif(current_setting('app.vereda_id', true), '')::int;--> statement-breakpoint
ALTER TABLE "auditoria" ADD COLUMN "vereda_id" integer REFERENCES "veredas"("id");--> statement-breakpoint
UPDATE "auditoria" SET "vereda_id" = 1;--> statement-breakpoint
ALTER TABLE "auditoria" ALTER COLUMN "vereda_id" SET DEFAULT nullif(current_setting('app.vereda_id', true), '')::int;--> statement-breakpoint
ALTER TABLE "proyectos" ADD COLUMN "vereda_id" integer REFERENCES "veredas"("id");--> statement-breakpoint
UPDATE "proyectos" SET "vereda_id" = 1;--> statement-breakpoint
ALTER TABLE "proyectos" ALTER COLUMN "vereda_id" SET DEFAULT nullif(current_setting('app.vereda_id', true), '')::int;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "vereda_id" integer REFERENCES "veredas"("id");--> statement-breakpoint
UPDATE "usuarios" SET "vereda_id" = 1 WHERE "rol" <> 'superadmin';--> statement-breakpoint
ALTER TABLE "viviendas" ADD COLUMN "autoriza_alcaldia" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "pagos" DROP CONSTRAINT "pagos_numero_recibo_unique";--> statement-breakpoint
ALTER TABLE "sectores" DROP CONSTRAINT "sectores_nombre_unique";--> statement-breakpoint
ALTER TABLE "suscriptores" DROP CONSTRAINT "suscriptores_codigo_unique";--> statement-breakpoint
ALTER TABLE "tarifas" DROP CONSTRAINT "tarifas_vigente_desde_unique";--> statement-breakpoint
ALTER TABLE "viviendas" DROP CONSTRAINT "viviendas_codigo_unique";--> statement-breakpoint
DROP INDEX "periodos_anio_mes_uq";--> statement-breakpoint
ALTER TABLE "configuracion" DROP CONSTRAINT "configuracion_pkey";--> statement-breakpoint
CREATE UNIQUE INDEX "configuracion_vereda_clave_uq" ON "configuracion" USING btree ("vereda_id","clave");--> statement-breakpoint
CREATE UNIQUE INDEX "movimientos_vereda_numero_uq" ON "movimientos" USING btree ("vereda_id","numero");--> statement-breakpoint
CREATE UNIQUE INDEX "pagos_vereda_recibo_uq" ON "pagos" USING btree ("vereda_id","numero_recibo");--> statement-breakpoint
CREATE UNIQUE INDEX "sectores_vereda_nombre_uq" ON "sectores" USING btree ("vereda_id","nombre");--> statement-breakpoint
CREATE UNIQUE INDEX "suscriptores_vereda_codigo_uq" ON "suscriptores" USING btree ("vereda_id","codigo");--> statement-breakpoint
CREATE UNIQUE INDEX "tarifas_vereda_desde_uq" ON "tarifas" USING btree ("vereda_id","vigente_desde");--> statement-breakpoint
CREATE UNIQUE INDEX "viviendas_vereda_codigo_uq" ON "viviendas" USING btree ("vereda_id","codigo");--> statement-breakpoint
CREATE UNIQUE INDEX "periodos_anio_mes_uq" ON "periodos" USING btree ("vereda_id","anio","mes");--> statement-breakpoint
CREATE INDEX "viviendas_vereda_idx" ON "viviendas" USING btree ("vereda_id");--> statement-breakpoint
CREATE INDEX "personas_vereda_idx" ON "personas" USING btree ("vereda_id");--> statement-breakpoint
CREATE INDEX "movimientos_vereda_idx" ON "movimientos" USING btree ("vereda_id");--> statement-breakpoint
CREATE INDEX "adjuntos_vereda_idx" ON "adjuntos" USING btree ("vereda_id");--> statement-breakpoint
CREATE INDEX "auditoria_vereda_idx" ON "auditoria" USING btree ("vereda_id");--> statement-breakpoint
CREATE INDEX "participaciones_vereda_idx" ON "participaciones" USING btree ("vereda_id");--> statement-breakpoint
CREATE INDEX "novedades_vereda_idx" ON "novedades" USING btree ("vereda_id");--> statement-breakpoint
INSERT INTO contadores (vereda_id, clave, valor) VALUES
  (1, 'vivienda', coalesce((SELECT max(nullif(regexp_replace(codigo, '\D', '', 'g'), '')::int) FROM viviendas), 0)),
  (1, 'suscriptor', coalesce((SELECT max(nullif(regexp_replace(codigo, '\D', '', 'g'), '')::int) FROM suscriptores), 0)),
  (1, 'asiento', coalesce((SELECT max(numero) FROM movimientos), 0)),
  (1, 'recibo', coalesce((SELECT max(numero_recibo) FROM pagos), 0));--> statement-breakpoint
ALTER TABLE "viviendas" ALTER COLUMN "codigo" SET DEFAULT 'V-' || lpad(siguiente_numero('vivienda')::text, 4, '0');--> statement-breakpoint
ALTER TABLE "suscriptores" ALTER COLUMN "codigo" SET DEFAULT 'S-' || lpad(siguiente_numero('suscriptor')::text, 4, '0');--> statement-breakpoint
ALTER TABLE "movimientos" ALTER COLUMN "numero" SET DEFAULT siguiente_numero('asiento');--> statement-breakpoint
ALTER TABLE "pagos" ALTER COLUMN "numero_recibo" SET DEFAULT siguiente_numero('recibo');--> statement-breakpoint
DROP SEQUENCE IF EXISTS "public"."movimientos_numero_seq";--> statement-breakpoint
DROP SEQUENCE IF EXISTS "public"."pagos_numero_recibo_seq";--> statement-breakpoint
DROP SEQUENCE IF EXISTS "public"."suscriptor_codigo_seq";--> statement-breakpoint
DROP SEQUENCE IF EXISTS "public"."vivienda_codigo_seq";--> statement-breakpoint
-- La configuración (p. ej. módulo del acueducto) ahora es de cada vereda: la existente queda en Arango.--> statement-breakpoint
CREATE OR REPLACE FUNCTION participacion_vereda() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SELECT vereda_id INTO NEW.vereda_id FROM viviendas WHERE id = NEW.vivienda_id;
  RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER participacion_vereda BEFORE INSERT OR UPDATE OF vivienda_id ON participaciones
  FOR EACH ROW EXECUTE FUNCTION participacion_vereda();--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vereda_app') THEN CREATE ROLE vereda_app NOLOGIN; END IF;
END $$;--> statement-breakpoint
GRANT vereda_app TO CURRENT_USER;--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO vereda_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO vereda_app;--> statement-breakpoint
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO vereda_app;--> statement-breakpoint
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO vereda_app;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO vereda_app;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO vereda_app;--> statement-breakpoint
ALTER TABLE "actas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "leer" ON "actas" FOR SELECT USING (vereda_id = app_vereda() OR app_municipal());--> statement-breakpoint
CREATE POLICY "escribir" ON "actas" FOR ALL USING (vereda_id = app_vereda()) WITH CHECK (vereda_id = app_vereda());--> statement-breakpoint
ALTER TABLE "cargos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "leer" ON "cargos" FOR SELECT USING (vereda_id = app_vereda() OR app_municipal());--> statement-breakpoint
CREATE POLICY "escribir" ON "cargos" FOR ALL USING (vereda_id = app_vereda()) WITH CHECK (vereda_id = app_vereda());--> statement-breakpoint
ALTER TABLE "compras" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "leer" ON "compras" FOR SELECT USING (vereda_id = app_vereda() OR app_municipal());--> statement-breakpoint
CREATE POLICY "escribir" ON "compras" FOR ALL USING (vereda_id = app_vereda()) WITH CHECK (vereda_id = app_vereda());--> statement-breakpoint
ALTER TABLE "configuracion" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "leer" ON "configuracion" FOR SELECT USING (vereda_id = app_vereda() OR app_municipal());--> statement-breakpoint
CREATE POLICY "escribir" ON "configuracion" FOR ALL USING (vereda_id = app_vereda()) WITH CHECK (vereda_id = app_vereda());--> statement-breakpoint
ALTER TABLE "cuentas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "leer" ON "cuentas" FOR SELECT USING (vereda_id = app_vereda() OR app_municipal());--> statement-breakpoint
CREATE POLICY "escribir" ON "cuentas" FOR ALL USING (vereda_id = app_vereda()) WITH CHECK (vereda_id = app_vereda());--> statement-breakpoint
ALTER TABLE "documentos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "leer" ON "documentos" FOR SELECT USING (vereda_id = app_vereda() OR app_municipal());--> statement-breakpoint
CREATE POLICY "escribir" ON "documentos" FOR ALL USING (vereda_id = app_vereda()) WITH CHECK (vereda_id = app_vereda());--> statement-breakpoint
ALTER TABLE "elementos_acueducto" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "leer" ON "elementos_acueducto" FOR SELECT USING (vereda_id = app_vereda() OR app_municipal());--> statement-breakpoint
CREATE POLICY "escribir" ON "elementos_acueducto" FOR ALL USING (vereda_id = app_vereda()) WITH CHECK (vereda_id = app_vereda());--> statement-breakpoint
ALTER TABLE "inventario" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "leer" ON "inventario" FOR SELECT USING (vereda_id = app_vereda() OR app_municipal());--> statement-breakpoint
CREATE POLICY "escribir" ON "inventario" FOR ALL USING (vereda_id = app_vereda()) WITH CHECK (vereda_id = app_vereda());--> statement-breakpoint
ALTER TABLE "mantenimientos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "leer" ON "mantenimientos" FOR SELECT USING (vereda_id = app_vereda() OR app_municipal());--> statement-breakpoint
CREATE POLICY "escribir" ON "mantenimientos" FOR ALL USING (vereda_id = app_vereda()) WITH CHECK (vereda_id = app_vereda());--> statement-breakpoint
ALTER TABLE "materiales_usados" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "leer" ON "materiales_usados" FOR SELECT USING (vereda_id = app_vereda() OR app_municipal());--> statement-breakpoint
CREATE POLICY "escribir" ON "materiales_usados" FOR ALL USING (vereda_id = app_vereda()) WITH CHECK (vereda_id = app_vereda());--> statement-breakpoint
ALTER TABLE "movimientos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "leer" ON "movimientos" FOR SELECT USING (vereda_id = app_vereda() OR app_municipal());--> statement-breakpoint
CREATE POLICY "escribir" ON "movimientos" FOR ALL USING (vereda_id = app_vereda()) WITH CHECK (vereda_id = app_vereda());--> statement-breakpoint
ALTER TABLE "movimientos_historial" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "leer" ON "movimientos_historial" FOR SELECT USING (vereda_id = app_vereda() OR app_municipal());--> statement-breakpoint
CREATE POLICY "escribir" ON "movimientos_historial" FOR ALL USING (vereda_id = app_vereda()) WITH CHECK (vereda_id = app_vereda());--> statement-breakpoint
ALTER TABLE "novedades" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "leer" ON "novedades" FOR SELECT USING (vereda_id = app_vereda() OR app_municipal());--> statement-breakpoint
CREATE POLICY "escribir" ON "novedades" FOR ALL USING (vereda_id = app_vereda()) WITH CHECK (vereda_id = app_vereda());--> statement-breakpoint
ALTER TABLE "pagos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "leer" ON "pagos" FOR SELECT USING (vereda_id = app_vereda() OR app_municipal());--> statement-breakpoint
CREATE POLICY "escribir" ON "pagos" FOR ALL USING (vereda_id = app_vereda()) WITH CHECK (vereda_id = app_vereda());--> statement-breakpoint
ALTER TABLE "periodos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "leer" ON "periodos" FOR SELECT USING (vereda_id = app_vereda() OR app_municipal());--> statement-breakpoint
CREATE POLICY "escribir" ON "periodos" FOR ALL USING (vereda_id = app_vereda()) WITH CHECK (vereda_id = app_vereda());--> statement-breakpoint
ALTER TABLE "personas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "leer" ON "personas" FOR SELECT USING (vereda_id = app_vereda() OR app_municipal());--> statement-breakpoint
CREATE POLICY "escribir" ON "personas" FOR ALL USING (vereda_id = app_vereda()) WITH CHECK (vereda_id = app_vereda());--> statement-breakpoint
ALTER TABLE "sectores" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "leer" ON "sectores" FOR SELECT USING (vereda_id = app_vereda() OR app_municipal());--> statement-breakpoint
CREATE POLICY "escribir" ON "sectores" FOR ALL USING (vereda_id = app_vereda()) WITH CHECK (vereda_id = app_vereda());--> statement-breakpoint
ALTER TABLE "suscriptores" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "leer" ON "suscriptores" FOR SELECT USING (vereda_id = app_vereda() OR app_municipal());--> statement-breakpoint
CREATE POLICY "escribir" ON "suscriptores" FOR ALL USING (vereda_id = app_vereda()) WITH CHECK (vereda_id = app_vereda());--> statement-breakpoint
ALTER TABLE "tarifas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "leer" ON "tarifas" FOR SELECT USING (vereda_id = app_vereda() OR app_municipal());--> statement-breakpoint
CREATE POLICY "escribir" ON "tarifas" FOR ALL USING (vereda_id = app_vereda()) WITH CHECK (vereda_id = app_vereda());--> statement-breakpoint
ALTER TABLE "tramos_acueducto" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "leer" ON "tramos_acueducto" FOR SELECT USING (vereda_id = app_vereda() OR app_municipal());--> statement-breakpoint
CREATE POLICY "escribir" ON "tramos_acueducto" FOR ALL USING (vereda_id = app_vereda()) WITH CHECK (vereda_id = app_vereda());--> statement-breakpoint
ALTER TABLE "viviendas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "leer" ON "viviendas" FOR SELECT USING (vereda_id = app_vereda() OR app_municipal());--> statement-breakpoint
CREATE POLICY "escribir" ON "viviendas" FOR ALL USING (vereda_id = app_vereda()) WITH CHECK (vereda_id = app_vereda());--> statement-breakpoint
-- Proyectos: de una vereda, o de la alcaldía (vereda_id vacío) visibles para todas
ALTER TABLE "proyectos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "leer" ON "proyectos" FOR SELECT USING (vereda_id = app_vereda() OR vereda_id IS NULL OR app_municipal());--> statement-breakpoint
CREATE POLICY "escribir" ON "proyectos" FOR ALL USING (vereda_id = app_vereda() OR (app_municipal() AND vereda_id IS NULL))
  WITH CHECK (vereda_id = app_vereda() OR (app_municipal() AND vereda_id IS NULL));--> statement-breakpoint
-- Participaciones (familias beneficiadas): la vereda de la familia, o la alcaldía para cualquiera
ALTER TABLE "participaciones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "leer" ON "participaciones" FOR SELECT USING (vereda_id = app_vereda() OR app_municipal());--> statement-breakpoint
CREATE POLICY "escribir" ON "participaciones" FOR ALL USING (vereda_id = app_vereda() OR app_municipal())
  WITH CHECK (vereda_id = app_vereda() OR app_municipal());--> statement-breakpoint
-- Adjuntos: de la vereda, o de la alcaldía (vereda_id vacío)
ALTER TABLE "adjuntos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "leer" ON "adjuntos" FOR SELECT USING (vereda_id = app_vereda() OR vereda_id IS NULL OR app_municipal());--> statement-breakpoint
CREATE POLICY "escribir" ON "adjuntos" FOR ALL USING (vereda_id = app_vereda() OR (app_municipal() AND vereda_id IS NULL))
  WITH CHECK (vereda_id = app_vereda() OR (app_municipal() AND vereda_id IS NULL));--> statement-breakpoint
-- Bitácora: cualquiera registra; nadie modifica ni borra; cada vereda lee la suya
ALTER TABLE "auditoria" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "registrar" ON "auditoria" FOR INSERT WITH CHECK (vereda_id IS NULL OR vereda_id = app_vereda() OR app_municipal());--> statement-breakpoint
CREATE POLICY "leer" ON "auditoria" FOR SELECT USING (vereda_id = app_vereda() OR app_municipal());
--> statement-breakpoint
-- Cada presidencia gestiona los usuarios de su vereda
UPDATE "usuarios" SET "permisos" = jsonb_set("permisos", '{usuarios}', '["ver","crear","editar"]'::jsonb) WHERE "rol" = 'admin' AND NOT ("permisos" ? 'usuarios');
