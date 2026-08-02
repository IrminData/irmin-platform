package linearclient_test

import (
	"testing"

	linearclient "irmin-connectors/connectors/linear/client"
)

func TestParsePath(t *testing.T) {
	cases := []struct {
		in      string
		wantRes string
		wantID  string
		wantNew bool
		wantErr bool
	}{
		{in: "issues", wantRes: "issues"},
		{in: "issues.json", wantRes: "issues"},
		{in: "/issues.json", wantRes: "issues"},
		{in: "teams", wantRes: "teams"},
		{in: "issues/IRM-42.json", wantRes: "issues", wantID: "IRM-42"},
		{in: "issues/IRM-42", wantRes: "issues", wantID: "IRM-42"},
		{in: "issues/new-thing.json", wantRes: "issues", wantNew: true},
		{in: "issues/new-thing", wantRes: "issues", wantNew: true},

		// Error cases
		{in: "", wantErr: true},
		{in: "unknown", wantErr: true},
		{in: "unknown/abc.json", wantErr: true},
		{in: "issues/", wantErr: true},
	}
	for _, tc := range cases {
		t.Run(tc.in, func(t *testing.T) {
			got, err := linearclient.ParsePath(tc.in)
			if tc.wantErr {
				if err == nil {
					t.Fatalf("ParsePath(%q) = %+v, want error", tc.in, got)
				}
				return
			}
			if err != nil {
				t.Fatalf("ParsePath(%q) returned error: %v", tc.in, err)
			}
			if got.Resource.Name != tc.wantRes {
				t.Fatalf("resource = %q, want %q", got.Resource.Name, tc.wantRes)
			}
			if got.ID != tc.wantID {
				t.Fatalf("id = %q, want %q", got.ID, tc.wantID)
			}
			if got.IsNew != tc.wantNew {
				t.Fatalf("isNew = %v, want %v", got.IsNew, tc.wantNew)
			}
		})
	}
}

func TestFindResource(t *testing.T) {
	for _, name := range []string{"issues", "projects", "cycles", "teams"} {
		if _, err := linearclient.FindResource(name); err != nil {
			t.Errorf("FindResource(%q) returned error: %v", name, err)
		}
	}
	if _, err := linearclient.FindResource("nope"); err == nil {
		t.Errorf("FindResource(\"nope\") returned no error")
	}
}
