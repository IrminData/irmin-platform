package engine

import (
	"testing"

	"github.com/zeebo/assert"
)

func TestS3Regex_EscapedQuotes(t *testing.T) {
	// Issue 1: Regex truncation with escaped quotes
	// Expected: Capture full path "repo/main/file''name.json" (unescaped: repo/main/file'name.json)
	// ExtractS3Paths now returns UNESCAPED logical paths.

	query := "'s3://repo/main/file''name.json'"
	paths, err := ExtractS3Paths(query)
	assert.NoError(t, err)

	assert.True(t, len(paths) > 0)
	if len(paths) > 0 {
		// We expect the path to be the logical path (unescaped)
		assert.Equal(t, "repo/main/file'name.json", paths[0])
	}
}

func TestPathDetection_MixedQuotes(t *testing.T) {
	// Issue 2: Order of detection
	// Query has Double Quoted path first (WRITE), then Single Quoted path (READ).

	query := `COPY (SELECT * FROM foo) TO "s3://bucket/path"; SELECT * FROM read_csv('s3://bucket/path');`
	s3Path := "bucket/path"

	// Use the actual internal function
	ops := findPathOccurrences(query, s3Path)

	// We expect to find "write" (or "COPY" mapped to write) and "read".
	// DetectContext returns "read" or "write".

	hasWrite := false
	for _, op := range ops {
		if op == "write" {
			hasWrite = true
		}
	}

	assert.True(t, hasWrite)
}
