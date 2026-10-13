# Task Management API (.NET 10)

ASP.NET Core Web API with JWT auth, role-based authorization, Redis caching, a background worker, SQL Server (EF Core migrations), Swagger, and a DDD-style layered structure.

## Project structure

```
src/
  TaskManagement.Domain          Entities (User, TaskItem), enums, domain rules, repository interfaces. No dependencies.
  TaskManagement.Application     Use cases/services, DTOs, abstractions (cache, queue, hasher, JWT). Depends on Domain only.
  TaskManagement.Infrastructure  EF Core + SQL Server, migrations, repositories, seeding, BCrypt, JWT generation, Redis cache, queue + worker.
  TaskManagement.Api             Controllers, middleware, Swagger, authentication/authorization wiring.
tests/
  TaskManagement.Tests           xUnit + Moq unit tests (services and domain).
```
Dependency direction: `Api -> Infrastructure -> Application -> Domain`. Business rules live in Domain/Application; the outer layers only implement interfaces.

## Prerequisites
- .NET 10 SDK
- Docker (for SQL Server + Redis, or to run everything)

## Run option 1 - everything in Docker
```bash
docker compose up --build
```
Swagger: http://localhost:8080/swagger

## Run option 2 - API locally, infra in Docker
```bash
docker compose up -d sqlserver redis
dotnet run --project src/TaskManagement.Api
```
Swagger: http://localhost:5080/swagger

On startup the app applies pending EF Core migrations (retrying while SQL Server boots) and then seeds the admin, so no manual database step is needed.

Local SQL Server connection (matches docker-compose): `sa` / `Your_strong_Passw0rd!` - change it for anything beyond local dev.

## Migrations
```bash
dotnet tool install --global dotnet-ef   # once
dotnet ef migrations add <Name> -p src/TaskManagement.Infrastructure -s src/TaskManagement.Api -o Persistence/Migrations
dotnet ef database update -p src/TaskManagement.Infrastructure -s src/TaskManagement.Api   # optional; the app also does this on start
```
The `InitialCreate` migration is included in `Persistence/Migrations`.

## Seeded admin credentials
| Field    | Value               |
|----------|---------------------|
| Email    | `admin@example.com` |
| Password | `Admin@123`         |

Configurable in `appsettings.json` under `Seed:Admin`. The seeder runs on every start but only creates the admin when no active admin exists.

## Using Swagger
1. `POST /api/auth/login` with the admin (or a registered user) -> copy `accessToken`.
2. Click **Authorize**, paste the token, then call protected endpoints.

## Endpoints
| Method | Route | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register a normal user |
| POST | `/api/auth/login` | Public | Returns a JWT |
| GET | `/api/users/me` | Any logged-in user | Current user profile |
| GET | `/api/admin/users` | Admin | List users |
| POST | `/api/admin/users` | Admin | Create a user (role `User` or `Admin`) |
| DELETE | `/api/admin/users/{id}` | Admin | Soft-delete a user |
| POST | `/api/tasks` | Logged-in | Create a task (`title`, `description`, `priority`: Low/Medium/High) |
| GET | `/api/tasks/{id}` | Logged-in (owner) | Get a task - cached in Redis |
| GET | `/api/tasks` | Logged-in | Your tasks, sorted by priority then creation date |
| PATCH | `/api/tasks/{id}/status` | Logged-in (owner) | Set status: Pending / InProgress / Done |

## How the key pieces work
**Auth.** Passwords are hashed with BCrypt. Login returns a JWT (claims: `sub`, `email`, `name`, `role`). `[Authorize]` protects endpoints; `[Authorize(Roles = "Admin")]` restricts admin endpoints. A token validation hook also rejects tokens of soft-deleted users immediately.

**Ownership.** Task queries always check `task.UserId == currentUser`. Another user's task returns `404` (not `403`) so ids cannot be probed. The ownership check also runs on cache hits.

**Redis.** `GET /api/tasks/{id}` is cache-aside: miss -> load from DB and cache (10 min TTL); hit -> served from Redis. Updating the status (or the background worker changing the task) removes the key. Watch the logs for `Cache MISS` / `Cache HIT`. If Redis is down the API falls back to the DB.

**Background processing.** Creating a task saves it, then pushes its id to an in-memory `Channel<Guid>` queue. A `BackgroundService` consumes the queue, waits a simulated delay (3 s, configurable), then marks the task as processed (`processedAt` set; `Pending` -> `InProgress`) and invalidates its cache entry.

**Business logic.**
1. Tasks are sorted by priority first (High -> Low), then creation date (oldest first) - done in the DB query; enums are stored as integers so the ordering is correct.
2. A user cannot create two tasks with the same title (case-insensitive, trimmed) on the same UTC day -> `409 Conflict`.

**Bonus items included:** global exception handling (RFC 7807 problem responses), Docker/Compose, unit tests, structured logging, soft delete for users. Not included: refresh tokens.

## Tests
```bash
dotnet test
```

## Assumptions
- SQL Server is the database and the schema is managed with EF Core migrations, applied automatically at startup (fine for this task; production would usually apply them in a deploy step).
- Public registration always creates a normal `User`; only an admin can create other admins.
- The admin cannot delete their own account. Deleted users are soft-deleted (can be re-registered with the same email).
- An admin only sees/updates their own tasks, like any user (the spec does not give admins task access).
- "Same day" for duplicate detection means the same UTC calendar day.
- The in-memory queue is lost on restart (acceptable per the spec; Hangfire/RabbitMQ would be the next step).
- The JWT key in `appsettings.json` is for development only - override `Jwt__Key` in real deployments.

## Video walkthrough checklist
Project structure -> architecture/layers -> login + JWT + Swagger Authorize -> seeded admin -> admin APIs -> task APIs (+ ownership 404) -> Redis (show MISS then HIT in logs, then invalidation after PATCH) -> background worker (create task, watch status change after ~3 s) -> business rules (duplicate title 409, sorted list).
