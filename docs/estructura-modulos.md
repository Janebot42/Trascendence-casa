# Guía de `src/modules`

Esta guía explica cómo se organiza el backend por módulos y dónde debe buscar o añadir código una persona que acaba de incorporarse. Describe el código actual de `src/modules`; para arrancar el proyecto y conocer las tecnologías, consulta el [README](../README.md).

## Idea general

Cada carpeta representa una responsabilidad del dominio: usuarios, autenticación, organizaciones, tableros, listas, tarjetas, etc. La estructura más habitual es:

```text
src/modules/<modulo>/
├── <modulo>.types.ts              Datos e inputs del dominio
├── <modulo>.routes.ts             API HTTP: URL, validación y respuesta
├── <modulo>.service.ts            Reglas de negocio y permisos
├── <modulo>.repository.ts         Contrato de persistencia e implementación en memoria
└── <modulo>.prismaRepository.ts   Implementación de persistencia con Prisma
```

El recorrido típico de una operación es:

```text
Petición HTTP
  → routes.ts (Zod, sesión, parámetros y respuesta)
  → service.ts (permisos, reglas y coordinación)
  → repository.ts (interfaz)
  → prismaRepository.ts o implementación en memoria (datos)
```

`src/app.ts` construye esas dependencias y registra las rutas. Usa Prisma cuando hay cliente de base de datos y repositorios en memoria en el entorno de pruebas. Las rutas importan servicios ya construidos; no crean conexiones ni eligen implementaciones de repositorio.

### Qué corresponde a cada capa

| Archivo | Responsabilidad | Ejemplo |
| --- | --- | --- |
| `*.types.ts` | Tipos de entidades, roles y datos de entrada usados entre capas. | `Card`, `MoveCardInput`. |
| `*.routes.ts` | Registra endpoints Fastify, valida entradas con Zod, aplica `requireAuth` cuando procede y transforma el resultado en una respuesta HTTP. | `POST /lists/:listId/cards`. |
| `*.service.ts` | Comprueba permisos y condiciones del negocio, llama a otros servicios y al repositorio; algunos servicios publican eventos de actividad y tiempo real. | Exigir permiso de escritura antes de mover una tarjeta. |
| `*.repository.ts` | Declara la interfaz que necesita el servicio. En este proyecto también contiene su implementación en memoria. | `CardsRepository` e `InMemoryCardsRepository`. |
| `*.prismaRepository.ts` | Implementa la misma interfaz contra PostgreSQL mediante Prisma; aquí se resuelven consultas, transacciones y conflictos de concurrencia. | `PrismaCardsRepository`. |

La interfaz permite cambiar la implementación sin reescribir el servicio. **No todas las carpetas tienen los cinco archivos**: los módulos de apoyo se describen más abajo. Aunque el código sea TypeScript, los imports relativos terminan en `.js` porque el backend se compila como módulos ESM.

## Archivos por módulo

### `activity/`: historial de acciones

| Archivo | Función |
| --- | --- |
| [`activity.types.ts`](../src/modules/activity/activity.types.ts) | Define tipos de entidad, acciones (`card.moved`, `list.reordered`, etc.), datos necesarios para registrar una acción y el evento que se devuelve al cliente. |
| [`activity.routes.ts`](../src/modules/activity/activity.routes.ts) | Registra `GET /boards/:boardId/activity` con autenticación y paginación. |
| [`activity.service.ts`](../src/modules/activity/activity.service.ts) | Comprueba que el usuario pueda leer el tablero y completa los datos públicos del autor de cada evento cuando hace falta. |
| [`activity.repository.ts`](../src/modules/activity/activity.repository.ts) | Define lectura y escritura del historial, guarda eventos en memoria y ofrece `recordActivityIfNotAtomic` para repositorios que no escriben el evento en la misma transacción. |
| [`activity.prismaRepository.ts`](../src/modules/activity/activity.prismaRepository.ts) | Consulta y registra eventos `ActivityEvent` en Prisma, con orden y paginación. |
| [`activity.write.ts`](../src/modules/activity/activity.write.ts) | Inserta un evento usando una transacción Prisma existente, para que el cambio del dominio y su historial se confirmen juntos. |

### `auth/`: registro, acceso y contraseña

