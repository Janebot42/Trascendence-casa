# Instrucciones para agentes

## Contexto del proyecto

Transcendence es una aplicación de gestión de trabajo con backend Fastify, PostgreSQL y Prisma, y frontend Next.js. La jerarquía principal es organización → tablero → lista → tarjeta.

Antes de cambiar una funcionalidad, consulta el código y las pruebas correspondientes. El README sirve como orientación, pero algunas descripciones de su estado están desactualizadas. Para entender la estructura del backend, consulta `docs/estructura-modulos.md`.

## Estructura y convenciones

- `src/app.ts` construye las dependencias y registra las rutas del backend.
- En `src/modules/`, las rutas validan las peticiones, los servicios aplican permisos y reglas de negocio, y los repositorios gestionan la persistencia.
- Los módulos con persistencia suelen tener una implementación Prisma y otra en memoria. Mantén ambas alineadas al ampliar sus contratos.
- El backend usa TypeScript estricto y módulos ESM; conserva la extensión `.js` en los imports relativos de archivos TypeScript.
- `frontend/` tiene sus propias dependencias y scripts. Centraliza las llamadas HTTP en `frontend/lib/api.ts` y las operaciones del espacio de trabajo en `frontend/lib/workspace.ts`.
- `prisma/schema.prisma` y `prisma/migrations/` contienen el esquema y su historial. No modifiques migraciones ya aplicadas para introducir cambios nuevos.

## Reglas de implementación

- Comprueba permisos de organización y tablero en los servicios, además de exigir autenticación en las rutas que corresponda.
- Valida las entradas HTTP con los patrones Zod existentes y conserva el formato de errores de la API.
- Al cambiar tarjetas o listas, respeta los controles de posición y concurrencia existentes, incluidos `expectedVersion` y `expectedListIds` donde se utilicen.
- Si una operación debe aparecer en el historial o llegar a clientes conectados, sigue los patrones de `activity/` y `realtime/`. Con Prisma, registra el cambio y su actividad en la misma transacción cuando corresponda.
- No presentes una función como terminada solo porque exista en el esquema de datos o en un componente de demostración.

## Comprobación de cambios

Las pruebas automatizadas están en `test/`. Las pruebas de permisos incluyen casos con repositorios en memoria, peticiones HTTP y PostgreSQL.

Ejecuta las comprobaciones pertinentes según el área modificada:

- Backend: `npm run build:backend` y `npm run test:permissions`.
- Frontend: `npm --prefix frontend run lint` y `npm run build:frontend`.
- Esquema Prisma: `npm run prisma:validate`.
- Integración con PostgreSQL: `npm run test:permissions:db`, únicamente con una base de datos local de desarrollo preparada para aplicar migraciones.

Indica qué comprobaciones ejecutaste y cuáles quedaron pendientes. No uses una base de datos compartida o de producción para pruebas.

## Memoria

- Al empezar, lee `MEMORY.md` para conocer el estado del proyecto y las decisiones tomadas. Si aún no existe, continúa con el repositorio como fuente de contexto.
- Al terminar una tarea, actualízalo: estado actual, decisiones importantes con su porqué y errores a evitar. Si no existe, créalo entonces.
- Mantenlo breve (máximo ~50 líneas): resume o elimina lo que ya no aporte.
- Si algo se convierte en una regla permanente, propón moverlo a `AGENTS.md` en lugar de dejarlo en la memoria.
- No guardes nunca datos sensibles (claves, tokens, datos personales).

## Seguridad y alcance

- No incluyas secretos ni contenido de `.env` en código, pruebas, registros o respuestas. Usa `.env.example` como referencia de variables.
- Evita cambios ajenos a la tarea y conserva los cambios existentes de otras personas.
- Actualiza la documentación afectada cuando cambie el comportamiento real de la aplicación.
