# gc — Garbage Collection

CLI-driven garbage collector for the Irmin Core API. Cleans up stale data across LakeFS, PostgreSQL, and the local filesystem.

## Usage

```bash
# Preview what would be cleaned (no mutations)
go run main.go -gc-dry-run

# Execute garbage collection
go run main.go -gc
```

When `-gc` or `-gc-dry-run` is passed, the process exits after GC completes instead of starting the web server. This makes it suitable for cron jobs and one-shot execution.

A PostgreSQL advisory lock (`irmin:gc:global`) prevents concurrent runs across instances.

### Cron Job

Set the start command to `./out -gc`. Ensure it has the same environment variables as the API service (database, LakeFS, S3 credentials).

The cron service will run migrations, execute all GC phases, and exit cleanly.

## Phases

GC runs eight phases sequentially:

| #   | Phase                        | File                  | Description                                                                       |
| --- | ---------------------------- | --------------------- | --------------------------------------------------------------------------------- |
| 1   | LakeFS GC rule sync          | `lakefs_sync.go`      | Sets default retention rules on LakeFS repos that don't already have them         |
| 2   | Orphaned LakeFS repo cleanup | `lakefs_sync.go`      | Deletes LakeFS repos (and their S3 storage) with no corresponding DB record       |
| 3   | Orphaned DB repo cleanup     | `lakefs_sync.go`      | Soft-deletes DB repositories whose LakeFS repo no longer exists                   |
| 4   | Workflow run cleanup         | `database_cleanup.go` | Hard-deletes completed/error/cancelled runs older than 90 days                    |
| 5   | Log event cleanup            | `database_cleanup.go` | Hard-deletes audit log events older than 180 days                                 |
| 6   | Orphan cleanup               | `orphan_cleanup.go`   | Soft-deletes records whose parent is deleted; hard-deletes orphaned junction rows |
| 7   | Soft-delete purge            | `database_cleanup.go` | Hard-deletes soft-deleted records older than 30 days across all tables            |
| 8   | Temp file cleanup            | `temp_cleanup.go`     | Removes `script-*` sandbox directories older than 7 days                          |

## Orphan Cleanup

Phase 6 uses a data-driven rule list defined in `orphan_rules.go`. Three detection strategies:

- **By parent** — child's FK points to a soft-deleted or missing parent row
- **No members** — workspaces with zero active `workspace_users`
- **Unreferenced** — workflowables (schedules, imports, exports, actions, pipelines) not pointed to by any active workflow

Rules are processed in cascading order (parents before children) so a single pass catches the full orphan chain. Soft-delete tables are batched in transactions of 1000; junction tables are deleted unbatched.

## Constants

All retention policies live in `constants.go`:

| Constant                           | Value | Purpose                                         |
| ---------------------------------- | ----- | ----------------------------------------------- |
| `LakeFSDefaultRetentionDays`       | 30    | Default object retention for LakeFS repos       |
| `LakeFSDefaultBranchRetentionDays` | 14    | Retention for each repo's default branch        |
| `WorkflowRunRetentionDays`         | 90    | Hard-delete old workflow runs                   |
| `LogEventRetentionDays`            | 180   | Hard-delete old log events                      |
| `SoftDeleteRetentionDays`          | 30    | Hard-delete soft-deleted records past retention |
| `TempFileCleanupThresholdDays`     | 7     | Remove orphaned sandbox temp directories        |
| `GCBatchSize`                      | 1000  | Records per transaction batch                   |

## Files

```
gc/
  collector.go          Entry point: Collector struct and Run()
  constants.go          Retention policies and operational settings
  database_cleanup.go   Workflow run, log event, and soft-delete purge
  lakefs_sync.go        LakeFS GC rule synchronization
  orphan_cleanup.go     Generic orphan processing functions
  orphan_rules.go       Data-driven orphan rule definitions
  report.go             GC run report struct
  temp_cleanup.go       Compute sandbox temp directory cleanup
```
