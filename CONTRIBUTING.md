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

    cd irmin && go mod download
    cd ../irmin-connectors && go mod download
    cd ../sdks/go && go mod download
    cd ../../irmin-ai && pnpm install --frozen-lockfile
    cd ../irmin-console && pnpm install --frozen-lockfile

The root go.work makes the local Go SDK available to Core and Connectors. Do not
add local replace directives to committed go.mod files.

## Validation

Run the narrowest relevant checks during development and make validate before
requesting final review. Run make test-core for Core changes when its documented
integration environment is available. Project-specific commands remain
documented in each project README.

Tests should exercise observable behavior, meaningful errors, permissions,
data changes, or rendered output. Avoid tests that only restate mocks.

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
and publication workflow.

## Documentation

Keep root guidance accurate when repository shape or shared workflow changes.
Keep project documentation beside the implementation it describes. Run the
project documentation generator when generated references are affected.
