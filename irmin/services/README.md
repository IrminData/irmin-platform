# Services

Service layer that sits between controllers and the persistence / engine layers. Each file covers one domain (workspaces, repositories, workflows, connections, etc.) and encapsulates the business rules that don't belong in an HTTP handler or a DB model.

## Purpose

Controllers should be thin. Engines (LakeFS, DuckDB, compute sandbox) expose low-level primitives. Services are where the policy lives: which role can do what, how a connection subscribes to a vendor, how billing counts usage, how OAuth state is persisted, how an AI application's prompt and tool definitions are assembled.

## Key entry points

- `APIServices` (`services.go`) — aggregate holding every service plus shared deps (DB, Logger, Env, Orchestrator, SQIDManager, LocaleManager, PermissionService, Validator, CacheStorage, BillingService, UsageTracker, ConnectionOAuthService, compute sandbox).
- `NewAPIServices(...)` — constructor that wires all of the above.
- Domain services: `BillingService` (`billing.go`), `UsageTracker` (`usage.go`), `ConnectionOAuthService` (`connectionoauth/`), `AuthCache` (`auth.go`), plus a file per noun (`workspaces.go`, `repositories.go`, `workflows.go`, `connections.go`, `queries.go`, `policies.go`, `users.go`, `ai-applications.go`, etc.).
- `ErrorHandler` (`errors.go`) — translates service errors into locale-aware HTTP responses; used by both controllers and middlewares.

## Integration

Controllers receive an `*APIServices` and call methods on it. Middlewares hold the same pointer to reach the permission service and error handler. Services call back into `../db` (GORM + pgx), `../lakefs`, `../engine`, `../connectors-client`, and `../compute-sandbox`.
