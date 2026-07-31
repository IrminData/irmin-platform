# ADR 0001: Use one repository for the Irmin platform

- Status: Accepted
- Date: 2026-08-01

## Context

Core, AI, Console, Connectors, and the Go SDK frequently require coordinated
changes. Separate repositories made those changes non-atomic and required one
worktree, branch, CI result, and pull request per repository.

The projects remain independently buildable and deployable. The Go SDK also
retains an established external module path and standalone distribution
repository.

## Decision

Use IrminData/irmin-platform as the canonical development repository for:

- irmin/
- irmin-ai/
- irmin-console/
- irmin-connectors/
- sdks/go/

Preserve each approved source default-branch history under its destination
path and join them with explicit unrelated-history merge commits. Preserve
release tags using project namespaces. Keep old repositories untouched during
migration so historical pull requests, issues, and abandoned branches remain
available.

Keep independent module metadata, lockfiles, deployment configuration, and
release cadence. New language SDKs belong under sdks/<language>/.

## Consequences

Cross-project work can use one branch, worktree, commit graph, pull request, and
CI view. Root automation must use path filters so independent projects do not
build or deploy unnecessarily.

Nested GitHub workflows are replaced by root workflows because GitHub only
loads workflow files from the repository-root .github/workflows directory.

The Go SDK's standalone publication flow needs a verified subtree mirror before
the monorepo becomes its release source. The old repositories are not archived
or modified by this decision.
