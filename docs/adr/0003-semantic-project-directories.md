# ADR 0003: Use semantic project directories

- Status: Accepted
- Date: 2026-08-01

## Context

The platform projects were initially imported under their standalone repository
names: `irmin/`, `irmin-ai/`, `irmin-console/`, and `irmin-connectors/`. Inside
the canonical `irmin-platform` repository, the repeated brand prefix adds no
meaning and makes paths longer in contributor commands, CI, and deployments.

Directory names are independent of the projects' package, module, runtime, and
deployment identities. More language SDKs are expected under `sdks/`.

## Decision

Use semantic top-level directories:

- `core/` for the Core API
- `ai/` for the AI runtime
- `console/` for the management console
- `connectors/` for the connector runtime
- `sdks/<language>/` for public SDKs

Keep the existing Go module paths, TypeScript package names, runtime names, and
SDK release tags unchanged. Treat the directory move as repository plumbing,
not a package-identity migration.

## Consequences

Contributor guidance, CI path filters, dependency automation, ownership rules,
and deployment root paths use the semantic directories. Git preserves the
imported file history through the rename.

The connector runtime contains its Go packages under `connectors/connectors/`.
That repeated segment is intentional: the outer directory names the deployable
project, while the inner directory is the existing Go package namespace.

The Go SDK remains at `sdks/go/`, so its module path and `sdks/go/vX.Y.Z` tag
namespace are unaffected.
