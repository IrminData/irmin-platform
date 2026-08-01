package stripemodels_test

import (
	"testing"

	"irmin-connectors/connectors/stripe/config"
	stripemodels "irmin-connectors/connectors/stripe/models"
)

func TestResolvedAPIVersion(t *testing.T) {
	cases := []struct {
		name string
		cs   *stripemodels.ConnectionSettings
		want string
	}{
		{
			name: "nil receiver uses default",
			cs:   nil,
			want: config.DefaultAPIVersion,
		},
		{
			name: "empty version uses default",
			cs:   &stripemodels.ConnectionSettings{APIVersion: ""},
			want: config.DefaultAPIVersion,
		},
		{
			name: "explicit version honored",
			cs:   &stripemodels.ConnectionSettings{APIVersion: "2025-01-27.acacia"},
			want: "2025-01-27.acacia",
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := tc.cs.ResolvedAPIVersion(); got != tc.want {
				t.Errorf("got %q, want %q", got, tc.want)
			}
		})
	}
}

func TestNewConnectionSettingsFromMap(t *testing.T) {
	// Empty map is valid — api_version is optional.
	got, err := stripemodels.NewConnectionSettingsFromMap(map[string]any{})
	if err != nil {
		t.Fatalf("empty map should be valid: %v", err)
	}
	if got.APIVersion != "" {
		t.Errorf("empty map should leave APIVersion empty, got %q", got.APIVersion)
	}

	// Whitespace trimming.
	got, err = stripemodels.NewConnectionSettingsFromMap(
		map[string]any{"api_version": "  2025-01-27.acacia  "},
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.APIVersion != "2025-01-27.acacia" {
		t.Errorf("APIVersion should be trimmed, got %q", got.APIVersion)
	}
}
