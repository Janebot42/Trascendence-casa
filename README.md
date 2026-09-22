*This project has been created as part of the 42 curriculum by pablgarc, . The remaining team logins and roles must be added before the final submission.*

# Transcendence

## Description

Transcendence is a work-management web application inspired by Trello. The repository contains a modular Fastify backend, a PostgreSQL data model, and a Next.js frontend served by the compiled backend.

The implemented domain follows this hierarchy:

```text
Organization -> Board -> List -> Card
```

Users can authenticate, enable two-factor authentication, create shared organizations and boards, organize work into ordered lists, and create, edit, move, or archive cards.

The application is under active development. Features described as planned or database-only below must not be presented as completed functionality.

## Current Project Status

### Implemented

- User registration with a username, optional email, and password.
- Login, logout, persistent sessions, expiration, and session revocation.
- Password hashing with Node.js `scrypt` and per-password random salts.
- Session tokens and recovery codes stored as hashes rather than plaintext.
- Recent reauthentication for sensitive operations.
- TOTP two-factor authentication, one-time recovery codes, regeneration, and removal.
- Organization creation, listing, retrieval, and editing.
- Organization membership roles: `owner`, `admin`, and `member`.
- Board creation, listing, retrieval, and editing.
- Board membership roles: `admin`, `member`, and read-only `observer`.
- List creation, listing, renaming, and full-board reordering.
- Card creation, listing, retrieval, editing, movement between lists, and soft deletion.
- Offset-based pagination for users, organizations, boards, lists, and cards.
- Request validation with Zod and typed Fastify routes.
- PostgreSQL persistence through Prisma.
- Prisma Migrate history stored under `prisma/migrations`.
- In-memory repository implementations used when `NODE_ENV=test`.
- A Next.js frontend compiled into the backend deployment.

### Present in the database model but not implemented as application features

The Prisma schema and the initial Prisma migration already contain tables for:

- Card assignees.
- Comments.
- Labels.
- Card-label relationships.

These entities do not yet have services, HTTP routes, or interface controls.

### Not implemented yet

- A complete dashboard and final user-facing workflows.
- Drag-and-drop interaction.
- Arbitrary card ordering within a list.
- Organization, board, and list deletion or archival endpoints.
- Member listing and member removal flows.
- User profile editing, avatars, friends, and online presence.
- Real-time updates or WebSockets.
- Notifications.
- Internationalization.
- Prometheus/Grafana monitoring.
- WAF/ModSecurity and HashiCorp Vault.
- Application-level HTTPS configuration.
- Privacy Policy and Terms of Service pages.
- Containerization of the complete application; Docker Compose currently starts PostgreSQL only.
- An automated test suite in this checkout.

## Architecture

The backend is organized by domain modules:

```text
src/
|-- app.ts                  Fastify construction and dependency wiring
|-- server.ts               HTTP server entry point
|-- config/                 Environment and security configuration
|-- db/                     Prisma client setup
|-- modules/
|   |-- auth/               Registration, login, reauthentication, passwords
|   |-- authorization/      Authentication and global-role guards
|   |-- boards/             Boards and board-level roles
|   |-- cards/              Card CRUD, movement, and archival
|   |-- lists/              Board lists and list reordering
|   |-- organizations/      Organizations and memberships
|   |-- sessions/           Persistent sessions
|   |-- two_factor/         TOTP and recovery codes
|   `-- users/              Current user and administrative user listing
|-- shared/                 Cryptography, errors, cookies, pagination, rate limits
`-- ui/                     Routes that serve the compiled frontend

frontend/                   Next.js frontend source
prisma/schema.prisma        Prisma data model
prisma/migrations/          Prisma migration history
```

Most domain modules use the following dependency flow:

```text
HTTP route -> service -> repository interface -> Prisma or in-memory repository
```

Routes validate transport data and require authentication where appropriate. Services enforce permissions and business rules. Repositories handle storage.

## Technical Stack

| Area | Technology | Reason for use |
| --- | --- | --- |
| Runtime | Node.js with ESM | Modern JavaScript runtime and native cryptographic APIs |
| Language | TypeScript 5.9, strict mode | Static checks across routes, services, and repositories |
| Backend framework | Fastify 5 | Routing, lifecycle hooks, plugins, and request injection |
| Validation | Zod 4 and `fastify-type-provider-zod` | Runtime validation with inferred request types |
| Database | PostgreSQL 16 | Relational integrity, transactions, and concurrency controls |
| ORM | Prisma 6 | Typed database access and schema relationships |
| Authentication | Cookies, `scrypt`, TOTP | Stateful sessions and optional second-factor protection |
| Local infrastructure | Docker Compose | Reproducible PostgreSQL service for development |
| Frontend | Next.js, React, TypeScript | User interface compiled and served by Fastify |

