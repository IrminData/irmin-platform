package mcp

import (
	"context"
	"errors"
	"strings"
	"testing"

	"irmin-api/duckdb"
)

func TestTransformContentForLLMBoundsAndCancellation(t *testing.T) {
	t.Parallel()

	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := TransformContentForLLM(ctx, []byte("ok"), "note.txt"); !errors.Is(err, context.Canceled) {
		t.Fatalf("cancelled transform error = %v", err)
	}

	oversized := make([]byte, maxTransformInputBytes+1)
	if _, err := TransformContentForLLM(context.Background(), oversized, "note.txt"); !errors.Is(err, ErrTransformInputTooLarge) {
		t.Fatalf("oversized transform error = %v", err)
	}

	tooMuchOutput := []byte(strings.Repeat("a", maxTransformOutputRunes+1))
	if _, err := TransformContentForLLM(context.Background(), tooMuchOutput, "note.txt"); !errors.Is(err, ErrTransformOutputTooLarge) {
		t.Fatalf("output-bound transform error = %v", err)
	}
}

func TestTransformContentForLLMRejectsUnsupportedBinary(t *testing.T) {
	t.Parallel()
	content := []byte{'P', 'K', 3, 4, 0, 0, 0, 0}
	if _, err := TransformContentForLLM(context.Background(), content, "archive.zip"); !errors.Is(err, ErrUnsupportedBinary) {
		t.Fatalf("unsupported binary error = %v", err)
	}
}

func TestBuildReadQueryUsesCatalogRowLimit(t *testing.T) {
	t.Parallel()
	query := buildReadQuery("input.csv", &duckdb.ReadOptions{ReadFunction: "read_csv_auto"})
	if !strings.Contains(query, "LIMIT 1000") {
		t.Fatalf("query is not bounded: %s", query)
	}
}
