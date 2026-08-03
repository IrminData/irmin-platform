# Contributing to Irmin

Thank you for contributing to Irmin. This repository contains independently
deployable projects that share one Git history and review flow.

## Before you start

1. Read the root AGENTS.md.
2. Read the nearest project-level AGENTS.md and README.
3. Create a focused branch or worktree from main.
4. Keep populated environment files local and untracked.

For an isolated cross-project checkout:

    git worktree add ../irmin-platform-worktrees/short-name -b agent/short-name

## Setup

Install dependencies only for the projects you are changing:

    cd core && go mod download
    cd ../connectors && go mod download
    cd ../sdks/go && go mod download
    cd ../../ai && pnpm install --frozen-lockfile
    cd ../console && pnpm install --frozen-lockfile

The root go.work includes every in-repository Go module and makes the local Go
SDK available to each consumer. Do not add local replace directives to
committed go.mod files or use workspace toggle scripts.

## Validation

Run the narrowest relevant checks during development and make validate before
requesting final review. Run make test-core for Core changes when its documented
integration environment is available. Project-specific commands remain
documented in each project README.

Tests should exercise observable behavior, meaningful errors, permissions,
data changes, or rendered output. Avoid tests that only restate mocks.

Before pushing, scan the complete repository history for secrets:

    gitleaks git . --config .gitleaks.toml --redact --no-banner

CI runs the same full-history scan on pull requests, pushes to main, and a
weekly schedule. Historical false positives must be reviewed before adding a
fingerprint-specific entry to `.gitleaksignore`; do not add broad path or rule
exclusions.

## Pull requests

- Keep each pull request focused on one coherent outcome.
- Explain affected projects, migrations, operational impact, and validation.
- Update documentation and TODOs in the same change.
- Include screenshots for user-visible Console changes.
- Do not commit secrets, generated caches, local databases, or populated env
  files.
- Address every review comment with a fix or an evidence-backed response.

Cross-project changes should remain atomic. Do not split an SDK contract change
from the Core or Connectors changes required to consume it.

## Releases and deployments

Projects retain independent release and deployment pipelines. Path-scoped CI
validates only affected projects. A successful monorepo merge does not imply
that every project must be deployed.

SDK releases require their own compatibility review, language-specific tag,
and publication workflow. The Go SDK uses `sdks/go/vX.Y.Z` repository tags;
follow [docs/releasing-go-sdk.md](docs/releasing-go-sdk.md).

## Documentation

Keep root guidance accurate when repository shape or shared workflow changes.
Keep project documentation beside the implementation it describes. Run the
project documentation generator when generated references are affected.
