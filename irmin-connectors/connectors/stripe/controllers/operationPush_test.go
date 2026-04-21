//nolint:testpackage // Testing internal helpers requires same package
package stripecontrollers

import (
	"reflect"
	"strings"
	"testing"
)

func TestResolveTargetPath(t *testing.T) {
	// Canonicalization so a user passing "customers" (without the
	// trailing slash) doesn't silently match zero files. Write-enabled
	// resource names get the slash appended; explicit directory or
	// file forms pass through; read-only resources error fast.
	cases := []struct {
		in, want string
	}{
		{"", ""},
		{"customers", "customers/"},
		{"invoices", "invoices/"},
		{"products", "products/"},
		{"prices", "prices/"},
		{"customers/", "customers/"},
		{"customers/cus_abc.json", "customers/cus_abc.json"},
		{"/customers/cus_abc.json", "customers/cus_abc.json"},
		{"unknownthing", "unknownthing"},
	}
	for _, tc := range cases {
		t.Run(tc.in, func(t *testing.T) {
			got, err := resolveTargetPath(tc.in)
			if err != nil {
				t.Fatalf("unexpected error for %q: %v", tc.in, err)
			}
			if got != tc.want {
				t.Errorf("got %q, want %q", got, tc.want)
			}
		})
	}
}

func TestResolveTargetPath_RejectsReadOnlyResources(t *testing.T) {
	// Read-only resource names (charges, subscriptions, payouts)
	// must error at resolve time with a clear message — not slip
	// through and fail individually in pushFile with a "read-only"
	// error per matched file.
	for _, target := range []string{"charges", "subscriptions", "payouts"} {
		t.Run(target, func(t *testing.T) {
			_, err := resolveTargetPath(target)
			if err == nil {
				t.Fatalf("expected read-only rejection for %q", target)
			}
			if !strings.Contains(err.Error(), "read-only") {
				t.Errorf("error should mention read-only: %v", err)
			}
		})
	}
}

func TestPathMatchesTarget(t *testing.T) {
	cases := []struct {
		file, target string
		want         bool
	}{
		{"customers/cus_abc.json", "customers/cus_abc.json", true}, // exact
		{"customers/cus_abc.json", "customers/", true},             // dir prefix
		{"customers/cus_abc.json", "invoices/", false},             // non-matching dir
		{"/customers/cus_abc.json", "customers/cus_abc.json", true},
		{"customers/cus_abc.json", "/customers/cus_abc.json", true},
		{"customers/cus_abc.json", "customers", false}, // prefix without trailing slash not allowed
		{"customers/cus_abc.json", "", false},          // empty target does not match (caller short-circuits on "")
	}
	for _, tc := range cases {
		t.Run(tc.file+"|"+tc.target, func(t *testing.T) {
			if got := pathMatchesTarget(tc.file, tc.target); got != tc.want {
				t.Errorf("pathMatchesTarget(%q, %q) = %v, want %v", tc.file, tc.target, got, tc.want)
			}
		})
	}
}

func TestSortedPaths(t *testing.T) {
	// Empty.
	if got := sortedPaths(map[string][]byte{}); len(got) != 0 {
		t.Errorf("empty map should yield empty slice, got %v", got)
	}

	// Single element.
	if got := sortedPaths(map[string][]byte{"a": nil}); !reflect.DeepEqual(got, []string{"a"}) {
		t.Errorf("single element, got %v", got)
	}

	// Deterministic order across runs.
	files := map[string][]byte{
		"customers/cus_c.json": nil,
		"customers/cus_a.json": nil,
		"customers/cus_b.json": nil,
		"invoices/in_1.json":   nil,
	}
	got := sortedPaths(files)
	want := []string{
		"customers/cus_a.json",
		"customers/cus_b.json",
		"customers/cus_c.json",
		"invoices/in_1.json",
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("got %v, want %v", got, want)
	}
}
