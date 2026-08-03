# Irmin Platform

Irmin is a source-available data warehouse and management platform with Git-like
data versioning, workflow orchestration, analytics, AI assistance, and
connector-based data integration.

This repository is the canonical development workspace for the platform. Each
runtime remains independently buildable and deployable, while cross-cutting
changes can be reviewed, tested, and shipped as one Git change.

## Repository layout

| Path | Runtime | Purpose |
| --- | --- | --- |
| core/ | Go | Core API, repositories, workflows, analytics, and MCP |
| ai/ | TypeScript | AI agents, embeddings, retrieval, and model integrations |
| console/ | TypeScript | Next.js management console |
| connectors/ | Go | Connector execution and external data integrations |
| sdks/go/ | Go | Public Go client and shared connector models |

Future language SDKs belong under sdks/<language>/ and should keep their own
module metadata, release process, and compatibility policy.

Each top-level project retains its own README, environment example, build
configuration, and detailed agent instructions where applicable.

## Prerequisites

- Go 1.26.5 or newer
- Node.js 24 or newer
- pnpm 11.18.0 or newer
- PostgreSQL, LakeFS, S3-compatible storage, and Qdrant as required by the
  project being run

## Local setup

The committed Go workspace resolves Core, Connectors, and both E2E modules
against the local Go SDK without changing their published module dependencies.
No local replace directives or workspace toggle scripts are needed:

    go test -timeout 2m ./sdks/go/...

Node applications deliberately retain independent lockfiles:

    cd ai && pnpm install
    cd ../console && pnpm install

Environment files are local to each project. Copy the relevant example and
never commit populated environment files:

    cp core/.env.example core/.env
    cp ai/.env.example ai/.env
    cp console/.env.example console/.env
    cp connectors/.env.example connectors/.env

Existing deployments and runtime configuration remain project-specific. See
the README in each project before running or deploying it.

## Validation

Run the default hermetic local gate:

    make validate

Focused gates are available for faster iteration:

    make test-go
    make test-core
    make lint-go
    make validate-ai
    make validate-console

The full Core suite includes environment-backed integration tests and currently
contains four pre-existing cache invalidation failures on the imported default
branch. Run make test-core when its documented services and credentials are
available. It is not part of the default hermetic gate until those tests are
separated and repaired. Other end-to-end suites are also opt-in.

## Working with agents and worktrees

Create one worktree for an entire cross-platform change:

    git worktree add ../irmin-platform-worktrees/my-change -b agent/my-change

Launch the coding agent from that worktree. It can then change Core, Console,
AI, Connectors, and SDK contracts atomically without coordinating repositories.

Read AGENTS.md at the repository root and the nearest project-level AGENTS.md
before changing a project.

## SDK publishing

The Go SDK is published directly from `sdks/go/` as
`github.com/IrminData/irmin-platform/sdks/go`. Install the current release with:

    go get github.com/IrminData/irmin-platform/sdks/go/api@v0.1.0

Install the package you use (`api`, `models`, `connectorsclient`, `duckdb`, and
so on) so Go also records its transitive dependencies. Because the SDK is a
nested Go module, repository tags use the directory-prefixed form
`sdks/go/vX.Y.Z`. Future language SDKs use their own directory, module metadata,
compatibility policy, and tag namespace. See
[docs/releasing-go-sdk.md](docs/releasing-go-sdk.md) for the release process.

## Contributing and security

See CONTRIBUTING.md for development and review expectations. Report security
issues using SECURITY.md rather than a public issue.

## License

This repository, including the Go SDK, is licensed under the
[Elastic License 2.0](LICENSE). Component directories keep local copies of the
same terms where their standalone build or package needs to include a license.
