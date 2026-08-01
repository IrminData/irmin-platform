# Platform TODO

## Repository follow-up

- [ ] Complete a legal review of ELv2 licensing across the repository.
- [x] Publish the repository after a full-history secret scan and critical
  dependency remediation.
- [x] Enable private vulnerability reporting and appropriate repository
  rulesets.
- [ ] Reconnect deployment providers only after the monorepo pipelines are
  validated.
- [ ] Archive the five migrated standalone repositories after consumer cutover.

## SDK releases

- [ ] Define the language-neutral SDK compatibility and release policy.
- [x] Publish the Go SDK from `sdks/go/` at `v0.1.0`.
- [x] Define namespaced monorepo tags for every language SDK.
- [ ] Add SDK templates only when the second language SDK is started.

## Tooling

- [ ] Separate Core's hermetic and environment-backed tests, fix the existing
  cache invalidation failures, and add the hermetic Core suite to default CI.
- [ ] Decide whether the two Node projects should eventually share a root pnpm
  lockfile and task runner; preserve independent lockfiles until then.
- [ ] Add deployment path filters after current provider integrations are
  inventoried.
