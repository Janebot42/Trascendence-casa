# Cheat sheet del proyecto

Guía rápida del backend actual: comandos, arquitectura, Fastify, Zod, type providers, Prisma, migraciones y API tipo Trello.

## 1. Comandos

Los scripts están definidos en [`package.json`](../package.json).

| Comando | Uso |
| --- | --- |
| `npm install` | Instala dependencias. |
| `npm ci` | Instala exactamente lo definido en `package-lock.json`. |
| `npm run dev` | Compila TypeScript en modo observación. |
| `npm run build` | Ejecuta `prisma generate` y compila `src/` en `dist/`. |
| `npm start` | Arranca `dist/server.js`. |
| `npm run prisma:generate` | Genera Prisma Client. |
| `npm run prisma:migrate:dev -- --name nombre_del_cambio` | Crea y aplica una migración durante el desarrollo. |
| `npm run prisma:migrate:deploy` | Aplica migraciones pendientes. |
| `npm run prisma:migrate:status` | Consulta el estado de las migraciones. |
| `npm run prisma:format` | Formatea `prisma/schema.prisma`. |
| `npm run prisma:validate` | Valida el schema y sus relaciones. |

Primera ejecución habitual:

    npm install
    docker compose up -d postgres
    npm run prisma:migrate:deploy
    npm run build
    npm start

La aplicación queda disponible en `http://127.0.0.1:3000/`.

## 2. Estructura

    src/app.ts                         Construcción y registro de Fastify
    src/server.ts                      Arranque HTTP
    src/config/                        Variables de entorno y seguridad
    src/db/                            Cliente Prisma
    src/modules/auth/                  Registro, login y contraseñas
    src/modules/authorization/         Sesión actual y roles globales
    src/modules/boards/                Tableros
    src/modules/cards/                 Tarjetas
    src/modules/lists/                 Listas
    src/modules/organizations/         Organizaciones
    src/modules/sessions/              Sesiones persistentes
    src/modules/two_factor/            TOTP y códigos de recuperación
    src/modules/users/                 Usuario actual y administración
    src/shared/                        Criptografía, cookies y errores
    src/ui/                            UI manual servida por Fastify
    prisma/schema.prisma               Modelo PostgreSQL
    prisma/migrations/                 Historial de migraciones Prisma
    public/                            HTML, CSS y JavaScript de la UI

Los módulos de negocio siguen el patrón `types`, `repository`, `prismaRepository`, `service` y `routes`. Cada módulo tiene repositorio en memoria y repositorio Prisma.

## 3. Variables de entorno

Se validan en [`src/config/env.ts`](../src/config/env.ts) con Zod.

| Variable | Función |
| --- | --- |
| `NODE_ENV` | `development`, `test` o `production`. |
| `HOST` | Host HTTP. |
| `PORT` | Puerto HTTP, por defecto `3000`. |
| `DATABASE_URL` | PostgreSQL. Si no está disponible se usan repositorios en memoria. |
| `COOKIE_SECURE` | Requiere HTTPS para la cookie. |
| `SESSION_COOKIE_NAME` | Nombre de la cookie, por defecto `sid`. |
| `SESSION_TTL_DAYS` | Duración de la sesión. |
| `TOTP_ISSUER` | Nombre mostrado en la aplicación autenticadora. |
| `TOTP_ENCRYPTION_KEY_BASE64` | Clave Base64 para cifrar secretos TOTP. |

El `.parse()` de `envSchema.parse(process.env)` se mantiene porque valida configuración al arrancar, no una ruta HTTP.

## 4. Fastify y autorización

La aplicación se construye en [`src/app.ts`](../src/app.ts) con `Fastify({ logger: env.NODE_ENV !== 'test' })`.

Las rutas protegidas usan `requireAuth(sessionsService)`. Este hook lee la cookie, recupera la sesión y añade `request.currentUser` y `request.currentSession`.

Para combinar controles se usa un array de `preHandler`, por ejemplo `requireAuth` junto con `requireRole('admin')` en `GET /admin/users`.

El parser personalizado de `application/json` convierte un cuerpo completamente vacío en `{}`. El `JSON.parse()` que aparece en ese parser no es una validación Zod y debe mantenerse.

El error handler global devuelve:

- `AppError`: el status y código definidos por el dominio.
- Error de schema Zod/Fastify: `400` y `VALIDATION_ERROR`.
- Cualquier otro error: `500` y `INTERNAL_ERROR`.

## 5. Fastify Type Providers + Zod

El proyecto usa `fastify-type-provider-zod@5.1.0`, compatible con Fastify 5 y Zod 4.

La configuración global está en [`src/app.ts`](../src/app.ts):

    import { validatorCompiler } from 'fastify-type-provider-zod';
    app.setValidatorCompiler(validatorCompiler);

En cada módulo de rutas se crea una instancia tipada:

    import type { ZodTypeProvider } from 'fastify-type-provider-zod';
    const typedApp = app.withTypeProvider<ZodTypeProvider>();

Los schemas se declaran en la ruta:

    typedApp.post('/lists/:listId/cards', {
      preHandler: requireAuth(sessionsService),
      schema: { params: listParamsSchema, body: createCardSchema }
    }, async (request) => {
      return cardsService.createCard({
        listId: request.params.listId,
        actorUserId: request.currentUser!.id,
        ...request.body
      });
    });

Fastify valida antes del handler y TypeScript infiere `request.params` y `request.body` desde Zod.

Antes se hacía `schema.parse(request.body)` dentro del handler. Ahora se usa `schema: { body: schema }` y no hay `.parse()` en las rutas HTTP.

Los únicos parseos actuales son:

