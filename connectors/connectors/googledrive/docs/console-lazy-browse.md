# Console Lazy-Browse Handoff (Phase 2)

> Status: Phase 1 shipped from this repo. Phase 2 is the matching console work, captured here so it can be picked up without re-investigating.

## What Phase 1 shipped

The Google Drive connector's `/operation/schema` endpoint is now **path-aware**:

| `path` query param | Schema returned |
|---|---|
| empty / missing | `Type=group` containing the legacy `files.json` catalogue plus every immediate child of My Drive |
| `"files"` / `"files.json"` | Legacy metadata-only `ObjectSchema` (back-compat) |
| `"root"` | My Drive's direct children |
| Drive folder ID (`^[A-Za-z0-9_-]{20,}$`) | That folder's direct children |
| Drive file ID | A single leaf `ObjectSchema` describing the file |

Every schema call makes at most one Drive `files.list` or `files.get` request, so a deep walk is one HTTP round-trip per level, not a single eager mega-fetch.

## What Phase 1 does NOT solve

`ConnectionPathSelector.tsx` calls `useConnectionSchema(connectionId, operationMethod)` **once at mount, with no `path` argument**. The hook then either fetches the root (no path) or fetches an explicit list of pre-known paths. Expanding a folder in the picker only toggles local UI state — no follow-up schema call.

Consequence today: the user sees one level (root + its direct children) in the tree, and to navigate deeper they have to **paste a Drive folder ID into the free-text path field** that already exists alongside the picker.

## What Phase 2 enables

Wiring the picker to lazy-fetch on folder-expand turns the same connector schema endpoint into a real recursive browser. Drilling into a folder issues `/operation/schema?path=<driveID>`, the response merges into the tree, the user navigates arbitrarily deep. **Zero new connector work** — the contract is already in place.

This is also useful for any future connector that wants to expose a deep hierarchy without paying the cost of pre-walking it (S3, GCS, SharePoint, NAS browse, etc.).

## Files to change in `console/`

### 1. `src/components/connection/ConnectionPathSelector.tsx`

- Detect a "lazy" group node: `Type === "group" && (Children === null || Children === undefined)`. A folder with `Children: []` should still be treated as "fully expanded, empty folder" — only `null`/`undefined` is the lazy signal.
- In the `toggleFolder` handler (currently around line 318), when the user expands a lazy node:
  1. If we've already fetched this path before, render the cached children. Don't refetch.
  2. Otherwise, issue a schema fetch with `path` = the node's `Path` field, show an inline per-node loading spinner.
  3. On success, merge the response's `Children` into the in-memory tree state, keyed by the node's `Path`.
  4. On failure (auth expired, network), inline an error message under the expanded node. Do NOT blow away the rest of the tree.
- Keep the existing free-text path field intact. Power users who already know the Drive ID can keep pasting it. Both inputs feed the same `import_from_connection_paths` array.

### 2. `src/hooks/api/useConnectionSchema.tsx`

- The hook already takes an optional `paths` array. Add a per-path fetch helper for ad-hoc expansion:
  ```ts
  fetchSchemaForPath(
    connectionId: string,
    operationMethod: 'pull' | 'push',
    path: string,
  ): Promise<ObjectSchema>
  ```
- Or, equivalently, expose the underlying React Query mutation / queryFn so `ConnectionPathSelector` can issue fetches itself.
- Cache key: `(connectionId, operationMethod, path)`. A stale-time of ~60 seconds is fine — Drive folder contents don't change often during a workflow-config session.

### 3. No backend changes

The connector and core are already wired:

- Connector `GetSchema(ctx, client, operationType, path)` accepts the path argument and dispatches on it (Phase 1).
- Core's framework forwards `?path=<value>` to the connector via
  `sdks/go/connectorsclient/schema.go` (URL-encoded once, otherwise verbatim).

## UX details worth getting right

- **Expand-not-hover.** Lazy-fetching on hover is too aggressive when a Drive root has dozens of folders.
- **Animate the transition** from spinner → tree node. Without it the picker feels janky when fetches return in 100–300 ms.
- **Per-node error containment.** A lazy-fetch failing in one branch shouldn't collapse the rest of the tree.
- **Keep the free-text field.** It's the escape hatch for everything the picker can't surface (deep folder IDs the user already has, search-mode placeholder, slash-paths on push).

## Test plan

- **Unit:** mock the schema endpoint, expand a folder, assert exactly one extra fetch with the correct `path`, assert children render after the response, assert a second expand of the same node does NOT refetch.
- **Integration:** connect a real Drive, navigate three levels deep through the picker, run a pull on the deepest pick, assert the expected blobs land.
- **Regression:** SFTP, MySQL, and Postgres connectors that already return deep trees in a single response keep working. Lazy-fetch must only kick in when `Children == null`, not when `Children == []` or when children are populated.

## Out of scope for Phase 2

- Search-as-you-type, drag-and-drop reordering, multi-select inside the tree — separate UX projects.
- Schema invalidation after the user re-authorises mid-session. "Refresh the page" is the v2 behaviour; revisit if it bites.
- Shared-drive browsing. Drive's shared-drives API needs `supportsAllDrives=true` + `corpora=allDrives` on the connector side — file a follow-up against the connector repo when this is in scope.

## Reference: Phase 1 commits

The connector-side commits that landed Phase 1 will be visible in the `feat/google-drive-connector` branch history alongside this file. Look for commit messages matching `feat(googledrive): browseable schema` for the entry point.