## Database Schema

The main relationships are:

```text
User
|-- PasswordCredential
|-- Session
|-- LoginChallenge
|-- TwoFactorTotp
|-- RecoveryCode
|-- OrganizationMember -> Organization
|-- BoardMember ---------> Board
`-- created cards and comments

Organization
`-- Board
    |-- BoardMember
    |-- BoardList
    |   `-- Card
    |       |-- CardAssignee -> User
    |       |-- Comment ------> User
    |       `-- CardLabel ----> Label
    `-- Label
```

Lists and cards use integer positions with gaps (`1000`, `2000`, `3000`, and so on). PostgreSQL advisory locks protect position allocation and list reordering from concurrent requests. Cards are archived through `archivedAt` rather than physically deleted.

Prisma Migrate is the only migration system used by the project. The schema is defined in `prisma/schema.prisma`, and migration history is stored in `prisma/migrations`.

The initial migration contains the current schema:

1. `prisma/migrations/20260920120000_init/migration.sql`: users, credentials, sessions, 2FA, organizations, boards, lists, cards, board members, assignees, comments, and labels.

## Instructions

### Prerequisites

- Node.js compatible with TypeScript 5.9 and Prisma 6.
- npm.
- Docker and Docker Compose for the provided PostgreSQL setup.

### Environment setup

Copy `.env.example` to `.env` and replace the TOTP encryption key with a Base64-encoded value that decodes to exactly 32 random bytes.

Required development variables:

```dotenv
NODE_ENV=development
HOST=127.0.0.1
PORT=3000
COOKIE_SECURE=false
SESSION_COOKIE_NAME=sid
SESSION_TTL_DAYS=14
TOTP_ISSUER=Transcendence
TOTP_ENCRYPTION_KEY_BASE64=replace-with-32-random-bytes-base64
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/transcendence
```

Do not commit `.env`. It is excluded through `.gitignore`.

### Install and run

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start PostgreSQL:

   ```bash
   docker compose up -d postgres
   ```

3. Apply the committed Prisma migrations:

   ```bash
   npm run prisma:migrate:deploy
   ```

4. Generate Prisma Client and compile TypeScript:

   ```bash
   npm run build
   ```

5. Start the compiled server:

   ```bash
   npm start
   ```

6. Open the application:

   ```text
   http://127.0.0.1:3000/
   ```

When the application starts outside the test environment, `DATABASE_URL` is required. Apply pending migrations explicitly with `npm run prisma:migrate:deploy` in deployment environments.

### Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Compile TypeScript continuously in watch mode |
| `npm run build` | Generate Prisma Client and compile `src/` into `dist/` |
| `npm start` | Start `dist/server.js` |
| `npm run prisma:generate` | Regenerate Prisma Client |
| `npm run prisma:migrate:dev` | Create and apply a migration during development |
| `npm run prisma:migrate:deploy` | Apply pending migrations in staging or production |
| `npm run prisma:migrate:status` | Show migration status |
| `npm run prisma:format` | Format `prisma/schema.prisma` |
| `npm run prisma:validate` | Validate the Prisma schema |



## API Overview

Protected routes use the session cookie configured by `SESSION_COOKIE_NAME`.

### Health and users

```http
GET /health
GET /me
GET /admin/users
```

`GET /admin/users` requires the global `admin` role.

### Authentication

```http
POST /auth/register
POST /auth/login
POST /auth/login/2fa
POST /auth/logout
POST /auth/reauthenticate
POST /auth/password/change
```

New passwords must contain between 12 and 128 characters. Password changes require a recent reauthentication and revoke the user's other active sessions.

### Two-factor authentication

```http
POST   /2fa/setup
POST   /2fa/confirm
POST   /2fa/recovery-codes/regenerate
DELETE /2fa
```

These operations require authentication and recent reauthentication.

### Organizations

```http
POST  /organizations
GET   /organizations
GET   /organizations/:organizationId
PATCH /organizations/:organizationId
PUT   /organizations/:organizationId/members/:userId
```

Only organization owners and administrators can edit an organization. Only an owner can promote, demote, or replace organization administrators.

### Boards

```http
POST  /organizations/:organizationId/boards
GET   /organizations/:organizationId/boards
GET   /boards/:boardId
PATCH /boards/:boardId
PUT   /boards/:boardId/members/:userId
```

Board roles are `admin`, `member`, and `observer`. Observers have read-only access.

### Lists

```http
POST  /boards/:boardId/lists
GET   /boards/:boardId/lists
PATCH /lists/:listId
POST  /boards/:boardId/lists/reorder
```

List reordering must include every active list ID exactly once.

### Cards

```http
POST   /lists/:listId/cards
GET    /lists/:listId/cards
GET    /cards/:cardId
PATCH  /cards/:cardId
POST   /cards/:cardId/move
DELETE /cards/:cardId
```

Moving a card places it at the end of the destination list. Deleting a card performs a soft deletion.

### Pagination

Collection routes accept:

```text
?limit=50&offset=0
```

`limit` must be between 1 and 100. Paginated responses include `limit`, `offset`, `total`, and `hasMore`.

## Security Design

- Session cookies are `HttpOnly`, `SameSite=Lax`, and can be marked `Secure` through configuration.
- Only token hashes are stored for sessions, login challenges, and recovery codes.
- Password verification uses timing-safe comparison.
- TOTP secrets are encrypted with AES-256-GCM.
- Login, registration, second-factor, and reauthentication attempts use in-memory rate limits.
- Login challenges and recovery codes are consumed conditionally to prevent concurrent reuse.
- Permission checks are applied in the service layer before data access or mutation.
- Error responses use a consistent `{ error, message }` structure.

The rate limiter is process-local and is not currently shared between multiple backend instances. Production deployment also still requires HTTPS termination, centralized secret management, and the security infrastructure selected by the team.

## Frontend

The Next.js frontend is compiled into `frontend/out/` and served by Fastify from `/`.
During development it can be run separately on port `3001` with `npm run dev:frontend`,
while the unified production build is served from port `3000`.

## Module Status

This section records implementation status and does not claim final evaluation points. A module only counts when every requirement in the subject can be demonstrated.

| Subject module | Status |
| --- | --- |
| Backend framework (Minor) | Implemented with Fastify |
| ORM (Minor) | Implemented with Prisma |
| Complete 2FA (Minor) | Implemented in backend and manual UI |
| Organization system (Major) | In progress; deletion and member removal are missing |
| Standard user management (Major) | In progress; profiles, avatars, friends, and online status are missing |
| Advanced permissions (Major) | In progress; domain roles exist, but full user CRUD and required role views do not |
| Frontend framework | Not implemented |
| Real-time features and collaboration | Not implemented |
| Accessibility WCAG 2.1 AA | Not verified or complete |
| Internationalization | Not implemented |
| Cybersecurity with WAF and Vault | Not implemented |
| Prometheus and Grafana monitoring | Not implemented |
| Notification system | Not implemented |

The separate module-planning document describes intended targets, not completed modules.

## Known Compliance Gaps

Before final evaluation, the team must address at least the following subject requirements:

- The mandatory authentication wording requires email and password; the current implementation makes email optional and logs in with username and password.
- Docker Compose does not yet start the complete application with one command.
- Browser-to-backend communication is not yet configured for HTTPS.
- Privacy Policy and Terms of Service pages are missing.
- The final frontend and its client-side validation are not implemented.
- Real multi-user behavior has no automated concurrency or end-to-end test coverage.
- The README still needs complete team roles, project-management details, individual contributions, and an accurate record of AI usage.

## Team Information and Individual Contributions


- Every team member's 42 login.
- Assigned role or roles: Product Owner, Project Manager/Scrum Master, Technical Lead, and Developer.
- A brief description of each member's responsibilities.
- The specific features, modules, and components completed by each member.
- Important technical challenges and how the team resolved them.


## Project Management


- How work was divided and prioritized.
- The frequency and purpose of team meetings.
- The project-management tools used.
- The communication and code-review process.
- Known risks, blockers, and ownership of remaining work.

## Resources

Primary technical references:

- [Fastify documentation](https://fastify.dev/docs/latest/)
- [Prisma documentation](https://www.prisma.io/docs)
- [PostgreSQL documentation](https://www.postgresql.org/docs/)
- [Zod documentation](https://zod.dev/)
- [Node.js Crypto documentation](https://nodejs.org/api/crypto.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [WCAG 2.1](https://www.w3.org/TR/WCAG21/)

### AI usage

AI-assisted review was used to inspect the repository and rewrite this README 

## Verification Snapshot

At the time of this README update:

- TypeScript strict compilation succeeds when run directly.
- `prisma validate` reports a valid schema.
- The unified build generates the Next.js frontend and backend successfully.
- An in-memory smoke flow covering registration, organization, board, list, card creation, card editing, movement, and archival succeeds.

These statements describe the current checkout and should be updated as the project evolves.
