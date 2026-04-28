package common_test

import (
	"testing"

	"irmin-connectors/connectors/common"
)

// Pinned cases for ExtractPatchFileKey, including the historic
// `<file>.jsonEVIL/...` regression — that variant was the original
// motivation for the strict `.json/` boundary check, and we keep
// the case here so a future edit can't quietly weaken it.
func TestExtractPatchFileKey(t *testing.T) {
	cases := []struct {
		in      string
		want    string
		wantErr bool
	}{
		{in: "/customers/cus_abc.json/email", want: "customers/cus_abc.json"},
		{in: "customers/cus_abc.json/metadata/plan", want: "customers/cus_abc.json"},
		{in: "/issues/uuid-1.json/title", want: "issues/uuid-1.json"},
		{in: "/issues/uuid-1.json", want: "issues/uuid-1.json"},
		{in: "", wantErr: true},
		{in: "/customers/cus_abc/email", wantErr: true}, // no .json
		// Boundary regression: `.jsonEVIL/...` must not be accepted as
		// `.json` followed by a separator.
		{in: "/customers/cus_abc.jsonEVIL/email", wantErr: true},
	}
	for _, tc := range cases {
		t.Run(tc.in, func(t *testing.T) {
			got, err := common.ExtractPatchFileKey(tc.in)
			if tc.wantErr {
				if err == nil {
					t.Fatalf("expected error, got %q", got)
				}
				return
			}
			if err != nil {
				t.Fatalf("ExtractPatchFileKey: %v", err)
			}
			if got != tc.want {
				t.Errorf("got %q, want %q", got, tc.want)
			}
		})
	}
}

func TestTrimPatchFilePrefix(t *testing.T) {
	got, err := common.TrimPatchFilePrefix("/customers/cus_abc.json/metadata/plan", "customers/cus_abc.json")
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if got != "metadata/plan" {
		t.Errorf("got %q, want metadata/plan", got)
	}

	// Pointer that's exactly the file key → empty suffix (whole-record
	// replace; vendor callers reject this).
	got, err = common.TrimPatchFilePrefix("/customers/cus_abc.json", "customers/cus_abc.json")
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if got != "" {
		t.Errorf("got %q, want empty", got)
	}

	// Pointer with a different file key → error.
	if _, err = common.TrimPatchFilePrefix("/invoices/in_xyz.json/total", "customers/cus_abc.json"); err == nil {
		t.Errorf("expected mismatch error")
	}
}
