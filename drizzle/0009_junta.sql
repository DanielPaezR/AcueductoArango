ALTER TYPE "public"."rol" ADD VALUE 'consulta';--> statement-breakpoint
CREATE TABLE "actas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero" varchar(20) NOT NULL,
	"tipo" varchar(30) DEFAULT 'asamblea' NOT NULL,
	"fecha" date NOT NULL,
	"hora_inicio" varchar(5),
	"hora_fin" varchar(5),
	"lugar" varchar(160),
	"asistentes" integer,
	"quorum" boolean,
	"orden_del_dia" text,
	"desarrollo" text,
	"decisiones" text,
	"presidente" varchar(120),
	"secretario" varchar(120),
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "configuracion" (
	"clave" varchar(60) PRIMARY KEY NOT NULL,
	"valor" jsonb NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titulo" varchar(160) NOT NULL,
	"categoria" varchar(30) DEFAULT 'otro' NOT NULL,
	"descripcion" text,
	"fecha_documento" date,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "inventario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(20),
	"nombre" varchar(160) NOT NULL,
	"descripcion" text,
	"cantidad" integer DEFAULT 1 NOT NULL,
	"estado" varchar(20) DEFAULT 'bueno' NOT NULL,
	"ubicacion" varchar(160),
	"fecha_adquisicion" date,
	"valor" numeric(14, 2),
	"procedencia" varchar(120),
	"observaciones" text,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "movimientos_historial" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"movimiento_id" uuid NOT NULL,
	"accion" varchar(12) NOT NULL,
	"usuario_id" uuid,
	"usuario_nombre" varchar(120),
	"cargo" varchar(60),
	"antes" jsonb,
	"despues" jsonb,
	"motivo" text,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "novedades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titulo" varchar(160) NOT NULL,
	"descripcion" text,
	"categoria" varchar(30) DEFAULT 'otro' NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"estado" varchar(20) DEFAULT 'pendiente' NOT NULL,
	"fecha_realizado" date,
	"archivado" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "movimientos" ADD COLUMN "numero" serial NOT NULL;--> statement-breakpoint
ALTER TABLE "movimientos" ADD COLUMN "comprobante" varchar(40);--> statement-breakpoint
ALTER TABLE "movimientos" ADD COLUMN "actualizado_por" uuid;--> statement-breakpoint
ALTER TABLE "movimientos" ADD COLUMN "actualizado_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "actas" ADD CONSTRAINT "actas_created_by_usuarios_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actas" ADD CONSTRAINT "actas_updated_by_usuarios_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "configuracion" ADD CONSTRAINT "configuracion_updated_by_usuarios_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_created_by_usuarios_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventario" ADD CONSTRAINT "inventario_created_by_usuarios_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventario" ADD CONSTRAINT "inventario_updated_by_usuarios_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_historial" ADD CONSTRAINT "movimientos_historial_movimiento_id_movimientos_id_fk" FOREIGN KEY ("movimiento_id") REFERENCES "public"."movimientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_historial" ADD CONSTRAINT "movimientos_historial_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "novedades" ADD CONSTRAINT "novedades_created_by_usuarios_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "novedades" ADD CONSTRAINT "novedades_updated_by_usuarios_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mov_historial_mov_idx" ON "movimientos_historial" USING btree ("movimiento_id");--> statement-breakpoint
CREATE INDEX "novedades_archivado_idx" ON "novedades" USING btree ("archivado");--> statement-breakpoint
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_actualizado_por_usuarios_id_fk" FOREIGN KEY ("actualizado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Numerar los asientos existentes en orden cronológico
UPDATE "movimientos" m SET "numero" = s.rn FROM (SELECT id, row_number() OVER (ORDER BY fecha, created_at) AS rn FROM "movimientos") s WHERE m.id = s.id;--> statement-breakpoint
SELECT setval(pg_get_serial_sequence('movimientos', 'numero'), GREATEST((SELECT COALESCE(MAX("numero"), 0) FROM "movimientos"), 1), (SELECT COUNT(*) > 0 FROM "movimientos"));--> statement-breakpoint
-- Historial inicial de los movimientos existentes
INSERT INTO "movimientos_historial" ("movimiento_id", "accion", "usuario_id", "cargo", "despues", "fecha")
SELECT m.id, 'crear', m.registrado_por, m.cargo_registro, jsonb_build_object('fecha', m.fecha, 'concepto', m.concepto, 'valor', m.valor, 'tipo', m.tipo), m.created_at FROM "movimientos" m;--> statement-breakpoint
-- Permisos de los módulos nuevos para los usuarios existentes, según su rol
UPDATE "usuarios" SET "permisos" = "permisos" || '{"poblacion":["ver"],"novedades":["ver","crear","editar","eliminar"],"libro_inventario":["ver","crear","editar","eliminar"],"libro_actas":["ver","crear","editar","eliminar"],"libro_contable":["ver","crear","editar"],"documentos":["ver","crear","editar","eliminar"]}'::jsonb WHERE "rol" = 'admin';--> statement-breakpoint
UPDATE "usuarios" SET "permisos" = "permisos" || '{"libro_contable":["ver","crear","editar"],"documentos":["ver"]}'::jsonb WHERE "rol" = 'tesorero';--> statement-breakpoint
UPDATE "usuarios" SET "permisos" = "permisos" || '{"poblacion":["ver"],"novedades":["ver","crear"],"documentos":["ver"]}'::jsonb WHERE "rol" = 'encuestador';--> statement-breakpoint
-- El acueducto se administra aparte por ahora: el módulo queda apagado (se puede activar en Configuración)
INSERT INTO "configuracion" ("clave", "valor") VALUES ('modulos', '{"acueducto": false}'::jsonb) ON CONFLICT DO NOTHING;
