CREATE SEQUENCE "public"."suscriptor_codigo_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "cuentas" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(80) NOT NULL,
	"tipo" varchar(20) DEFAULT 'banco' NOT NULL,
	"entidad" varchar(60),
	"ultimos_digitos" varchar(6),
	"saldo_inicial" numeric(14, 2) DEFAULT '0' NOT NULL,
	"fecha_saldo_inicial" date NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movimientos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cuenta_id" integer NOT NULL,
	"tipo" varchar(10) NOT NULL,
	"categoria" varchar(40) NOT NULL,
	"concepto" varchar(300) NOT NULL,
	"valor" numeric(14, 2) NOT NULL,
	"fecha" date NOT NULL,
	"estado" varchar(12) DEFAULT 'pendiente' NOT NULL,
	"origen" varchar(10) DEFAULT 'manual' NOT NULL,
	"pago_id" uuid,
	"registrado_por" uuid,
	"cargo_registro" varchar(60),
	"aprobado_por" uuid,
	"cargo_aprobacion" varchar(60),
	"aprobado_en" timestamp with time zone,
	"motivo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "suscriptores" ALTER COLUMN "codigo" SET DATA TYPE varchar(30);--> statement-breakpoint
ALTER TABLE "suscriptores" ALTER COLUMN "codigo" SET DEFAULT 'S-' || lpad(nextval('suscriptor_codigo_seq')::text, 4, '0');--> statement-breakpoint
ALTER TABLE "pagos" ADD COLUMN "cuenta_id" integer;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "cargo" varchar(60);--> statement-breakpoint
ALTER TABLE "cuentas" ADD CONSTRAINT "cuentas_created_by_usuarios_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_cuenta_id_cuentas_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "public"."cuentas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_pago_id_pagos_id_fk" FOREIGN KEY ("pago_id") REFERENCES "public"."pagos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_registrado_por_usuarios_id_fk" FOREIGN KEY ("registrado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_aprobado_por_usuarios_id_fk" FOREIGN KEY ("aprobado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "movimientos_cuenta_idx" ON "movimientos" USING btree ("cuenta_id");--> statement-breakpoint
CREATE INDEX "movimientos_fecha_idx" ON "movimientos" USING btree ("fecha");--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_cuenta_id_cuentas_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "public"."cuentas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
UPDATE "usuarios" SET "permisos" = "permisos" || '{"tesoreria":["ver","crear","editar","aprobar"]}'::jsonb WHERE "rol" = 'admin' AND NOT ("permisos" ? 'tesoreria');--> statement-breakpoint
UPDATE "usuarios" SET "permisos" = "permisos" || '{"tesoreria":["ver","crear"]}'::jsonb WHERE "rol" = 'tesorero' AND NOT ("permisos" ? 'tesoreria');
