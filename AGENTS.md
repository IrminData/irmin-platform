# AGENTS.md

This file provides repository-wide guidance to coding agents. CLAUDE.md and
GEMINI.md are aliases of this file.

## Repository model

Irmin Platform is one Git repository containing independently buildable and
deployable projects:

- core/: Core API in Go
- ai/: AI runtime in TypeScript
- console/: Next.js console in TypeScript
- connectors/: connector runtime in Go
- sdks/go/: public Go SDK

Future SDKs belong under sdks/<language>/.

Read this file first, then read the nearest project-level AGENTS.md. More
specific instructions win for files inside that project.

## Source-control rules

- Treat the repository root as the only Git root.
- Use one branch and pull request for an atomic cross-project change.
- Preserve independent runtime, module, release, and deployment interfaces.
- Never add nested .git directories or submodules for platform projects.
- Never commit populated .env files, credentials, local databases, caches,
  build output, or agent worktrees.
- Existing standalone repositories are historical sources and must not be
  updated as part of ordinary monorepo development.

## Shared development

The root go.work resolves
github.com/IrminData/irmin-platform/sdks/go from sdks/go for local Core and
Connectors development. Keep the published dependency in go.mod and do not
commit local replace directives.

Node projects retain independent pnpm lockfiles. Run pnpm commands from the
project directory; do not consolidate lockfiles without a dedicated migration.

Common validation:

    make validate
    make test-go
    make test-core
    make lint-go
    make validate-ai
    make validate-console

make validate uses the hermetic Connectors and Go SDK tests. The full Core
suite is make test-core; it requires its documented integration environment
and has known imported cache invalidation failures recorded in TODO.md.

## Project routing

### core/

Read core/AGENTS.md. Use Go 1.25+, Fiber, GORM, structured slog logging, and
the project golangci-lint configuration.

### ai/

Read ai/AGENTS.md. Use Node.js 24+, TypeScript strict mode, Fastify,
LangChain, Drizzle, and Qdrant conventions already established there.

### console/

Read console/AGENTS.md and console/DESIGN.md before UI work. Preserve
Next.js, React, accessibility, localization, and design-system conventions.

### connectors/

Use Go 1.25+, Fiber, GORM, structured logging, and the local golangci-lint
configuration. Connector contracts shared with Core belong in sdks/go/.

### sdks/

Use a language directory per SDK. Public types require concrete domain names,
compatibility review, tests, documentation, and an explicit release plan.
The Go SDK module path is github.com/IrminData/irmin-platform/sdks/go. Release
tags must use the nested-module prefix sdks/go/vX.Y.Z; use the documented
release workflow rather than creating tags by hand.

## Quality rules

- Make the smallest coherent change across all affected projects.
- Add meaningful tests for behavior changes.
- Keep exported TypeScript functions documented.
- Keep Go lines within 120 characters and honor each .golangci.yml.
- Preserve existing generated-file workflows; edit generated sources rather
  than derived outputs.
- Update README, CONTRIBUTING, architecture guidance, and TODOs when their
  claims change.

## Environment and deployments

Each project owns its environment example and deployment configuration.
Populated .env files are local-only. Do not copy secrets into tests, examples,
issues, commits, or tool output.

Deployments are independent even though source control is shared. A change in
one project must not silently redeploy unrelated projects.

## Handoff

Before finishing substantive work, run the document-release skill to reconcile
maintained documentation with what actually shipped. Report validation,
remaining deployment steps, and any project not exercised locally.
