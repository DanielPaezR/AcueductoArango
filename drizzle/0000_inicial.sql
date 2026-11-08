CREATE TYPE "public"."rol" AS ENUM('superadmin', 'admin', 'fontanero', 'encuestador', 'tesorero', 'suscriptor');--> statement-breakpoint
CREATE TABLE "adjuntos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entidad" varchar(30) NOT NULL,
	"entidad_id" uuid NOT NULL,
	"tipo" varchar(20) DEFAULT 'foto' NOT NULL,
	"url" text NOT NULL,
	"public_id" text NOT NULL,
	"descripcion" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "auditoria" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"usuario_id" uuid,
	"accion" varchar(30) NOT NULL,
	"entidad" varchar(30) NOT NULL,
	"entidad_id" text,
	"datos" jsonb,
	"ip" varchar(60),
	"fecha" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cargos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"suscriptor_id" uuid NOT NULL,
	"periodo_id" integer,
	"tipo" varchar(20) NOT NULL,
	"concepto" varchar(160) NOT NULL,
	"valor" numeric(14, 2) NOT NULL,
	"fecha" date NOT NULL,
	"anulado" boolean DEFAULT false NOT NULL,
	"motivo_anulacion" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compras" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mantenimiento_id" uuid,
	"proveedor" varchar(120),
	"numero_factura" varchar(40),
	"fecha" date NOT NULL,
	"total" numeric(14, 2) NOT NULL,
	"observaciones" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "elementos_acueducto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" varchar(30) NOT NULL,
	"nombre" varchar(120),
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"precision_m" double precision,
	"altitud_m" double precision,
	"estado" varchar(20) DEFAULT 'operativo' NOT NULL,
	"datos" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"foto_principal_url" text,
	"observaciones" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mantenimientos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" varchar(30) NOT NULL,
	"titulo" varchar(160) NOT NULL,
	"descripcion" text,
	"elemento_id" uuid,
	"tramo_id" uuid,
	"vivienda_id" uuid,
	"lat" double precision,
	"lng" double precision,
	"fecha_reporte" date,
	"fecha_ejecucion" date,
	"estado" varchar(20) DEFAULT 'reportado' NOT NULL,
	"prioridad" varchar(10) DEFAULT 'media' NOT NULL,
	"responsable_id" uuid,
	"costo_mano_obra" numeric(14, 2) DEFAULT '0' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "materiales_usados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mantenimiento_id" uuid NOT NULL,
	"compra_id" uuid,
	"descripcion" varchar(160) NOT NULL,
	"cantidad" numeric(10, 2) NOT NULL,
	"unidad" varchar(20),
	"valor_unitario" numeric(14, 2)
);
--> statement-breakpoint
CREATE TABLE "pagos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"suscriptor_id" uuid NOT NULL,
	"numero_recibo" serial NOT NULL,
	"fecha" date NOT NULL,
	"valor" numeric(14, 2) NOT NULL,
	"medio" varchar(20) DEFAULT 'efectivo' NOT NULL,
	"referencia" varchar(80),
	"observaciones" text,
	"anulado" boolean DEFAULT false NOT NULL,
	"motivo_anulacion" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pagos_numero_recibo_unique" UNIQUE("numero_recibo")
);
--> statement-breakpoint
CREATE TABLE "participaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proyecto_id" uuid NOT NULL,
	"vivienda_id" uuid,
	"persona_id" uuid,
	"fecha" date,
	"detalle" text,
	"cantidad" numeric(10, 2),
	"valor_estimado" numeric(14, 2),
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "periodos" (
	"id" serial PRIMARY KEY NOT NULL,
	"anio" integer NOT NULL,
	"mes" integer NOT NULL,
	"fecha_emision" date NOT NULL,
	"fecha_vencimiento" date NOT NULL,
	"tarifa_id" integer NOT NULL,
	"estado" varchar(10) DEFAULT 'abierto' NOT NULL,
	"generado_por" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vivienda_id" uuid NOT NULL,
	"nombres" varchar(100) NOT NULL,
	"apellidos" varchar(100),
	"tipo_documento" varchar(10),
	"numero_documento" varchar(30),
	"fecha_nacimiento" date,
	"sexo" varchar(10),
	"parentesco" varchar(30),
	"es_jefe_hogar" boolean DEFAULT false NOT NULL,
	"telefono" varchar(30),
	"escolaridad" varchar(40),
	"estudia_actualmente" boolean,
	"ocupacion" varchar(80),
	"regimen_salud" varchar(20),
	"eps" varchar(60),
	"sisben_grupo" varchar(10),
	"discapacidad" boolean DEFAULT false NOT NULL,
	"tipo_discapacidad" varchar(80),
	"grupo_etnico" varchar(40),
	"victima_conflicto" boolean,
	"afiliado_jac" boolean DEFAULT false NOT NULL,
	"observaciones" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "proyectos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(160) NOT NULL,
	"tipo" varchar(30) NOT NULL,
	"descripcion" text,
	"entidad" varchar(120),
	"fecha_inicio" date,
	"fecha_fin" date,
	"estado" varchar(20) DEFAULT 'activo' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sectores" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" text,
	"color" varchar(9),
	CONSTRAINT "sectores_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "suscriptores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(20) NOT NULL,
	"vivienda_id" uuid NOT NULL,
	"titular_persona_id" uuid,
	"titular_nombre" varchar(160) NOT NULL,
	"fecha_conexion" date,
	"estado" varchar(20) DEFAULT 'activo' NOT NULL,
	"exento" boolean DEFAULT false NOT NULL,
	"observaciones" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "suscriptores_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "tarifas" (
	"id" serial PRIMARY KEY NOT NULL,
	"valor_mensual" numeric(14, 2) NOT NULL,
	"vigente_desde" date NOT NULL,
	"acta_aprobacion" varchar(120),
	"notas" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tarifas_vigente_desde_unique" UNIQUE("vigente_desde")
);
--> statement-breakpoint
CREATE TABLE "tramos_acueducto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(120),
	"tipo" varchar(20) DEFAULT 'distribucion' NOT NULL,
	"coordenadas" jsonb NOT NULL,
	"diametro_pulg" numeric(5, 2),
	"material" varchar(30),
	"longitud_m" double precision,
	"anio_instalacion" integer,
	"estado" varchar(20) DEFAULT 'operativo' NOT NULL,
	"observaciones" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(120) NOT NULL,
	"username" varchar(60) NOT NULL,
	"email" varchar(160),
	"telefono" varchar(30),
	"password_hash" text NOT NULL,
	"rol" "rol" NOT NULL,
	"permisos" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"debe_cambiar_password" boolean DEFAULT true NOT NULL,
	"suscriptor_id" uuid,
	"ultimo_acceso" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "viviendas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(20),
	"sector_id" integer,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"precision_m" double precision,
	"altitud_m" double precision,
	"ubicacion_ajustada" boolean DEFAULT false NOT NULL,
	"referencia" text,
	"nombre_predio" varchar(120),
	"tenencia" varchar(30),
	"material_paredes" varchar(40),
	"material_piso" varchar(40),
	"num_cuartos" integer,
	"energia" boolean,
	"gas" varchar(30),
	"internet" boolean,
	"senal_celular" varchar(30),
	"saneamiento" varchar(40),
	"manejo_basuras" varchar(40),
	"actividad_economica" text,
	"usa_acueducto" boolean DEFAULT false NOT NULL,
	"otra_fuente_agua" varchar(60),
	"autorizacion_datos" boolean DEFAULT false NOT NULL,
	"autorizacion_fecha" timestamp with time zone,
	"autorizacion_nombre" varchar(120),
	"estado" varchar(20) DEFAULT 'habitada' NOT NULL,
	"observaciones" text,
	"foto_principal_url" text,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "viviendas_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
