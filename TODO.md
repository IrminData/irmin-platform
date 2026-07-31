# Platform TODO

## Repository cutover

- [ ] Complete a legal and licensing review before changing repository
  visibility.
- [ ] Enable private vulnerability reporting and appropriate repository
  rulesets.
- [ ] Reconnect deployment providers only after the monorepo pipelines are
  validated.
- [ ] Archive standalone repositories only after an explicit later decision.

## SDK releases

- [ ] Define the language-neutral SDK compatibility and release policy.
- [ ] Add a history-preserving sdks/go subtree mirror to
  IrminData/irmin-sdk-go.
- [ ] Define namespaced monorepo tags for every language SDK.
- [ ] Add SDK templates only when the second language SDK is started.

## Tooling

- [ ] Separate Core's hermetic and environment-backed tests, fix the existing
  cache invalidation failures, and add the hermetic Core suite to default CI.
- [ ] Decide whether the two Node projects should eventually share a root pnpm
  lockfile and task runner; preserve independent lockfiles until then.
- [ ] Add deployment path filters after current provider integrations are
  inventoried.
