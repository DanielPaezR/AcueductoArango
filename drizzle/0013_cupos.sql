CREATE TABLE "proyecto_cupos" (
	"proyecto_id" uuid NOT NULL,
	"vereda_id" integer NOT NULL,
	"cupo" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "proyectos" ADD COLUMN "cupo_familias" integer;--> statement-breakpoint
ALTER TABLE "proyecto_cupos" ADD CONSTRAINT "proyecto_cupos_proyecto_id_proyectos_id_fk" FOREIGN KEY ("proyecto_id") REFERENCES "public"."proyectos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proyecto_cupos" ADD CONSTRAINT "proyecto_cupos_vereda_id_veredas_id_fk" FOREIGN KEY ("vereda_id") REFERENCES "public"."veredas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "proyecto_cupos_pk" ON "proyecto_cupos" USING btree ("proyecto_id","vereda_id");--> statement-breakpoint
-- Cupos: la vereda lee el suyo; solo la alcaldía los define
ALTER TABLE "proyecto_cupos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "leer" ON "proyecto_cupos" FOR SELECT USING (vereda_id = app_vereda() OR app_municipal());--> statement-breakpoint
CREATE POLICY "escribir" ON "proyecto_cupos" FOR ALL USING (app_municipal()) WITH CHECK (app_municipal());--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "proyecto_cupos" TO vereda_app;