| Archivo | Función |
| --- | --- |
| [`auth.types.ts`](../src/modules/auth/auth.types.ts) | Define la credencial de contraseña y los dos posibles resultados del acceso: sesión autenticada o desafío de segundo factor. |
| [`auth.routes.ts`](../src/modules/auth/auth.routes.ts) | Valida y registra las rutas de registro, login, segundo factor, logout, reautenticación y cambio de contraseña; gestiona la cookie de sesión. |
| [`auth.service.ts`](../src/modules/auth/auth.service.ts) | Coordina credenciales, hash de contraseñas, sesiones, desafíos de login y segundo factor; aplica las reglas del flujo de autenticación. |
| [`auth.repository.ts`](../src/modules/auth/auth.repository.ts) | Define el acceso a credenciales y desafíos de login, con implementación en memoria; el desafío se consume una sola vez. |
| [`auth.prismaRepository.ts`](../src/modules/auth/auth.prismaRepository.ts) | Persiste credenciales y desafíos con Prisma, incluido el consumo condicional de un desafío. |
| [`registration.repository.ts`](../src/modules/auth/registration.repository.ts) | Operación especial de registro: crea usuario y credencial juntos. La variante Prisma usa una transacción; también existe variante en memoria. |

### `authorization/`: protección de peticiones

| Archivo | Función |
| --- | --- |
| [`currentUser.ts`](../src/modules/authorization/currentUser.ts) | Amplía el tipo `FastifyRequest` con `currentUser` y `currentSession`, que rellenan los guards. |
| [`requireAuth.ts`](../src/modules/authorization/requireAuth.ts) | Lee la cookie, valida la sesión mediante `SessionsService` y añade el usuario y la sesión a la petición. |
| [`requireRole.ts`](../src/modules/authorization/requireRole.ts) | Comprueba un **rol global** de usuario, usado por ejemplo para `/admin/users`. Los permisos de organización o tablero se comprueban en sus servicios. |

### `boards/`: tableros y sus miembros

| Archivo | Función |
| --- | --- |
| [`boards.types.ts`](../src/modules/boards/boards.types.ts) | Define tablero, visibilidad (`WORKSPACE`/`PRIVATE`), roles de miembro y datos de creación, edición y asignación de roles. |
| [`boards.routes.ts`](../src/modules/boards/boards.routes.ts) | Expone creación y listado dentro de una organización, lectura, edición, archivado y gestión de miembros de un tablero. |
| [`boards.service.ts`](../src/modules/boards/boards.service.ts) | Resuelve el acceso efectivo al tablero según rol de organización, membresía y visibilidad; exige permisos de lectura, escritura o administración. Registra actividad de los cambios principales. |
| [`boards.repository.ts`](../src/modules/boards/boards.repository.ts) | Contrato y variante en memoria para tableros, membresías, visibilidad, actualización y archivado. |
| [`boards.prismaRepository.ts`](../src/modules/boards/boards.prismaRepository.ts) | Consultas Prisma de tableros y miembros; escribe los eventos de actividad asociados a cambios dentro de transacciones. |

### `cards/`: tarjetas

| Archivo | Función |
| --- | --- |
| [`cards.types.ts`](../src/modules/cards/cards.types.ts) | Define tarjeta, prioridad y entradas para crear, editar, mover y archivar; incluye `version` y `expectedVersion` para detectar cambios concurrentes. |
| [`cards.routes.ts`](../src/modules/cards/cards.routes.ts) | Expone creación y listado por lista, lectura, edición, movimiento y archivado de tarjetas; valida cuerpo y parámetros. |
| [`cards.service.ts`](../src/modules/cards/cards.service.ts) | Comprueba permisos a través de la lista y el tablero, coordina la operación, registra actividad y publica cambios en tiempo real. |
| [`cards.repository.ts`](../src/modules/cards/cards.repository.ts) | Contrato y variante en memoria para consultar, crear, editar, mover y archivar tarjetas. |
| [`cards.prismaRepository.ts`](../src/modules/cards/cards.prismaRepository.ts) | Persiste tarjetas con Prisma; resuelve posiciones al moverlas, comprueba versiones y agrupa cambios e historial en transacciones. |

### `labels/`: etiquetas de tablero y tarjeta

