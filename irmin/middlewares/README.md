# Middlewares

Fiber middlewares that run between the HTTP layer and controllers. They extract request context, enforce auth and permissions, and resolve domain objects (workspace, repository, workflow, etc.) so handlers receive a ready-to-use request.

## Purpose

Middlewares own cross-cutting concerns:

- **Authentication**: Clerk JWT (`auth.go`) and API tokens, plus specialized flows for AI applications (`ai-application-auth.go`), connector webhooks (`connector-webhook.go`), and invites (`invite.go`).
- **Authorization**: policy-engine lookups (`permissions.go`, `policy.go`) against the workspace-scoped RBAC in `../permissions`.
- **Resource extraction**: parse SQID path parameters and hydrate the matching DB record into the request context (`resource_middleware.go`, `workspace.go`, `repository*.go`, `workflow.go`, `script.go`, `user.go`, `workspace-tag.go`, `connection*.go`, `ai-application.go`, `query.go`).
- **Ambient context**: locale resolution (`locale.go`), billing gating (`billing.go`), response-size accounting (`response_size_monitor.go`).

## Key entry points

- `APIMiddlewares` — holds shared dependencies (DB, Logger, Env, Orchestrator, Services, PermissionService, Validator, error handler).
- `NewAPIMiddlewares(apiServices)` — wires it up from an `*services.APIServices`.
- Per-resource middleware constructors on `APIMiddlewares` (e.g. `*.Repository`, `*.Workflow`, `*.Permissions`) that routes compose in `../routes`.

## Integration

Registered in `../routes` in the order shown by the request pipeline diagram in `../CLAUDE.md`. Middlewares report translation-aware errors through the shared `services.ErrorHandler` so the client sees localized messages while the server log keeps the raw cause.
