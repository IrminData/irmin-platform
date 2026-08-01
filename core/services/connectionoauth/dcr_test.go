// Internal test file — exercises unexported DCR helpers (postDCR,
// dcrSecrets, dcrMetadata, buildClientName) that we deliberately keep
// package-private.
//
//nolint:testpackage // intentional internal test for unexported helpers
package connectionoauth

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"testing"

	"irmin-api/db"
)

func TestPostDCRSendsCorrectRequest(t *testing.T) {
	var seenContentType, seenAccept, seenBody string
	var seenMethod string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seenMethod = r.Method
		seenContentType = r.Header.Get("Content-Type")
		seenAccept = r.Header.Get("Accept")
		b, _ := io.ReadAll(r.Body)
		seenBody = string(b)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_, _ = w.Write([]byte(`{"client_id":"cid-123","client_secret":"csec"}`))
	}))
	defer srv.Close()

	s := newTestService(t, srv.Client())
	resp, err := s.postDCR(context.Background(), srv.URL, dcrRequest{
		RedirectURIs:            []string{"https://api.irmin.dev/cb"},
		TokenEndpointAuthMethod: "client_secret_basic",
		GrantTypes:              []string{"authorization_code", "refresh_token"},
		ResponseTypes:           []string{"code"},
		ClientName:              "Irmin (Intercom)",
		Scope:                   "read.conversations",
		SoftwareID:              dcrSoftwareID,
	})
	if err != nil {
		t.Fatalf("postDCR: %v", err)
	}
	if resp.ClientID != "cid-123" || resp.ClientSecret != "csec" {
		t.Fatalf("parsed: %+v", resp)
	}
	if seenMethod != http.MethodPost {
		t.Fatalf("method = %q", seenMethod)
	}
	if seenContentType != "application/json" {
		t.Fatalf("content-type = %q", seenContentType)
	}
	if seenAccept != "application/json" {
		t.Fatalf("accept = %q", seenAccept)
	}
	// Body must be JSON with expected required fields populated.
	var got dcrRequest
	if unmarshalErr := json.Unmarshal([]byte(seenBody), &got); unmarshalErr != nil {
		t.Fatalf("body is not JSON: %v — %q", unmarshalErr, seenBody)
	}
	if !slices.Contains(got.RedirectURIs, "https://api.irmin.dev/cb") {
		t.Fatalf("redirect_uris missing our callback: %+v", got.RedirectURIs)
	}
	if got.ClientName != "Irmin (Intercom)" {
		t.Fatalf("client_name = %q", got.ClientName)
	}
	if !slices.Contains(got.GrantTypes, "authorization_code") ||
		!slices.Contains(got.GrantTypes, "refresh_token") {
		t.Fatalf("grant_types missing required values: %+v", got.GrantTypes)
	}
	if !slices.Contains(got.ResponseTypes, "code") {
		t.Fatalf("response_types missing \"code\": %+v", got.ResponseTypes)
	}
}

func TestPostDCRAccepts200AndJSON(t *testing.T) {
	// Some vendors return 200 OK instead of the RFC-mandated 201 Created.
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"client_id":"cid","registration_access_token":"rat"}`))
	}))
	defer srv.Close()
	s := newTestService(t, srv.Client())
	resp, err := s.postDCR(context.Background(), srv.URL, dcrRequest{})
	if err != nil {
		t.Fatalf("postDCR: %v", err)
	}
	if resp.ClientID != "cid" {
		t.Fatalf("ClientID = %q", resp.ClientID)
	}
	if resp.RegistrationAccessToken != "rat" {
		t.Fatalf("RegistrationAccessToken = %q", resp.RegistrationAccessToken)
	}
}

func TestPostDCRWrapsNon2xxAsVendorError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"invalid_client_metadata"}`))
	}))
	defer srv.Close()
	s := newTestService(t, srv.Client())

	_, err := s.postDCR(context.Background(), srv.URL, dcrRequest{})
	var ve *VendorError
	if err == nil || !errors.As(err, &ve) {
		t.Fatalf("expected *VendorError, got %T %v", err, err)
	}
	if ve.Stage != "dcr" {
		t.Fatalf("stage = %q", ve.Stage)
	}
	if ve.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d", ve.StatusCode)
	}
	if !strings.Contains(ve.Snippet, "invalid_client_metadata") {
		t.Fatalf("snippet = %q", ve.Snippet)
	}
}