| Archivo | Función |
| --- | --- |
| [`labels.types.ts`](../src/modules/labels/labels.types.ts) | Define la etiqueta (`boardId`, nombre y color) y las entradas para crearla, editarla y borrarla. |
| [`labels.routes.ts`](../src/modules/labels/labels.routes.ts) | Expone etiquetas del tablero y de cada tarjeta, además de asociar y desasociar etiquetas de tarjetas. |
| [`labels.service.ts`](../src/modules/labels/labels.service.ts) | Comprueba acceso al tablero o tarjeta y que la etiqueta pertenezca al mismo tablero; registra actividad y publica eventos en tiempo real. |
| [`labels.repository.ts`](../src/modules/labels/labels.repository.ts) | Contrato y variante en memoria para etiquetas y relaciones tarjeta-etiqueta. |
| [`labels.prismaRepository.ts`](../src/modules/labels/labels.prismaRepository.ts) | Guarda etiquetas y relaciones con Prisma; registra la actividad del cambio en la misma transacción. |

### `lists/`: listas de un tablero

| Archivo | Función |
| --- | --- |
| [`lists.types.ts`](../src/modules/lists/lists.types.ts) | Define lista, posición y entradas para crear, editar y reordenar listas; `expectedListIds` permite comprobar el orden esperado. |
| [`lists.routes.ts`](../src/modules/lists/lists.routes.ts) | Expone creación, listado, edición, archivado y reordenación de listas. |
| [`lists.service.ts`](../src/modules/lists/lists.service.ts) | Comprueba permisos del tablero, coordina cambios, registra actividad y publica eventos en tiempo real. |
| [`lists.repository.ts`](../src/modules/lists/lists.repository.ts) | Contrato y variante en memoria para consulta, orden, reordenación y archivado de listas. |
| [`lists.prismaRepository.ts`](../src/modules/lists/lists.prismaRepository.ts) | Implementa las operaciones con Prisma; usa transacciones y bloqueo al asignar o cambiar posiciones, y escribe actividad de forma atómica. |

### `organizations/`: espacios de trabajo y membresías

| Archivo | Función |
| --- | --- |
| [`organizations.types.ts`](../src/modules/organizations/organizations.types.ts) | Define organización, miembro, roles (`owner`, `admin`, `member`) y entradas para crear, editar y asignar roles. |
| [`organizations.routes.ts`](../src/modules/organizations/organizations.routes.ts) | Expone organizaciones, archivado, miembros, salida, transferencia de propiedad e invitación de un usuario existente por correo. |
| [`organizations.service.ts`](../src/modules/organizations/organizations.service.ts) | Aplica reglas de propiedad y administración: quién puede editar, invitar, cambiar roles, retirar miembros o transferir la propiedad. |
| [`organizations.repository.ts`](../src/modules/organizations/organizations.repository.ts) | Contrato y variante en memoria para organizaciones y miembros; incluye utilidades de `slug` y la comprobación de rol administrativo. |
| [`organizations.prismaRepository.ts`](../src/modules/organizations/organizations.prismaRepository.ts) | Implementa consultas, membresías, transferencia de propiedad y archivado en Prisma. |

### `realtime/`: actualizaciones por WebSocket

| Archivo | Función |
| --- | --- |
| [`realtime.types.ts`](../src/modules/realtime/realtime.types.ts) | Define la forma común de un evento enviado a clientes conectados. |
| [`realtime.routes.ts`](../src/modules/realtime/realtime.routes.ts) | Registra `GET /realtime?boardId=...` como WebSocket; valida la sesión y el permiso de lectura del tablero antes de suscribir la conexión. |
| [`realtime.service.ts`](../src/modules/realtime/realtime.service.ts) | Mantiene suscripciones por tablero en memoria y distribuye eventos; elimina conexiones cerradas o fallidas. Funciona dentro de un único proceso backend. |

### `sessions/`: sesiones persistentes

| Archivo | Función |
| --- | --- |
| [`sessions.types.ts`](../src/modules/sessions/sessions.types.ts) | Define sesión, sesión recién creada y sesión acompañada de su usuario. |
| [`sessions.service.ts`](../src/modules/sessions/sessions.service.ts) | Crea tokens, guarda solo su hash, valida expiración y revocación, recupera al usuario activo y gestiona reautenticación y revocaciones. |
| [`sessions.repository.ts`](../src/modules/sessions/sessions.repository.ts) | Contrato y variante en memoria para crear, buscar, revocar y marcar sesiones reautenticadas. |
| [`sessions.prismaRepository.ts`](../src/modules/sessions/sessions.prismaRepository.ts) | Persiste y consulta sesiones en Prisma. No tiene `routes.ts`: lo usan `auth/`, `authorization/` y `realtime/`. |

