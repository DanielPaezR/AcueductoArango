ALTER TABLE "personas" ADD COLUMN "edad_reportada" integer;--> statement-breakpoint
ALTER TABLE "personas" ADD COLUMN "edad_reportada_en" date;--> statement-breakpoint
ALTER TABLE "viviendas" ADD COLUMN "tiene_matricula" boolean;--> statement-breakpoint
ALTER TABLE "viviendas" ADD COLUMN "numero_matricula" varchar(30);--> statement-breakpoint
ALTER TABLE "viviendas" ADD COLUMN "titular_matricula_nombre" varchar(160);--> statement-breakpoint
ALTER TABLE "viviendas" ADD COLUMN "titular_matricula_telefono" varchar(30);