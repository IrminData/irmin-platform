//nolint:testpackage // Testing internal helpers requires same package
package stripecontrollers

import (
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

// sortedPaths previously lived here as a stripe-only helper. It moved
// to connectors/common/operationDataHelpers.go and the consolidated
// tests live in connectors/common/operationDataHelpers_test.go.