- `src/config/env.ts`: `envSchema.parse(process.env)`.
- `src/app.ts`: `JSON.parse(rawBody)` del parser JSON.

Schemas relevantes de tarjetas:

    const createCardSchema = z.object({
      title: z.string().trim().min(1).max(200),
      description: z.string().trim().max(5000).optional().nullable(),
      dueDate: z.coerce.date().nullable().optional()
    });

`z.coerce.date()` convierte una fecha ISO recibida como texto en `Date`.

## 6. Prisma: modelos y relaciones

El schema está en [`prisma/schema.prisma`](../prisma/schema.prisma). El proyecto usa PostgreSQL.

Modelos actuales:

- Seguridad: `User`, `PasswordCredential`, `Session`, `LoginChallenge`, `TwoFactorTotp`, `RecoveryCode`.
- Organización: `Organization`, `OrganizationMember`, `Board`, `BoardMember`, `BoardList`.
- Tarjetas: `Card`, `CardAssignee`, `Comment`, `Label`, `CardLabel`.

Relación principal:

    Organization → Board → BoardList → Card
                           ├── CardAssignee → User
                           ├── Comment → User
                           └── CardLabel → Label

### Card

`Card` pertenece a una `BoardList`, conserva `createdById`, soporta descripción, fecha límite, posición y archivado lógico.

La posición es única dentro de cada lista mediante `@@unique([listId, position])`. Las tarjetas nuevas se colocan al final usando saltos de `1000`.

### BoardMember

Guarda la pertenencia a un tablero y usa los roles de texto `admin`, `member` y `observer`. El creador histórico continúa en `Board.createdByUserId`.

La autorización actual todavía se basa en la pertenencia a la organización; `BoardMember` está preparado para permisos más granulares en una fase posterior.

### CardAssignee

Tabla intermedia muchos-a-muchos entre `Card` y `User`, con clave primaria compuesta `cardId + userId`.

### Comment

Comentario de una tarjeta con autor, timestamps y `deletedAt` para borrado lógico.

### Label y CardLabel

`Label` pertenece a un tablero. `CardLabel` relaciona tarjetas y etiquetas. El nombre de una etiqueta es único dentro de su tablero mediante `@@unique([boardId, name])`.

## 7. Migraciones Prisma

El proyecto utiliza Prisma Migrate. El esquema fuente está en [`prisma/schema.prisma`](../prisma/schema.prisma) y las migraciones se guardan en [`prisma/migrations/`](../prisma/migrations/).

Durante el desarrollo se crea y aplica una migración con:

    npm run prisma:migrate:dev -- --name nombre_del_cambio

En despliegues se aplican las migraciones pendientes con:

    npm run prisma:migrate:deploy

Para consultar el estado:

    npm run prisma:migrate:status

No se debe combinar Prisma Migrate con un runner SQL propio.

La migración inicial crea las tablas de autenticación, organizaciones, tableros, listas, tarjetas, miembros de tablero, asignaciones, comentarios y etiquetas.

Al añadir un modelo hay que actualizar conjuntamente `schema.prisma`, crear una migración con Prisma Migrate, actualizar los repositorios y añadir pruebas.

## 8. Implementación de Card

Archivos del módulo:

- [`cards.types.ts`](../src/modules/cards/cards.types.ts): `Card` y los inputs de creación, edición, movimiento y archivado.
- [`cards.repository.ts`](../src/modules/cards/cards.repository.ts): contrato y repositorio en memoria.
- [`cards.prismaRepository.ts`](../src/modules/cards/cards.prismaRepository.ts): persistencia PostgreSQL.
- [`cards.service.ts`](../src/modules/cards/cards.service.ts): reglas de negocio y autorización.
- [`cards.routes.ts`](../src/modules/cards/cards.routes.ts): endpoints y schemas Zod.

Flujo:

    petición HTTP → Zod/Fastify → requireAuth → CardsService
      → ListsService.getListForUser → CardsRepository → PostgreSQL/memoria

Antes de operar sobre una tarjeta, `CardsService` verifica que el usuario pueda acceder a su lista y al tablero correspondiente.

Mover una tarjeta recibe `targetListId` y la coloca al final de la lista de destino.

## 9. API HTTP actual

Las rutas protegidas requieren la cookie de sesión.

### Estado y usuarios

    GET /health
    GET /me
    GET /admin/users

### Auth

    POST /auth/register
    POST /auth/login
    POST /auth/login/2fa
    POST /auth/logout
    POST /auth/reauthenticate
    POST /auth/password/change

### 2FA

    POST   /2fa/setup
    POST   /2fa/confirm
    POST   /2fa/recovery-codes/regenerate
    DELETE /2fa

### Organizaciones

    POST  /organizations
    GET   /organizations
    GET   /organizations/:organizationId
    PATCH /organizations/:organizationId

### Tableros

    POST  /organizations/:organizationId/boards
    GET   /organizations/:organizationId/boards
    GET   /boards/:boardId
    PATCH /boards/:boardId

### Listas

    POST /boards/:boardId/lists
    GET  /boards/:boardId/lists
    PATCH /lists/:listId
    POST /boards/:boardId/lists/reorder

### Tarjetas

    POST   /lists/:listId/cards
    GET    /lists/:listId/cards
    GET    /cards/:cardId
    PATCH  /cards/:cardId
    POST   /cards/:cardId/move
    DELETE /cards/:cardId

Crear tarjeta acepta `title`, `description` opcional y `dueDate` opcional. Mover tarjeta acepta `{ "targetListId": "..." }`. `DELETE /cards/:cardId` archiva; no elimina físicamente.
