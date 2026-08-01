# ADR 0002: Publish SDKs from monorepo subdirectories

- Status: Accepted
- Date: 2026-08-01

## Context

The imported Go SDK retained the standalone module path
`github.com/IrminData/irmin-sdk-go`. That path resolves versions and source from
the standalone repository, so tags created in `irmin-platform` cannot publish
it. Keeping that path would require a writable subtree mirror and would prevent
the old SDK repository from being archived.

More language SDKs are expected. Each needs an independent compatibility and
release cadence without recreating a repository per language.

## Decision

Publish each SDK as a nested module from `sdks/<language>/` in
`IrminData/irmin-platform`.

The Go SDK module path is
`github.com/IrminData/irmin-platform/sdks/go`. Its repository tags use the Go
nested-module prefix `sdks/go/vX.Y.Z`; callers request the ordinary module
version `vX.Y.Z`.

Create releases through the repository's Go SDK release workflow. The workflow
validates the version, module path, and SDK tests before creating the annotated
tag and GitHub release from `main`.

## Consequences

The standalone `IrminData/irmin-sdk-go` repository can be archived with the
other legacy repositories. Existing users of its untagged pseudo-versions must
change their imports and requirements to the monorepo module path.

Future SDKs receive their own module metadata and tag prefix, such as
`sdks/python/vX.Y.Z`, without sharing the Go SDK's version sequence.
