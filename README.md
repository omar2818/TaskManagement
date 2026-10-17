# Task Management - .NET 10 API + React frontend

Full-stack Task Management application.

- **Stage 1 (backend):** ASP.NET Core Web API with JWT auth, role-based authorization, Redis caching, a background worker, SQL Server (EF Core migrations), Swagger and a DDD-style layered structure.
- **Stage 2 (frontend):** React 18 + TypeScript (strict) single-page app in `frontend/`, built with Vite, React Router and TanStack Query. It calls the real API (no mock data).

## Project structure

```
src/
  TaskManagement.Domain          Entities (User, TaskItem), enums, domain rules, repository interfaces. No dependencies.
  TaskManagement.Application     Use cases/services, DTOs, abstractions (cache, queue, hasher, JWT). Depends on Domain only.
  TaskManagement.Infrastructure  EF Core + SQL Server, migrations, repositories, seeding, BCrypt, JWT generation, Redis cache, queue + worker.
  TaskManagement.Api             Controllers, middleware, Swagger, authentication/authorization wiring.
tests/
  TaskManagement.Tests           xUnit + Moq unit tests (services and domain).
frontend/                        React + TypeScript SPA (see "Frontend structure" below).
```
Dependency direction: `Api -> Infrastructure -> Application -> Domain`. Business rules live in Domain/Application; the outer layers only implement interfaces.

## Prerequisites
- .NET 10 SDK
- Node.js 20 or newer (for the frontend)
- Docker (for SQL Server + Redis, or to run everything)

## Run backend + frontend together

### Option A - everything in Docker (one command)
```bash
docker compose up --build
```
- Frontend: http://localhost:3000
- API / Swagger: http://localhost:8080/swagger

### Option B - local development
```bash
# 1. database + Redis
docker compose up -d sqlserver redis

# 2. API (http://localhost:5080) - applies migrations and seeds the admin on startup
dotnet run --project src/TaskManagement.Api

# 3. frontend (http://localhost:5173)
cd frontend
cp .env.example .env        # Windows Command Prompt: copy .env.example .env
npm install
npm run dev
```
Swagger (local): http://localhost:5080/swagger

If you change `frontend/.env`, restart `npm run dev` (Vite reads it only at startup).

On startup the API applies pending EF Core migrations (retrying while SQL Server boots) and then seeds the admin, so no manual database step is needed.

Local SQL Server connection (matches docker-compose): `sa` / `Your_strong_Passw0rd!` - change it for anything beyond local dev.

## Seeded admin credentials
| Field    | Value               |
|----------|---------------------|
| Email    | `admin@example.com` |
| Password | `Admin@123`         |

Configurable in `appsettings.json` under `Seed:Admin`. The seeder runs on every start but only creates the admin when no active admin exists. Register any new account in the UI to get a normal user.

## Environment variables
| App | Variable | Purpose | Default |
|---|---|---|---|
| Frontend | `VITE_API_URL` | Base URL of the API (read in one place: `src/api/client.ts`) | `http://localhost:5080` (see `.env.example`) |
| API | `ConnectionStrings__Default` | SQL Server connection string | see `appsettings.json` |
| API | `ConnectionStrings__Redis` | Redis connection string | `localhost:6379,...` |
| API | `Jwt__Key` / `Jwt__Issuer` / `Jwt__Audience` | JWT settings (key must be at least 32 characters) | dev values in `appsettings.json` |
| API | `Cors__AllowedOrigins__0` (`__1`, ...) | Browser origins allowed to call the API | `http://localhost:5173` |
| API | `Seed__Admin__Email` / `Password` / `Name` | Seeded admin | `admin@example.com` / `Admin@123` |

## Migrations
```bash
dotnet tool install --global dotnet-ef   # once
dotnet ef migrations add <Name> -p src/TaskManagement.Infrastructure -s src/TaskManagement.Api -o Persistence/Migrations
dotnet ef database update -p src/TaskManagement.Infrastructure -s src/TaskManagement.Api   # optional; the app also does this on start
```
Migrations: `InitialCreate` (Stage 1) and `EnforceUniqueTaskTitlePerDay` (Stage 2).

## Using Swagger
1. `POST /api/auth/login` with the admin (or a registered user) -> copy `accessToken`.
2. Click **Authorize**, paste the token, then call protected endpoints.

## API endpoints
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

Error responses use RFC 7807 problem details with these status codes: 400 validation, 401 invalid login/token, 403 forbidden, 404 not found, 409 duplicate email or duplicate task title.

## How the key backend pieces work
**Auth.** Passwords are hashed with BCrypt. Login returns a JWT (claims: `sub`, `email`, `name`, `role`). `[Authorize]` protects endpoints; `[Authorize(Roles = "Admin")]` restricts admin endpoints. A token validation hook also rejects tokens of soft-deleted users immediately.

**Ownership.** Task queries always check `task.UserId == currentUser`. Another user's task returns `404` (not `403`) so ids cannot be probed. The ownership check also runs on cache hits.

**Redis.** `GET /api/tasks/{id}` is cache-aside: miss -> load from DB and cache (10 min TTL); hit -> served from Redis. Updating the status (or the background worker changing the task) removes the key. Watch the logs for `Cache MISS` / `Cache HIT`. If Redis is down the API falls back to the DB.

**Background processing.** Creating a task saves it, then pushes its id to an in-memory `Channel<Guid>` queue. A `BackgroundService` consumes the queue, waits a simulated delay (3 s, configurable), then atomically marks the task as processed (`processedAt` set; `Pending` -> `InProgress`) and invalidates its cache entry.

