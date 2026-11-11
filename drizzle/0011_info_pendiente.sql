ALTER TABLE "viviendas" ADD COLUMN "info_pendiente" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "viviendas" ADD COLUMN "motivo_pendiente" varchar(20);