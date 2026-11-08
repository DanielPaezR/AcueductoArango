# JAC Arango — Sistema de información de la JAC y el acueducto

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
- [x] **1. Censo**: viviendas, personas, sectores, mapa satelital, captura GPS, modo offline (PWA)
- [ ] **2. Acueducto**: elementos de red, tuberías, mantenimientos y compras (Cloudinary)
- [x] **3. Cobros y tesorería**: suscriptores desde el censo, tarifas con historial, mensualidad, pagos, estado de cuenta, cuentas y movimientos con aprobación, página pública `/transparencia`
- [x] **2. Red del acueducto y fontanero**: puntos (bocatoma, tanques, válvulas…) y tuberías dibujadas en el mapa, arreglos con materiales, mano de obra, factura y fotos antes/después, todo sin señal; envío de facturas a tesorería
- [ ] Recibos en PDF / impresión
- [ ] **4. Ayudas/proyectos y reportes** (Excel)
- [ ] **5. Portal del suscriptor**

## Modo offline (cómo funciona)
- La app es instalable (PWA). El service worker (`public/sw.js`) guarda las páginas visitadas, los
  archivos de la app y las teselas del mapa que se hayan visto con señal.
- Al registrar una vivienda, el formulario la guarda primero en el teléfono (IndexedDB, `src/lib/offline/`)
  con un UUID generado en el celular, y luego intenta subirla a `/api/sync/vivienda` (idempotente).
- Sin señal queda en "Pendientes"; se sube sola al volver la conexión (o con "Subir ahora").
- Las fotos se comprimen en el teléfono (~1600 px) y se suben a Cloudinary vía `/api/adjuntos`.
- Requisito: abrir la app con señal al menos una vez (con sesión iniciada) para que quede guardada.

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