func TestPostDCRInvalidJSON(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusCreated)
		_, _ = w.Write([]byte(`not json`))
	}))
	defer srv.Close()
	s := newTestService(t, srv.Client())

	_, err := s.postDCR(context.Background(), srv.URL, dcrRequest{})
	if err == nil || !strings.Contains(err.Error(), "parse DCR response") {
		t.Fatalf("expected parse error, got %v", err)
	}
}

func TestDCRSecretsOmitsEmpty(t *testing.T) {
	cases := []struct {
		name string
		resp *dcrResponse
		want map[string]string
	}{
		{
			"both present",
			&dcrResponse{ClientSecret: "s", RegistrationAccessToken: "r"},
			map[string]string{
				db.ConnectionOAuthSecretKeyClientSecret:      "s",
				db.ConnectionOAuthSecretKeyRegistrationToken: "r",
			},
		},
		{
			"secret only",
			&dcrResponse{ClientSecret: "s"},
			map[string]string{db.ConnectionOAuthSecretKeyClientSecret: "s"},
		},
		{
			"public client (no secret, no reg token)",
			&dcrResponse{ClientID: "cid"},
			map[string]string{},
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := dcrSecrets(tc.resp)
			if len(got) != len(tc.want) {
				t.Fatalf("got %v, want %v", got, tc.want)
			}
			for k, v := range tc.want {
				if got[k] != v {
					t.Fatalf("key %s: got %q, want %q", k, got[k], v)
				}
			}
		})
	}
}

func TestDCRMetadataNilWhenAllEmpty(t *testing.T) {
	if got := dcrMetadata(&dcrResponse{ClientID: "cid"}); got != nil {
		t.Fatalf("expected nil metadata, got %v", got)
	}
}

func TestDCRMetadataKeepsNonEmpty(t *testing.T) {
	got := dcrMetadata(&dcrResponse{
		ClientIDIssuedAt:        1704000000,
		ClientSecretExpiresAt:   1735536000,
		RegistrationClientURI:   "https://vendor/register/abc",
		TokenEndpointAuthMethod: "client_secret_basic",
		Scope:                   "read.a read.b",
	})
	if got == nil {
		t.Fatalf("expected metadata map, got nil")
	}
	if got["client_id_issued_at"] != "1704000000" {
		t.Fatalf("client_id_issued_at = %q", got["client_id_issued_at"])
	}
	if got["registration_client_uri"] != "https://vendor/register/abc" {
		t.Fatalf("registration_client_uri = %q", got["registration_client_uri"])
	}
	if got["scope"] != "read.a read.b" {
		t.Fatalf("scope = %q", got["scope"])
	}
}

func TestBuildClientName(t *testing.T) {
	cases := []struct {
		in   *db.Connector
		want string
	}{
		{nil, "Irmin"},
		{&db.Connector{Name: ""}, "Irmin"},
		{&db.Connector{Name: "Intercom"}, "Irmin (Intercom)"},
	}
	for _, tc := range cases {
		if got := buildClientName(tc.in); got != tc.want {
			t.Fatalf("buildClientName(%v) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

func TestRegisterClientViaDCRRejectsEmptyEndpoint(t *testing.T) {
	s := newTestService(t, http.DefaultClient)
	_, err := s.registerClientViaDCR(
		context.Background(),
		&db.Connector{},
		123,
		&Config{DCREndpoint: ""},
	)
	if !errors.Is(err, ErrClientUnconfigured) {
		t.Fatalf("expected ErrClientUnconfigured, got %v", err)
	}
}

func TestRegisterClientViaDCRRejectsZeroWorkspace(t *testing.T) {
	s := newTestService(t, http.DefaultClient)
	_, err := s.registerClientViaDCR(
		context.Background(),
		&db.Connector{},
		0,
		&Config{DCREndpoint: "https://vendor/register"},
	)
	if err == nil || !strings.Contains(err.Error(), "workspace ID") {
		t.Fatalf("expected workspace-ID error, got %v", err)
	}
}