ALTER TABLE "adjuntos" ADD CONSTRAINT "adjuntos_created_by_usuarios_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cargos" ADD CONSTRAINT "cargos_suscriptor_id_suscriptores_id_fk" FOREIGN KEY ("suscriptor_id") REFERENCES "public"."suscriptores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cargos" ADD CONSTRAINT "cargos_periodo_id_periodos_id_fk" FOREIGN KEY ("periodo_id") REFERENCES "public"."periodos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cargos" ADD CONSTRAINT "cargos_created_by_usuarios_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compras" ADD CONSTRAINT "compras_mantenimiento_id_mantenimientos_id_fk" FOREIGN KEY ("mantenimiento_id") REFERENCES "public"."mantenimientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compras" ADD CONSTRAINT "compras_created_by_usuarios_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elementos_acueducto" ADD CONSTRAINT "elementos_acueducto_created_by_usuarios_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mantenimientos" ADD CONSTRAINT "mantenimientos_elemento_id_elementos_acueducto_id_fk" FOREIGN KEY ("elemento_id") REFERENCES "public"."elementos_acueducto"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mantenimientos" ADD CONSTRAINT "mantenimientos_tramo_id_tramos_acueducto_id_fk" FOREIGN KEY ("tramo_id") REFERENCES "public"."tramos_acueducto"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mantenimientos" ADD CONSTRAINT "mantenimientos_vivienda_id_viviendas_id_fk" FOREIGN KEY ("vivienda_id") REFERENCES "public"."viviendas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mantenimientos" ADD CONSTRAINT "mantenimientos_responsable_id_usuarios_id_fk" FOREIGN KEY ("responsable_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mantenimientos" ADD CONSTRAINT "mantenimientos_created_by_usuarios_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materiales_usados" ADD CONSTRAINT "materiales_usados_mantenimiento_id_mantenimientos_id_fk" FOREIGN KEY ("mantenimiento_id") REFERENCES "public"."mantenimientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materiales_usados" ADD CONSTRAINT "materiales_usados_compra_id_compras_id_fk" FOREIGN KEY ("compra_id") REFERENCES "public"."compras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_suscriptor_id_suscriptores_id_fk" FOREIGN KEY ("suscriptor_id") REFERENCES "public"."suscriptores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_created_by_usuarios_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participaciones" ADD CONSTRAINT "participaciones_proyecto_id_proyectos_id_fk" FOREIGN KEY ("proyecto_id") REFERENCES "public"."proyectos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participaciones" ADD CONSTRAINT "participaciones_vivienda_id_viviendas_id_fk" FOREIGN KEY ("vivienda_id") REFERENCES "public"."viviendas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participaciones" ADD CONSTRAINT "participaciones_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participaciones" ADD CONSTRAINT "participaciones_created_by_usuarios_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "periodos" ADD CONSTRAINT "periodos_tarifa_id_tarifas_id_fk" FOREIGN KEY ("tarifa_id") REFERENCES "public"."tarifas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "periodos" ADD CONSTRAINT "periodos_generado_por_usuarios_id_fk" FOREIGN KEY ("generado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personas" ADD CONSTRAINT "personas_vivienda_id_viviendas_id_fk" FOREIGN KEY ("vivienda_id") REFERENCES "public"."viviendas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proyectos" ADD CONSTRAINT "proyectos_created_by_usuarios_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suscriptores" ADD CONSTRAINT "suscriptores_vivienda_id_viviendas_id_fk" FOREIGN KEY ("vivienda_id") REFERENCES "public"."viviendas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suscriptores" ADD CONSTRAINT "suscriptores_titular_persona_id_personas_id_fk" FOREIGN KEY ("titular_persona_id") REFERENCES "public"."personas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarifas" ADD CONSTRAINT "tarifas_created_by_usuarios_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tramos_acueducto" ADD CONSTRAINT "tramos_acueducto_created_by_usuarios_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viviendas" ADD CONSTRAINT "viviendas_sector_id_sectores_id_fk" FOREIGN KEY ("sector_id") REFERENCES "public"."sectores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viviendas" ADD CONSTRAINT "viviendas_created_by_usuarios_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viviendas" ADD CONSTRAINT "viviendas_updated_by_usuarios_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "adjuntos_entidad_idx" ON "adjuntos" USING btree ("entidad","entidad_id");--> statement-breakpoint
CREATE INDEX "auditoria_entidad_idx" ON "auditoria" USING btree ("entidad","entidad_id");--> statement-breakpoint
CREATE INDEX "cargos_suscriptor_idx" ON "cargos" USING btree ("suscriptor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cargos_mensualidad_uq" ON "cargos" USING btree ("suscriptor_id","periodo_id","tipo");--> statement-breakpoint
CREATE INDEX "mantenimientos_elemento_idx" ON "mantenimientos" USING btree ("elemento_id");--> statement-breakpoint
CREATE INDEX "pagos_suscriptor_idx" ON "pagos" USING btree ("suscriptor_id");--> statement-breakpoint
CREATE INDEX "participaciones_proyecto_idx" ON "participaciones" USING btree ("proyecto_id");--> statement-breakpoint
CREATE UNIQUE INDEX "periodos_anio_mes_uq" ON "periodos" USING btree ("anio","mes");--> statement-breakpoint
CREATE INDEX "personas_vivienda_idx" ON "personas" USING btree ("vivienda_id");--> statement-breakpoint
CREATE INDEX "personas_documento_idx" ON "personas" USING btree ("numero_documento");--> statement-breakpoint
CREATE INDEX "viviendas_sector_idx" ON "viviendas" USING btree ("sector_id");