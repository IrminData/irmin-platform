// Internal test for the SDK → service OAuthConfig mapping. Intentionally
// lives in `package services` so it can reach the unexported
// sdkToServiceConnectionOAuthConfig helper without widening the API surface.
//
//nolint:testpackage // intentional internal test for unexported helper
package services

import (
	"reflect"
	"testing"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

func TestSDKToServiceConnectionOAuthConfigPreservesEveryField(t *testing.T) {
	src := &irminmodels.ConnectionOAuthConfig{
		Provider:         "hubspot",
		AuthorizationURL: "https://app.hubspot.com/oauth/authorize",
		TokenURL:         "https://api.hubapi.com/oauth/v1/token",
		RevocationURL:    "https://api.hubapi.com/oauth/v1/refresh-tokens",
		DCREndpoint:      "https://example.com/register",
		Scopes:           []string{"crm.objects.contacts.read", "crm.objects.deals.read"},
		PKCE:             true,
		UserinfoURL:      "https://api.example.com/userinfo",
		ExtraParams: map[string]string{
			"access_type": "offline",
			"prompt":      "consent",
		},
	}
	got := sdkToServiceConnectionOAuthConfig(src)
	if got == nil {
		t.Fatalf("got nil, want populated Config")
	}
	// Compare field-by-field so any future SDK field addition shows up as
	// a lint/test failure (once added to both sides, this stays green).
	if got.Provider != src.Provider {
		t.Errorf("Provider = %q, want %q", got.Provider, src.Provider)
	}
	if got.AuthorizationURL != src.AuthorizationURL {
		t.Errorf("AuthorizationURL mismatch")
	}
	if got.TokenURL != src.TokenURL {
		t.Errorf("TokenURL mismatch")
	}
	if got.RevocationURL != src.RevocationURL {
		t.Errorf("RevocationURL mismatch")
	}
	if got.DCREndpoint != src.DCREndpoint {
		t.Errorf("DCREndpoint mismatch")
	}
	if !reflect.DeepEqual(got.Scopes, src.Scopes) {
		t.Errorf("Scopes = %v, want %v", got.Scopes, src.Scopes)
	}
	if got.PKCE != src.PKCE {
		t.Errorf("PKCE = %v, want %v", got.PKCE, src.PKCE)
	}
	if got.UserinfoURL != src.UserinfoURL {
		t.Errorf("UserinfoURL mismatch")
	}
	if !reflect.DeepEqual(got.ExtraParams, src.ExtraParams) {
		t.Errorf("ExtraParams = %v, want %v", got.ExtraParams, src.ExtraParams)
	}
}

func TestSDKToServiceConnectionOAuthConfigNilIn(t *testing.T) {
	if got := sdkToServiceConnectionOAuthConfig(nil); got != nil {
		t.Fatalf("nil input should produce nil output, got %+v", got)
	}
}
