# Irmin Connectors — Guides

Deep-dive documentation for the Irmin Connectors system: what it is, how
it works, and how to add to it. The top-level `README.md` covers the
quick-start; everything here is for readers who need to **build**,
**extend**, or **reason about** connectors beyond the surface level.

These pages are also rendered into the generated documentation site
(`docs/html/index.html` after running `./generate-docs.sh`), so they sit
alongside the auto-generated Go-package reference and Swagger API docs.

## What's in this directory

### [`concepts-and-processes.md`](concepts-and-processes.md)

The mental model. Read this first if you want to understand why the
system is shaped the way it is.

- What a connector, operation, and capability are
- How registration works end-to-end
- The "Everything is a File" philosophy
- How data flows between connectors and Core (ZIP, HTTP, chunking)
- Webhooks, patch events, and JSON Patch (RFC 6902) semantics
- Security model: system tokens, operation tokens, external auth tiers
- **OAuth-backed connectors**: full flow diagram, key invariants,
  static-vs-DCR comparison, and the `X-Irmin-Connection-Id` wire
  contract

### [`how-to-create-connectors.md`](how-to-create-connectors.md)

The how-to. Read this when you're actually writing a new connector.

- Directory layout + required files
- Standard endpoints the connector must expose
- Authentication: system tokens, operation tokens, middleware
- Models: `ConnectionSettings` and `ConnectionDetails`
- Dynamic configuration field patterns
- Details-page templates
- Step-by-step implementation sequence + testing checklist
- **OAuth-backed connectors**: what changes vs. the static-credential
  path, how to declare `ConnectionOAuthConfig` on `/info`, using
  `lib.OAuthTokenClient` in handlers, sentinel-to-HTTP mapping,
  operator setup for static-client vendors

### [`oauth-connectors.md`](oauth-connectors.md)

The OAuth-specific playbook. Read this when you're adding a new OAuth
vendor integration or deciding between static-client and DCR.

- Planned OAuth connectors (Stripe, Linear, Google Drive) and why those
- End-to-end flow diagram, all the way from Connect-click to the first
  vendor API call
- Static client vs Dynamic Client Registration: operator setup, failure
  modes, which vendors fit which pattern
- The 6-step recipe for adding a new OAuth connector
- Scope selection guidance (least-privilege defaults per vendor)
- PR scope boundaries: what the OAuth infrastructure ships, what each
  vendor-specific connector ships separately

## Reading order

- **New to the codebase?** Read `concepts-and-processes.md` cover to
  cover.
- **Building a new connector?** Skim `concepts-and-processes.md`, then
  follow `how-to-create-connectors.md` end to end.
- **Building an OAuth connector specifically?** Read the OAuth sections
  of both of the above, then follow the recipe in `oauth-connectors.md`.
- **Extending the OAuth infrastructure itself?** See the Core-side code
  under `irmin/services/oauth/` and `irmin/controllers/oauth.go` — those
  live alongside their unit tests and don't have a dedicated guide yet.

## Conventions used in these guides

- `Core` means the Irmin Core API service (`irmin/` repo).
- `Connectors` (capitalized) means this repo (`irmin-connectors/`); a
  lowercase "connector" is one implementation (Postgres, HubSpot, etc.).
- Paths like `connectors/hubspot/routes.go` are relative to this repo's
  root.
- Code samples are elided where obvious — the actual files in
  `connectors/` are the source of truth.
