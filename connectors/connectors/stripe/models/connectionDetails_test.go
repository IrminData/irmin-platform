package stripemodels_test

import (
	"strings"
	"testing"

	stripemodels "irmin-connectors/connectors/stripe/models"
)

func TestNewConnectionDetailsFromMap(t *testing.T) {
	cases := []struct {
		name    string
		in      map[string]any
		wantErr string // substring match; "" means expect no error
	}{
		{
			name: "valid restricted key",
			in:   map[string]any{"api_key": "rk_live_abc123"},
		},
		{
			name: "valid test restricted key",
			in:   map[string]any{"api_key": "rk_test_abc123"},
		},
		{
			name: "valid secret key (discouraged but accepted)",
			in:   map[string]any{"api_key": "sk_live_abc123"},
		},
		{
			name:    "publishable key rejected",
			in:      map[string]any{"api_key": "pk_live_abc123"},
			wantErr: "publishable",
		},
		{
			name:    "unknown prefix rejected",
			in:      map[string]any{"api_key": "abc_live_xyz"},
			wantErr: "sk_",
		},
		{
			name:    "empty string rejected",
			in:      map[string]any{"api_key": ""},
			wantErr: "required",
		},
		{
			name:    "whitespace-only rejected",
			in:      map[string]any{"api_key": "   "},
			wantErr: "required",
		},
		{
			name:    "missing key rejected",
			in:      map[string]any{},
			wantErr: "required",
		},
		{
			name: "leading/trailing whitespace trimmed",
			in:   map[string]any{"api_key": "  rk_test_trimmed  "},
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := stripemodels.NewConnectionDetailsFromMap(tc.in)
			if tc.wantErr == "" {
				assertValidDetails(t, got, err)
				return
			}
			assertDetailsError(t, err, tc.wantErr)
		})
	}
}

func assertValidDetails(t *testing.T, got *stripemodels.ConnectionDetails, err error) {
	t.Helper()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.APIKey == "" {
		t.Errorf("expected APIKey to be set")
	}
	if strings.ContainsAny(got.APIKey, " \t\n") {
		t.Errorf("APIKey should be trimmed, got %q", got.APIKey)
	}
}

func assertDetailsError(t *testing.T, err error, want string) {
	t.Helper()
	if err == nil {
		t.Fatalf("expected error containing %q, got nil", want)
	}
	if !strings.Contains(err.Error(), want) {
		t.Errorf("error %q should contain %q", err.Error(), want)
	}
}
