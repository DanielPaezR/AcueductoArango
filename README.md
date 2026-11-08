# Vereda — Sistema de Información JAC y Acueducto

Censo georreferenciado de viviendas y personas de la vereda, mapa satelital, registro de
ayudas y proyectos, mapa de la red del acueducto, mantenimientos (fontanero) y facturación
de la tarifa fija mensual.

## Stack
- **Next.js 16** (App Router, Server Actions) + TypeScript + Tailwind v4
- **PostgreSQL** + **Drizzle ORM** (migraciones SQL versionadas en `drizzle/`)
- Sesiones con JWT firmado en cookie httpOnly (`jose`), contraseñas con `bcryptjs`
- Mapas: Leaflet + Esri World Imagery (Fase 1)
- Fotos y facturas: Cloudinary (Fase 2)
- Offline: PWA + IndexedDB con cola de sincronización (Fase 1)

## Roles
| Rol | Acceso por defecto |
|---|---|
| Superadmin | Todo. Crea usuarios, cambia roles y ajusta permisos por sección |
| Admin | Censo, mapas, ayudas, acueducto, mantenimientos, suscriptores, facturación, reportes |
| Fontanero | Mapa del acueducto (registrar bocatoma, tanques, válvulas, tuberías) y mantenimientos con fotos y facturas de materiales |
| Encuestador | Registrar viviendas y personas en campo |
| Tesorero | Facturación y pagos |
| Suscriptor | (Pendiente) portal con su estado de cuenta |

Los permisos son una matriz **sección × acción** (ver/crear/editar/eliminar) por usuario,
inicializada desde la plantilla del rol (`src/lib/permisos.ts`).

## Fases
- [x] **0. Base**: login, roles/permisos, usuarios, auditoría, despliegue
- [ ] **1. Censo**: viviendas, personas, mapa satelital, captura GPS offline
- [ ] **2. Acueducto**: elementos de red, tuberías, mantenimientos y compras (Cloudinary)
- [ ] **3. Facturación**: tarifas históricas, generación mensual, pagos, estados de cuenta, recibos PDF
- [ ] **4. Ayudas/proyectos y reportes** (Excel)
- [ ] **5. Portal del suscriptor**

## Desarrollo local
```bash
cp .env.example .env        # y ajusta valores
npm install
npm run db:migrate
npm run db:seed             # crea el superadmin inicial
npm run dev
```
Al cambiar `src/db/schema.ts`: `npm run db:generate` y luego `npm run db:migrate`.

## Despliegue en Railway
1. Servicio **PostgreSQL** + servicio desde este repo.
2. Variables del servicio web: `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `SESSION_SECRET`,
   `SEED_SUPERADMIN_USERNAME`, `SEED_SUPERADMIN_PASSWORD`, `SEED_SUPERADMIN_NOMBRE`, y las de Cloudinary.
3. `npm start` aplica migraciones, crea el superadmin si no existe e inicia el servidor.
   Healthcheck: `/api/health`.

## Datos personales
La app registra la autorización de tratamiento de datos (Ley 1581 de 2012) por vivienda.
Todo cambio queda en la tabla `auditoria`; los registros se borran de forma lógica (`deleted_at`).
