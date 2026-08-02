//nolint:testpackage // Testing internal helpers requires same package
package stripecontrollers

import (
	"testing"
)

// Tests for parsePositiveInt and marshalJSONArray previously lived here
// when those helpers were duplicated in stripe/. They moved to
// connectors/common/operationDataHelpers_test.go alongside the helpers
// themselves so a future fix lands once. See the package doc on
// connectors/common/operationDataHelpers.go.

func TestResolveWholeResource(t *testing.T) {
	// The workflow in the field wrote `customers.json` as its source
	// path — the exact filename the pull emits on output. Earlier
	// revisions rejected that with "unknown Stripe resource", failing
	// the round-trip. Both forms must resolve to the same resource.
	cases := []struct {
		name    string
		path    string
		want    string // resource.Name on success, "" on expected error
		wantErr bool
	}{
		{name: "bare slug", path: "customers", want: "customers"},
		{name: "with .json suffix", path: "customers.json", want: "customers"},
		{name: "with leading slash", path: "/customers", want: "customers"},
		{name: "leading slash + .json", path: "/customers.json", want: "customers"},
		{name: "pull-only charges (bare)", path: "charges", want: "charges"},
		{name: "pull-only charges (.json)", path: "charges.json", want: "charges"},
		// products is Write-only (Pull:false) in KnownResources — a
		// whole-resource pull against it must fail with a clear error
		// rather than silently emitting an empty file.
		{name: "non-pull resource rejected", path: "products", wantErr: true},
		{name: "non-pull resource .json rejected", path: "products.json", wantErr: true},
		{name: "unknown resource", path: "refunds.json", wantErr: true},
		{name: "empty", path: "", wantErr: true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			resource, err := resolveWholeResource(tc.path)
			if tc.wantErr {
				if err == nil {
					t.Errorf("resolveWholeResource(%q): want error, got resource %q", tc.path, resource.Name)
				}
				return
			}
			if err != nil {
				t.Errorf("resolveWholeResource(%q): unexpected error %v", tc.path, err)
				return
			}
			if resource.Name != tc.want {
				t.Errorf("resolveWholeResource(%q).Name = %q, want %q", tc.path, resource.Name, tc.want)
			}
		})
	}
}
