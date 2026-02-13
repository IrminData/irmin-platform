package gc

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// cleanupTempFiles removes orphaned temporary directories from the compute sandbox.
// Only directories matching the "script-" prefix (created by sandbox.setupWorkspaceFiles)
// and older than the threshold are removed.
func (c *Collector) cleanupTempFiles(ctx context.Context, dryRun bool, report *Report) {
	sandboxBaseDir := c.env.ComputeSandboxDir
	if sandboxBaseDir == "" {
		sandboxBaseDir = os.TempDir()
	}

	c.logger.InfoContext(ctx, "cleaning up temp files",
		"base_dir", sandboxBaseDir,
		"threshold_days", TempFileCleanupThresholdDays,
	)

	cutoff := time.Now().AddDate(0, 0, -TempFileCleanupThresholdDays)

	entries, readErr := os.ReadDir(sandboxBaseDir)
	if readErr != nil {
		if os.IsNotExist(readErr) {
			c.logger.InfoContext(ctx, "sandbox directory does not exist, skipping temp cleanup",
				"dir", sandboxBaseDir,
			)
			return
		}
		report.Errors = append(report.Errors,
			fmt.Errorf("failed to read sandbox dir: %w", readErr))
		c.logger.ErrorContext(ctx, "failed to read sandbox directory",
			"dir", sandboxBaseDir,
			"error", readErr,
		)
		return
	}

	for _, entry := range entries {
		select {
		case <-ctx.Done():
			return
		default:
		}

		if !entry.IsDir() || !strings.HasPrefix(entry.Name(), "script-") {
			continue
		}

		info, statErr := entry.Info()
		if statErr != nil {
			continue
		}

		if info.ModTime().After(cutoff) {
			continue
		}

		dirPath := filepath.Join(sandboxBaseDir, entry.Name())
		ageDays := int(time.Since(info.ModTime()).Hours() / hoursPerDay)

		c.processTempDir(ctx, dryRun, report, dirPath, ageDays)
	}
}

// processTempDir handles a single orphaned temp directory — either logs what
// would happen (dry-run) or removes it.
func (c *Collector) processTempDir(
	ctx context.Context,
	dryRun bool,
	report *Report,
	dirPath string,
	ageDays int,
) {
	if dryRun {
		size := calcDirSize(dirPath)
		report.TempFilesDeleted++
		report.TempBytesFreed += size
		c.logger.InfoContext(ctx, "[DRY RUN] would delete temp directory",
			"path", dirPath,
			"age_days", ageDays,
			"size_bytes", size,
		)
		return
	}

	size := calcDirSize(dirPath)

	if removeErr := os.RemoveAll(dirPath); removeErr != nil {
		report.Errors = append(report.Errors,
			fmt.Errorf("failed to remove %s: %w", dirPath, removeErr))
		c.logger.ErrorContext(ctx, "failed to remove temp directory",
			"path", dirPath,
			"error", removeErr,
		)
		return
	}

	report.TempFilesDeleted++
	report.TempBytesFreed += size
	c.logger.InfoContext(ctx, "removed temp directory",
		"path", dirPath,
		"age_days", ageDays,
		"size_bytes", size,
	)
}

// calcDirSize returns the total size in bytes of all files under dirPath.
func calcDirSize(dirPath string) int64 {
	var size int64
	_ = filepath.WalkDir(dirPath, func(_ string, d os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if !d.IsDir() {
			if fi, fiErr := d.Info(); fiErr == nil {
				size += fi.Size()
			}
		}
		return nil
	})
	return size
}
