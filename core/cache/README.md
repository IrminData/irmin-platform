# Cache

Response caching for the Core API. Wraps Fiber v3's cache middleware with a custom key generator, a pluggable storage backend, and an index that supports prefix-based invalidation scoped per user.

## Purpose

Cache `GET`/`HEAD`/`OPTIONS` responses for a short TTL (default 5 minutes) to shed repeat load from LakeFS, DuckDB, and Postgres when many clients poll the same resource. Cache keys are derived from the request path, sorted query parameters, and the `Authorization` header so each caller sees their own tenancy.

## Key entry points

- `NewAppCacheMiddleware(storage)` — global cache layer wired into the Fiber app.
- `NewResponseCacheMiddleware(storage, ttl)` — per-route variant with a custom TTL.
- `NewDefaultStorage()` — in-memory Fiber storage; swap for Redis/Memcached by implementing `fiber.Storage`.
- `InvalidatePathForCurrentUser`, `InvalidatePathsForCurrentUser`, `InvalidatePathPrefixForCurrentUser`, `InvalidatePathPrefixForAllUsers` — surgical invalidation hooks that controllers call after mutating state.
- `TrackKeyForRequest` — runs inside the key generator to record each cached key into per-user and global prefix indexes, which is what lets prefix invalidation work without a key-scan.

## Integration

Mounted by the HTTP pipeline before controllers (see the pipeline diagram in `../AGENTS.md`). Invalidation is the responsibility of the controller/service layer — whenever a write path changes data that a cached `GET` exposed, it must call one of the `Invalidate*` helpers to evict the stale entry and its `_body`, `_GET`, `_auth_<hash>` variants that Fiber v3 maintains internally.