### `two_factor/`: segundo factor TOTP

| Archivo | Función |
| --- | --- |
| [`twoFactor.types.ts`](../src/modules/two_factor/twoFactor.types.ts) | Define el estado del secreto TOTP, los códigos de recuperación y el resultado del inicio de configuración. |
| [`twoFactor.routes.ts`](../src/modules/two_factor/twoFactor.routes.ts) | Expone configuración, confirmación, regeneración de códigos y desactivación de 2FA; exige sesión y reautenticación reciente para acciones sensibles. |
| [`twoFactor.service.ts`](../src/modules/two_factor/twoFactor.service.ts) | Coordina el alta y la verificación de TOTP, el uso de códigos de recuperación y la desactivación. |
| [`twoFactor.repository.ts`](../src/modules/two_factor/twoFactor.repository.ts) | Contrato y variante en memoria para el secreto TOTP y los hashes de códigos de recuperación. |
| [`twoFactor.prismaRepository.ts`](../src/modules/two_factor/twoFactor.prismaRepository.ts) | Persiste ese estado en Prisma y consume códigos de recuperación de forma condicional. |
| [`totp.service.ts`](../src/modules/two_factor/totp.service.ts) | Genera y verifica códigos TOTP, crea la URI de configuración y cifra o descifra el secreto. |
| [`recoveryCodes.service.ts`](../src/modules/two_factor/recoveryCodes.service.ts) | Genera códigos de un solo uso, guarda sus hashes y consume un código presentado por el usuario. |

### `users/`: datos de usuario

| Archivo | Función |
| --- | --- |
| [`users.types.ts`](../src/modules/users/users.types.ts) | Define usuario, estado, rol global y entrada para crear un usuario. |
| [`users.routes.ts`](../src/modules/users/users.routes.ts) | Expone `GET /me` y el listado paginado `GET /admin/users`, reservado al rol global `admin`. |
| [`users.service.ts`](../src/modules/users/users.service.ts) | Ofrece creación, búsqueda por ID, nombre o correo y listado de usuarios a otros módulos. |
| [`users.repository.ts`](../src/modules/users/users.repository.ts) | Contrato y variante en memoria para esas operaciones. |
| [`users.prismaRepository.ts`](../src/modules/users/users.prismaRepository.ts) | Implementa esas operaciones y la paginación con Prisma. |

## Ejemplo: mover una tarjeta

1. `cards.routes.ts` valida `POST /cards/:cardId/move`, exige sesión y entrega los datos a `CardsService`.
2. `cards.service.ts` comprueba que el usuario pueda escribir en la tarjeta y en la lista de destino mediante `ListsService` y `BoardsService`.
3. `cards.prismaRepository.ts` ejecuta el movimiento, calcula la posición y comprueba la versión esperada cuando se proporciona. La variante en memoria de `cards.repository.ts` implementa el mismo contrato.
4. El servicio registra la actividad y publica `card.moved` a las conexiones del tablero a través de `RealtimeService`. Con Prisma, la escritura del historial se hace en la transacción del repositorio.

## Al añadir una operación

1. Define o amplía sus tipos de dominio en `*.types.ts`.
2. Añade al contrato de `*.repository.ts` las operaciones de datos necesarias e impleméntalas en memoria y en `*.prismaRepository.ts`.
3. Coloca permisos y reglas del negocio en `*.service.ts`; usa otros servicios para respetar los límites de acceso entre módulos.
4. Añade la ruta, su esquema Zod y la respuesta en `*.routes.ts`; registra el nuevo módulo en `src/app.ts` si es una carpeta nueva.
5. Si el cambio debe aparecer en el historial o a otros clientes conectados, sigue los patrones de `activity/` y `realtime/`. En Prisma, registra la actividad dentro de la misma transacción que el cambio.

Para entender una funcionalidad existente, empieza por su ruta y sigue las llamadas al servicio y al repositorio. Para entender un permiso, busca su comprobación en el servicio correspondiente.
