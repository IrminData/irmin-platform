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

The root go.work includes every in-repository Go module and resolves
github.com/IrminData/irmin-platform/sdks/go from sdks/go for local development.
Keep the published dependency in go.mod and do not commit local replace
directives.

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

Read core/AGENTS.md. Use Go 1.26.5+, Fiber, GORM, structured slog logging, and
the project golangci-lint configuration.

### ai/

Read ai/AGENTS.md. Use Node.js 24+, TypeScript strict mode, Fastify,
LangChain, Drizzle, and Qdrant conventions already established there.

### console/

Read console/AGENTS.md and console/DESIGN.md before UI work. Preserve
Next.js, React, accessibility, localization, and design-system conventions.

### connectors/

Use Go 1.26.5+, Fiber, GORM, structured logging, and the local golangci-lint
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

## Cursor Cloud specific instructions

### Toolchain
- Node projects require **Node.js 24+** and **pnpm 11.18.0** (`packageManager` in `ai/` and `console/`). Prefer the nvm-managed Node (`nvm use 24`) so `/exec-daemon/node` (often Node 22) does not win on `PATH`.
- Go modules use the workspace in `go.work` (Go **1.26.5+**). Run Go commands from the repo root or project dirs as documented in CONTRIBUTING.md.

### Infra (Docker Compose)
Bring up dependencies before app processes (do **not** put these in the update script):

```bash
cd core && docker compose up -d db_api db_lakefs minio lakefs
cd ../connectors && docker compose up -d db_connectors
cd ../ai && docker compose up -d db_ai qdrant
```

Then create MinIO buckets `lakefs` and `irmin`, and complete LakeFS first-time setup (`POST /api/v1/setup_lakefs`) if the LakeFS volume is empty. Point `core/.env` at `localhost` ports (`5433` for Core Postgres, `8000` for LakeFS, `9000` for MinIO) — OrbStack `*.irmin.orb.local` hosts will not resolve in Cloud Agent VMs.

**LakeFS → Core webhooks:** Core rewrites `localhost` webhook URLs to `host.docker.internal`. On Linux DinD, give LakeFS that host via a **local** (untracked) `core/docker-compose.override.yml`:

```yaml
services:
  lakefs:
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

Without this, repository create/upload commits can fail LakeFS pre-commit hooks.

### App processes (dev)
| Service | Command | Health |
| --- | --- | --- |
| Core | `cd core && go run main.go` (or `air`) | `GET :8082/readyz` |
| Connectors | `cd connectors && go run main.go` | `GET :8080/readyz` |
| AI | `cd ai && pnpm db:migrate && pnpm dev` | `GET :3001/health` |
| Console | `cd console && pnpm dev` | `https://localhost:3000` (self-signed) |

Cross-service tokens in `.env` must stay aligned (`TOKEN` ↔ connectors `IRMIN_API_TOKEN` ↔ AI `IRMIN_SYSTEM_TOKEN`; Core `AI_SERVICE_SYSTEM_TOKEN` ↔ AI `AI_API_SYSTEM_TOKEN`).

### Auth / Clerk
Core validates Clerk JWTs with **HS512** using `CLERK_SIGNING_KEY` and the Clerk JWT template named **`irmin-core`**. Default Clerk session tokens (RS256) will be rejected. Console sign-in uses Clerk; automated browser form fill may be blocked by Clerk’s client-side protections.

### Validation gotchas
- Default hermetic gate: `make validate` (see root Makefile / README). `make test-core` needs the live Core integration env and is not part of that gate.
- `make lint-go` pins `golangci-lint@v2.6.1`, which is built with Go 1.25 and **fails** against this repo’s Go 1.26.5 `go.mod` until the pin is raised. Prefer a newer golangci-lint locally if you need Go lint in Cloud Agents.
- AI `pnpm db:migrate` can hang after printing success; if so, interrupt and rely on the migrate-on-boot path in `pnpm dev`.

### Commands reference
Standard install/lint/test/run commands live in root `README.md`, `CONTRIBUTING.md`, and each project’s `AGENTS.md` / README — prefer those over duplicating here.
