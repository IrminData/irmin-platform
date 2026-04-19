# Irmin Core API — Handbook

Hand-written technical documentation for the Core API: architecture, data flows, subsystem explainers, and how-to guides. This is the place to look for *why* and *how it works*.

For auto-generated API reference — Go package docs, Swagger/OpenAPI — run `../generate-docs.sh` and open `../docs/html/index.html`. The script also renders every page in this folder into that index so readers have one entry point.

## Handbook

| Guide | Topic |
| --- | --- |
| [Billing Architecture](./billing-architecture.md) | How the optional Polar.sh billing integration is wired through Core, Console, and the usage tracker |
| [Connector Architecture](./connector-architecture.md) | Core-side view of connectors: lifecycle, auth layers, OAuth flow, details/settings split, encryption at rest, schemas, workflows |
| [Connecting Irmin to Your Tools](./connecting-to-irmin.md) | End-user guide for creating connections. Covers concepts (details vs. settings, OAuth, testing, operation types, "Everything is a File", schemas, workflows) plus walkthroughs for Postgres, HTTP, Stripe, Pinecone, Firecrawl |
| [OAuth Roadmap](./oauth-roadmap.md) | **Temporary** — phased implementation plan for OAuth-backed connectors (Stripe, Linear, Google Drive). Removed once implementation is complete |

## Package documentation

Each package ships its own `README.md`. Start here when you want to understand what a specific piece of the codebase does.

| Package | What it covers |
| --- | --- |
| [bucket](../bucket/README.md) | Bucket Storage — object storage abstraction over S3-compatible backends |
| [cache](../cache/README.md) | Response caching middleware with prefix-scoped invalidation |
| [compute-sandbox](../compute-sandbox/README.md) | Isolated Python / Node / Go script execution |
| [connectors-client](../connectors-client/README.md) | HTTP client for the external `irmin-connectors` service |
| [controllers](../controllers/README.md) | HTTP request handlers organized by domain |
| [db](../db/README.md) | Database Models — GORM + pgx, PostgreSQL LISTEN/NOTIFY |
| [duckdb](../duckdb/README.md) | DuckDB Integration — columnar SQL, field mapping, format conversion |
| [e2e-tests](../e2e-tests/README.md) | End-to-end test suite |
| [embeddings](../embeddings/README.md) | Native vector embeddings and search |
| [engine](../engine/README.md) | Data Engine — central data-operations abstraction over LakeFS |
| [formatter](../formatter/README.md) | Response formatting, SQID obfuscation, serialization |
| [gc](../gc/README.md) | Garbage Collection — orphan cleanup, retention, LakeFS GC rules |
| [lakefs](../lakefs/README.md) | LakeFS Client — branches, commits, tags, webhooks |
| [lib](../lib/README.md) | Shared utilities (workflow creation, notifications, HTTP clients) |
| [locales](../locales/README.md) | Internationalization |
| [mcp](../mcp/README.md) | Model Context Protocol server for AI agents |
| [middlewares](../middlewares/README.md) | Auth, authorization, resource extraction |
| [orchestrator](../orchestrator/README.md) | Event-driven workflow scheduling and execution |
| [permissions](../permissions/README.md) | Workspace-scoped RBAC and policy evaluation |
| [routes](../routes/README.md) | API route composition |
| [sentry](../sentry/README.md) | Sentry initialization, flush, panic recovery |
| [services](../services/README.md) | Service layer — business rules between controllers and engines |
| [templatefiles](../templatefiles/README.md) | Embedded template files |
| [templates](../templates/README.md) | Workflow / script templates |
| [utils](../utils/README.md) | Utilities |

## Contributing

When adding a new handbook page:

1. Drop a `*.md` file into this folder (not `README.md` — that's this index).
2. Start with an H1 heading — the generated docs use it as the page title (so authoring "OAuth Connectors" stays that way and isn't sed-mangled into "Oauth Connectors").
3. Link to related package READMEs using relative paths; the generator rewrites `.md` → `.html` at render time so the same links work on GitHub and inside the rendered docs site.
4. Add a row to the Handbook table above.
