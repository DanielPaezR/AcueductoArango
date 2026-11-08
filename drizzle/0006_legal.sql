ALTER TABLE "adjuntos" ADD COLUMN "privado" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "terminos_version" varchar(20);--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "terminos_aceptados_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "viviendas" ADD COLUMN "autorizacion_documento" varchar(30);--> statement-breakpoint
ALTER TABLE "viviendas" ADD COLUMN "autorizacion_medio" varchar(10);--> statement-breakpoint
ALTER TABLE "viviendas" ADD COLUMN "autorizacion_version" varchar(20);--> statement-breakpoint
ALTER TABLE "viviendas" ADD COLUMN "datos_suprimidos_en" timestamp with time zone;