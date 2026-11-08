# JAC Arango

Sistema de información de la **Junta de Acción Comunal de la vereda Arango** (Concepción, Antioquia):
censo georreferenciado de las viviendas y sus familias, red del acueducto comunitario, mantenimientos del
fontanero, cobros y tesorería del acueducto, ayudas y proyectos, reportes, y una **página pública de
transparencia** donde cualquier persona ve las cuentas y cada suscriptor consulta su estado de cuenta.

- Producción: <https://veredaarango-production.up.railway.app>
- Página pública: `/transparencia` · Política de datos: `/privacidad` · Términos: `/terminos`

---

## Contenido

1. [Qué hace](#1-qué-hace)
2. [Roles y permisos](#2-roles-y-permisos)
3. [Guía de uso por rol](#3-guía-de-uso-por-rol)
4. [Datos personales y cumplimiento legal](#4-datos-personales-y-cumplimiento-legal)
5. [Arquitectura](#5-arquitectura)
6. [Despliegue en Railway](#6-despliegue-en-railway)
7. [Copias de seguridad](#7-copias-de-seguridad)
8. [Seguridad](#8-seguridad)
9. [Desarrollo local](#9-desarrollo-local)
10. [Solución de problemas](#10-solución-de-problemas)

---

## 1. Qué hace

| Módulo | Ruta | Descripción |
|---|---|---|
| Inicio | `/` | Avance del censo, últimas visitas, arreglos pendientes y accesos rápidos según el rol. |
| Viviendas | `/viviendas` | Visita casa a casa con las 12 preguntas de la JAC, GPS, fotos y autorización de datos (con firma o de palabra). Aviso de casas repetidas (< 20 m). |
| Mapa de la vereda | `/mapa` | Satélite con todas las casas; filtros por sector, acueducto y ayuda recibida. |
| Red del acueducto | `/acueducto` | Bocatoma, desarenador, tanques, válvulas, etc. (forma = tipo, color = estado) y tuberías dibujadas en el mapa o caminando. |
| Mantenimientos | `/mantenimientos` | Arreglos del fontanero: materiales, mano de obra, factura, fotos antes/después; actualiza el estado de la red y envía la factura a tesorería. |
| Suscriptores | `/suscriptores` | Se crean desde el censo; estado de cuenta, pagos, recibos, cobros extra, suspensión. |
| Cobros del mes | `/facturacion` | Tarifa con historial, generación de la mensualidad, cartera, cuentas de cobro imprimibles. |
| Tesorería | `/tesoreria` | Cuentas, ingresos y gastos con soporte, **aprobación de la presidencia**, anulaciones visibles. |
| Ayudas y proyectos | `/ayudas` | Proyectos y beneficiarios por casa. |
| Reportes | `/reportes` | Población por edades y sectores, 6 reportes en Excel, respaldo completo (superadmin). |
| Usuarios / Bitácora | `/usuarios`, `/bitacora` | Gestión de usuarios y permisos; registro inmodificable de todas las acciones. |
| Página pública | `/transparencia` | Saldo en tiempo real, recaudo, pagos agregados (sin nombres), movimientos con soportes, consulta por cédula, compartir por WhatsApp/QR. |

**Modo sin señal.** Viviendas, puntos de la red, tuberías y arreglos se guardan en el celular y se suben solos
al volver la conexión (pantalla *Pendientes*). Requisito: abrir la app **con señal y sesión iniciada** al menos
una vez en cada celular. El mapa satelital sin señal solo muestra zonas vistas antes; el GPS siempre funciona.

## 2. Roles y permisos

Los permisos son una matriz **sección × acción** (ver, crear, editar, eliminar, aprobar) por usuario. Al
crear un usuario se aplica la plantilla de su rol; el superadmin puede ajustarla en `/usuarios/[id]`.

| Rol | Por defecto |
|---|---|
| Superadmin | Todo, incluido respaldo completo y gestión de superadmins. |
| Admin (presidencia) | Censo, mapas, red, mantenimientos, suscriptores, cobros, tesorería **con aprobación**, ayudas, reportes. |
| Fontanero | Mapa, red del acueducto, mantenimientos; ve suscriptores. |
| Encuestador | Registrar y editar viviendas; ver el mapa. |
| Tesorero | Cobros y pagos; registrar movimientos (los aprueba la presidencia); reportes. |
| Suscriptor | Reservado para un portal futuro (hoy se usa la consulta pública por cédula). |

El campo **cargo** del usuario (p. ej. "Presidenta", "Tesorera") es lo que aparece en la página pública.

## 3. Guía de uso por rol

**Primera vez (superadmin)**
1. Ingresar con el usuario del `SEED_SUPERADMIN_*`, cambiar la clave y aceptar los términos.
2. Configurar en Railway los datos legales `JAC_*` (ver §6).
3. Crear usuarios con su rol y **cargo**; entregar clave temporal (se cambia al primer ingreso).
4. Crear los sectores de la vereda (`/viviendas/sectores`).

**Encuestador (visita)**
1. Abrir la app con señal antes de salir. En la casa: *Registrar* → el GPS arranca solo.
2. Leer el aviso de privacidad a la familia. Si autoriza, llenar las 12 preguntas y registrar la autorización
   (**firma en pantalla** o **de palabra**). Si no autoriza, solo se registra la ubicación.
3. Si aparece "¿Esta casa ya está registrada?", abrir la existente en vez de crear otra.

**Fontanero**
1. Registrar los puntos de la red parado en cada uno (*Red → Punto*) y las tuberías (*Red → Tubería*,
   tocando el mapa o caminando con "Agregar mi ubicación").
2. Cada daño o mantenimiento: *Arreglo* (botón central). Agregar materiales, factura y fotos.

**Tesorería y presidencia**
1. Crear la cuenta del banco con el saldo del extracto (`/tesoreria/cuentas`).
2. Registrar la tarifa vigente y generar la mensualidad cada mes (`/facturacion`).
3. Registrar pagos desde la ficha del suscriptor (genera recibo e ingreso automático).
4. Gastos: *Registrar ingreso o gasto* con foto del soporte → la presidencia **aprueba** → se publica.
5. Compartir la página pública desde Tesorería (WhatsApp, QR, cartel imprimible).

**Atención de derechos de datos** (ver §4): consultas en 10 días hábiles, reclamos en 15.
Para borrar los datos de una familia: ficha de la vivienda → *Suprimir datos personales*.

## 4. Datos personales y cumplimiento legal

> Implementado según la Ley 1581 de 2012, el Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015) y la
> Ley 2166 de 2021. **No reemplaza asesoría jurídica**: se recomienda que un abogado o la Personería municipal
> revise `/privacidad` y `/terminos` antes de su adopción formal por la Junta.

Qué hace el sistema:
- **Política de tratamiento** pública en `/privacidad` (responsable, finalidades, derechos, procedimiento y
  plazos, transmisión internacional a Railway y Cloudinary, menores de edad, conservación, seguridad).
- **Términos de uso** en `/terminos`, con el **compromiso de confidencialidad** de los usuarios internos.
- **Aceptación obligatoria** de términos y compromiso por cada usuario antes de usar el sistema; se registra
  versión y fecha. Si cambia `VERSION_TERMINOS` (en `src/lib/legal.ts`), todos deben aceptar de nuevo.
- **Aviso de privacidad** leído a cada familia y **prueba de la autorización**: quién, cédula, medio (firma o
  de palabra), fecha, encuestador que la recibió y versión de la política. Las firmas se guardan como archivos
  **privados** en Cloudinary (se ven solo con enlace temporal firmado).
- **Minimización**: el formulario no pide datos sensibles; la página pública no publica nombres (cifras
  agregadas y nombre abreviado en la consulta por cédula, con límite de consultas).
- **Derecho de supresión/revocatoria**: anonimiza las personas de una vivienda, borra fotos y firma, y deja
  constancia en la bitácora; se conservan ubicación y datos del acueducto necesarios para el servicio y la
  contabilidad.
- **Bitácora** de todas las acciones, incluidos ingresos fallidos y descargas de reportes y respaldos.

Lo que debe hacer la Junta (fuera del sistema):
1. **Llenar los datos del responsable** (`JAC_NIT`, `JAC_PERSONERIA`, `JAC_DIRECCION`, `JAC_CORREO`,
   `JAC_TELEFONO`) en Railway. Mientras falten, las páginas legales muestran "[pendiente…]".
2. **Adoptar la política en asamblea o junta directiva** y dejarlo en acta.
3. Designar quién atiende consultas y reclamos (`JAC_RESPONSABLE_DATOS`) y llevar un registro de las
   solicitudes y respuestas.
4. Verificar si aplica la inscripción en el **Registro Nacional de Bases de Datos** de la SIC (obligatoria
   para entidades sin ánimo de lucro con activos totales superiores a 100.000 UVT; normalmente no aplica a una JAC).
5. Guardar los respaldos (§7) en un lugar seguro y con acceso limitado.
6. Ante un incidente (celular perdido, acceso indebido): desactivar el usuario en `/usuarios`, cambiar
   claves y, si hubo fuga de datos, reportarlo a la SIC.

## 5. Arquitectura

- **Next.js 16** (App Router, Server Actions, proxy) · TypeScript · Tailwind v4.
- **PostgreSQL** + **Drizzle ORM**; migraciones SQL versionadas en `drizzle/` (se aplican solas al arrancar).
- **Sesiones** JWT firmadas en cookie httpOnly (30 días, verificadas contra la BD en cada petición).
- **Mapas**: Leaflet + Esri World Imagery (satélite) y OpenStreetMap.
- **Archivos**: Cloudinary (fotos comprimidas en el celular; firmas privadas).
- **Offline**: PWA con service worker (`public/sw.js`), IndexedDB (Dexie, `src/lib/offline/`) y cola de
  sincronización idempotente (`/api/sync/*`, upsert por UUID generado en el celular).
- **Excel**: exceljs. **QR**: qrcode.
- Diseño: "Fachadas de Concepción" (ver `DESIGN.md` y `PRODUCT.md`); skill de diseño *impeccable* en `.claude/`.

```
src/
  app/(auth)/login         Ingreso
  app/(app)/...            Pantallas con sesión (shell con menú)
  app/transparencia        Página pública
  app/privacidad, terminos Páginas legales públicas
  app/aceptar              Aceptación de términos
  app/imprimir/...         Recibos, cuentas de cobro, cartel QR
  app/api/...              Sincronización, adjuntos, reportes, respaldo, salud
  actions/                 Server actions (mutaciones con permisos y auditoría)
  components/              UI compartida, mapas, formularios
  db/schema.ts             Modelo de datos
  lib/                     Permisos, sesión, finanzas, red, legal, offline, validación
drizzle/                   Migraciones
tests/                     Pruebas (vitest)
```

Principios del modelo: UUID generados en el celular para lo que se crea en campo; **borrado lógico**
(`deleted_at`); los movimientos de dinero nunca se borran (se rechazan o anulan con motivo); saldo =
saldo inicial + ingresos aprobados − egresos aprobados; estado de pago = cobros vencidos − pagos.

## 6. Despliegue en Railway

1. Proyecto con un servicio **PostgreSQL** y un servicio desde este repositorio (cada push a `main` despliega).
2. Variables del servicio web (ver `.env.example`):

| Variable | Obligatoria | Uso |
|---|---|---|
| `DATABASE_URL` | Sí | *Add Reference → Postgres → DATABASE_URL* |
| `SESSION_SECRET` | Sí | ≥ 32 caracteres aleatorios |
| `SEED_SUPERADMIN_USERNAME` / `_PASSWORD` / `_NOMBRE` | Primera vez | Crea el superadmin si no existe |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | Para fotos | Fotos, facturas y firmas |
| `JAC_NOMBRE`, `JAC_MUNICIPIO`, `JAC_NIT`, `JAC_PERSONERIA`, `JAC_DIRECCION`, `JAC_CORREO`, `JAC_TELEFONO`, `JAC_RESPONSABLE_DATOS` | Recomendadas | Datos del responsable en las páginas legales |

3. Arranque (`npm start`): aplica migraciones → crea el superadmin si falta → inicia Next. Healthcheck: `/api/health`.
4. Dominio propio (opcional): *Settings → Networking → Custom Domain*; enlaces y QR se actualizan solos.

## 7. Copias de seguridad

- **Railway**: en el servicio Postgres → pestaña *Backups*, activar respaldos programados (diarios o semanales)
  si el plan lo permite.
- **Desde la app**: `/reportes` → *Descargar respaldo* (solo superadmin): un Excel con todas las tablas, sin
  contraseñas. Descargarlo cada semana y guardarlo en un lugar seguro (no en grupos de WhatsApp).
- Fotos y firmas viven en Cloudinary (su propio almacenamiento).

## 8. Seguridad

- HTTPS con HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` (solo GPS y cámara).
- Contraseñas con bcrypt; cambio obligatorio de la clave temporal; bloqueo 15 min tras 5 fallos por usuario
  o 20 por conexión; alerta en la bitácora si hay muchos intentos fallidos.
- Permisos verificados en el servidor en cada página, acción y API; desactivar un usuario corta su acceso al instante.
- Consulta pública por cédula limitada a 8 por conexión cada 10 minutos.
- Validación de todos los datos de entrada con zod.

## 9. Desarrollo local

```bash
cp .env.example .env      # ajustar DATABASE_URL y SESSION_SECRET
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Compilar / producción (aplica migraciones) |
| `npm test` | Pruebas unitarias (vitest) |
| `npm run lint` | ESLint |
| `npm run db:generate` | Crear migración tras cambiar `src/db/schema.ts` |
| `npm run db:migrate` | Aplicar migraciones |
| `npm run db:studio` | Explorar la BD |

Nota: `.npmrc` usa `legacy-peer-deps` por un fallo de npm con dependencias opcionales de vitest.

## 10. Solución de problemas

| Síntoma | Causa / solución |
|---|---|
| Railway: `ECONNREFUSED 127.0.0.1:5432` o "Falta la variable DATABASE_URL" | La referencia `DATABASE_URL` no está en el servicio web. *Variables → Add Reference → Postgres*. |
| "Falta SESSION_SECRET" | Agregar la variable con 32+ caracteres. |
| Fotos quedan "sin subir": *Cloudinary no está configurado* | Faltan las variables `CLOUDINARY_*`. |
| Un celular no funciona sin señal | Abrirlo antes con señal y sesión iniciada; no borrar datos del navegador con pendientes. |
| "Sesión vencida" al sincronizar | Ingresar de nuevo con señal; los datos siguen en el celular y se suben después. |
| "Demasiados intentos fallidos" | Esperar 15 minutos o que la presidencia restablezca la clave (reiniciar el servicio también lo quita). |
| El superadmin olvidó su clave | En Railway agregue `RESET_SUPERADMIN_PASSWORD` con una clave temporal (8+ caracteres) y espere el redespliegue; entre con `SEED_SUPERADMIN_USERNAME` y esa clave, cámbiela, y **borre la variable**. Los logs muestran los usuarios superadmin existentes. |
| Las páginas legales dicen "[pendiente…]" | Configurar las variables `JAC_*`. |