**Business logic.**
1. Tasks are sorted by priority first (High -> Low), then creation date (oldest first) - done in the DB query; enums are stored as integers so the ordering is correct.
2. A user cannot create two tasks with the same title (case-insensitive, trimmed) on the same UTC day -> `409 Conflict`. This is checked in the service and enforced by a database unique index.

**Bonus items included:** global exception handling, Docker/Compose, unit tests, structured logging, soft delete for users. Not included: refresh tokens.

## Frontend structure
```
frontend/src
  api/         types.ts (request/response types), client.ts (the ONE fetch client), endpoints.ts
  auth/        AuthContext (session state), routes.tsx (ProtectedRoute, RequireRole), tokenStorage.ts
  hooks/       TanStack Query hooks: useTasks (with polling), useUsers
  components/  Layout, Badges, FormField, ConfirmDialog, CreateTaskForm, StateMessages
  pages/       Login, Register, Tasks, TaskDetails, AdminUsers, NotFound, AccessDenied
  utils/       validation.ts (rules mirror the API), format.ts
```

## How the frontend works
- **Token:** stored in `localStorage` together with its expiry, so a page refresh keeps you logged in while the token is valid; on load the app calls `GET /api/users/me` to restore the user. (Trade-off: localStorage can be read by injected scripts; an httpOnly cookie would need a different backend flow.)
- **API client:** one `request()` function adds `Authorization: Bearer ...`, turns problem-details errors into a readable `ApiError`, and on any **401** calls a single handler that clears the session. `ProtectedRoute` then redirects to `/login` with a "session expired" message.
- **Protected routes:** everything except `/login` and `/register` is behind `ProtectedRoute`. `/admin/users` is also behind `RequireRole("Admin")`, which shows "Access denied" to normal users. The Users menu item is hidden for non-admins.
- **Background processing visibility:** the task list and details page poll every 2 seconds while any task is still waiting for the worker (`status = Pending` and `processedAt = null`) and stop automatically afterwards. I chose polling because it is simple, works through any proxy, and the worker finishes within a few seconds; SSE/SignalR would be more efficient but add a new backend component.
- **Delete confirmation:** a native `<dialog>` rendered inside the page (not `window.confirm`).

## Changes since Stage 1
1. **CORS** - allow-list read from `Cors:AllowedOrigins` (default `http://localhost:5173`; Docker adds `http://localhost:3000`). Only the needed headers and methods are allowed. *Why:* browsers block cross-origin calls otherwise.
2. **JSON error bodies for 401/403** - `AddProblemDetails()` + `UseStatusCodePages()`. *Why:* the JWT challenge/forbidden responses were empty and the UI needs a consistent error format. (400/404/409 and domain errors were already mapped by the exception middleware; no endpoint returns 500 for them.)
3. **UTC dates** - EF value converters mark `DateTime` values as UTC. *Why:* SQL Server returns `Unspecified` kinds, so the JSON had no `Z` and browsers showed wrong local times.
4. **Database-enforced duplicate-title rule** - migration `EnforceUniqueTaskTitlePerDay` adds persisted computed columns (`LOWER(Title)`, `CAST(CreatedAt AS date)`) and a unique index per user. The exception middleware maps a unique-index violation to **409** with a readable message. *Why:* the Stage 1 check-then-insert could let two simultaneous requests create duplicates.
5. **Atomic background update** - the worker now uses a single `UPDATE` (`ExecuteUpdateAsync`) that sets `ProcessedAt` and moves only `Pending -> InProgress`. *Why:* the old load-modify-save could overwrite a status the user changed at the same moment.
6. **Docker Compose** - added a `frontend` service (nginx) so the whole stack starts with one command.

## Enhancements (beyond the brief)
- Duplicate task titles and duplicate emails are protected at database level (409 even under concurrent requests); the worker can no longer overwrite a user's status change (changes 4 and 5 above).
- Session expiry is handled in one place: any 401 logs the user out with a clear message, and after logging in again they return to the page they were on.
- Form input is kept after server errors, submit buttons are disabled while a request runs, and server validation messages appear next to the field.
- Fewer API calls: TanStack Query caching, detail cache seeded after create/update, polling only while a task awaits processing, no retries on 4xx errors, and the cache is cleared on logout so users never see each other's data.
- Admins cannot delete themselves (button hidden in the UI, 409 in the API); deleted users' tokens stop working immediately.
- Accessibility: labelled inputs, `aria-invalid` and described-by error text, visible focus, skip link, `role="status"/"alert"` messages, native modal dialog.

## Tests
```bash
dotnet test                       # backend (xUnit + Moq)
cd frontend && npm test           # frontend validation and error-message tests (Vitest)
```

## Assumptions
- SQL Server is the database; the schema is managed with EF Core migrations that are applied automatically at startup.
- Public registration always creates a normal `User`; only an admin can create other admins.
- The admin cannot delete their own account. Deleted users are soft-deleted, and their email can be registered again.
- An admin sees and updates only their own tasks, like any other user (the spec gives admins no task access).

## AI tools
I used **Claude Code** (Anthropic) to help me implement some of the features in this project. I reviewed, ran and tested the generated code, and I understand it and can explain and change it during the technical interview.

## Video walkthroughs
- Stage 1 (backend): https://drive.google.com/drive/folders/16BBsaXSZnXTuEh3SWpLLKyUEem65yH3s?usp=sharing
- Stage 2 (frontend): you can find the video in same folder of Stage 1
