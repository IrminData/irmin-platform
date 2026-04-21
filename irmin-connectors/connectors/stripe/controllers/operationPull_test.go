//nolint:testpackage // Testing internal helpers requires same package
package stripecontrollers

import (
	"encoding/json"
	"testing"
)

func TestParsePositiveInt_JSONNumberAndInt64(t *testing.T) {
	// If any upstream uses json.Decoder.UseNumber, the settings
	// payload arrives as json.Number. Earlier revisions missed the
	// case and silently treated it as "no cap" — defeating the
	// max_records_per_resource OOM guard.
	if got := parsePositiveInt(json.Number("500")); got != 500 {
		t.Errorf("json.Number(500): got %d, want 500", got)
	}
	if got := parsePositiveInt(json.Number("-1")); got != 0 {
		t.Errorf("json.Number(-1): got %d, want 0", got)
	}
	if got := parsePositiveInt(json.Number("not a number")); got != 0 {
		t.Errorf("json.Number('not a number'): got %d, want 0", got)
	}
	if got := parsePositiveInt(int64(42)); got != 42 {
		t.Errorf("int64(42): got %d, want 42", got)
	}
	if got := parsePositiveInt(int64(-1)); got != 0 {
		t.Errorf("int64(-1): got %d, want 0", got)
	}
}

func TestMarshalJSONArray(t *testing.T) {
	if string(marshalJSONArray(nil)) != "[]" {
		t.Errorf("nil should produce []")
	}
	if string(marshalJSONArray([]json.RawMessage{})) != "[]" {
		t.Errorf("empty slice should produce []")
	}

	got := marshalJSONArray([]json.RawMessage{
		json.RawMessage(`{"id":"a"}`),
		json.RawMessage(`{"id":"b"}`),
	})
	// Passthrough of Stripe's exact shape — no re-parsing.
	if string(got) != `[{"id":"a"},{"id":"b"}]` {
		t.Errorf("got %s", string(got))
	}

	// Single element.
	got = marshalJSONArray([]json.RawMessage{json.RawMessage(`{"id":"a"}`)})
	if string(got) != `[{"id":"a"}]` {
		t.Errorf("got %s", string(got))
	}
}

func TestParsePositiveInt(t *testing.T) {
	cases := []struct {
		in   any
		want int
	}{
		{in: nil, want: 0},
		{in: "", want: 0},
		{in: "   ", want: 0},
		{in: "0", want: 0},
		{in: "-5", want: 0},
		{in: "abc", want: 0},
		{in: "42", want: 42},
		{in: "  42  ", want: 42},
		{in: 42, want: 42},
		{in: -1, want: 0},
		{in: float64(1000), want: 1000},
		{in: float64(-1), want: 0},
		// Unsupported types fall through to zero rather than panicking.
		{in: []string{"42"}, want: 0},
	}
	for _, tc := range cases {
		if got := parsePositiveInt(tc.in); got != tc.want {
			t.Errorf("parsePositiveInt(%v) = %d, want %d", tc.in, got, tc.want)
		}
	}
}

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
