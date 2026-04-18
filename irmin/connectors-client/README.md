# Connectors Client

In-process HTTP client for the external `irmin-connectors` service. The Core API uses it whenever a workflow needs to talk to a data source (pull, push, subscribe, inspect schema, fetch config fields).

## Purpose

The connectors service is a separate deployment: each connector (Postgres, S3, HTTP, etc.) lives behind its own base URL. This package is the boundary — it wraps those endpoints as typed Go methods and handles the two things Core is uniquely responsible for:

1. **Operation tokens**: short-lived credentials minted by Core and passed to the connector so it can act on behalf of a specific workflow run.
2. **Connection identity**: every outbound request carries an `X-Irmin-Connection-Id` header so the connector can call Core's internal OAuth endpoint to fetch a fresh vendor access token when required.

## Key entry points

- `NewClient(baseURL, token, locale)` — construct a client scoped to one connector and (typically) one operation.
- `Client.OperationPull(ctx, path)` — stream records from the source as `PulledFile`s.
- `Client.OperationPush(ctx, ...)` — send records upstream.
- `Client.OperationSubscribe` — long-lived subscribe/webhook registration.
- `Client.GetInfo`, `Client.GetSchema`, `Client.GetConfigFields` — metadata endpoints used by the UI and workflow planner.
- `Client.Patch` — apply a partial update to the connector's remote state.
- `HeaderConnectionID` — exported so `irmin-connectors` can read the exact same string.

## Integration

Called by the orchestrator during import/export workflow execution (`engine.DataImport` / `engine.DataExport`) and by controllers that surface connector metadata in the UI. The HTTP client has a default timeout for unary calls and a separate no-timeout client (sharing the same transport/connection pool) for streaming pulls.
