# Releasing the Go SDK

The Go SDK is the nested module
`github.com/IrminData/irmin-platform/sdks/go`. Go requires tags for a nested
module to include its repository-relative directory.

| Module version | Repository tag |
| --- | --- |
| `v0.1.0` | `sdks/go/v0.1.0` |
| `v0.2.0-rc.1` | `sdks/go/v0.2.0-rc.1` |

## Release checklist

1. Merge the SDK change and all required documentation to `main`.
2. Confirm `main` is green and the public API change has had compatibility
   review.
3. Choose an unused semantic version. Do not reuse or move an existing tag.
4. Run the **Release Go SDK** workflow from `main`, supplying the version in
   `vX.Y.Z` form:

   ```bash
   gh workflow run release-go-sdk.yml --ref main -f version=v0.1.0
   ```

5. Wait for the workflow. It tests the SDK as a standalone module, creates the
   annotated `sdks/go/vX.Y.Z` tag, and creates the matching GitHub release.
6. Verify resolution outside the monorepo:

   ```bash
   temp_dir="$(mktemp -d)"
   cd "$temp_dir"
   go mod init example.com/irmin-sdk-check
   go get github.com/IrminData/irmin-platform/sdks/go@v0.1.0
   go list -m github.com/IrminData/irmin-platform/sdks/go
   ```

Consumers use the module version without the `sdks/go/` prefix. The prefix is
only part of the repository tag.

## Major versions

For v2 and later, follow Go's semantic import versioning: add `/v2` to the
module path and use tags such as `sdks/go/v2.0.0`. Treat that as a dedicated
compatibility migration.
