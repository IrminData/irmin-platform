// Internal tests for the X-Irmin-Connection-ID header injection added in
// Phase 2e. Connectors use this header to fetch per-connection OAuth
// access tokens from Core's internal endpoint.
//
//nolint:testpackage // intentional internal test for client header wiring
package connectorsclient

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func newRecordingServer(t *testing.T) (string, *http.Client, func() string) {
	t.Helper()
	var seen string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seen = r.Header.Get(HeaderConnectionID)
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{}`)
	}))
	t.Cleanup(srv.Close)
	return srv.URL, srv.Client(), func() string { return seen }
}

func TestRequestSetsConnectionHeaderWhenConfigured(t *testing.T) {
	baseURL, httpClient, read := newRecordingServer(t)
	c := NewClient(baseURL, "token", "en")
	c.HTTPClient = httpClient
	c.WithConnectionID(42)

	_, err := c.Request(context.Background(), RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/echo",
		ContentType: "application/json",
		Body:        map[string]string{"k": "v"},
	})
	if err != nil {
		t.Fatalf("Request: %v", err)
	}
	if got := read(); got != "42" {
		t.Fatalf("X-Irmin-Connection-ID = %q, want %q", got, "42")
	}
}

func TestRequestOmitsConnectionHeaderWhenUnset(t *testing.T) {
	baseURL, httpClient, read := newRecordingServer(t)
	c := NewClient(baseURL, "token", "en")
	c.HTTPClient = httpClient
	// ConnectionID defaults to 0 — header must not be sent.

	_, err := c.Request(context.Background(), RequestOptions{
		Method:      http.MethodGet,
		Endpoint:    "/echo",
		ContentType: "application/json",
	})
	if err != nil {
		t.Fatalf("Request: %v", err)
	}
	if got := read(); got != "" {
		t.Fatalf("expected no X-Irmin-Connection-ID header, got %q", got)
	}
}

func TestWithConnectionIDClearsWithZero(t *testing.T) {
	c := NewClient("http://example.test", "tok", "en")
	c.WithConnectionID(7)
	c.WithConnectionID(0)
	if c.ConnectionID != 0 {
		t.Fatalf("ConnectionID should be 0 after reset, got %d", c.ConnectionID)
	}
}

func TestExplicitHeaderOverridesInjectedConnectionID(t *testing.T) {
	// If a caller explicitly passes HeaderConnectionID via opts.Headers,
	// that wins — allows call sites with a different ID semantics (e.g.,
	// cross-workspace reattribution) to override without reaching into
	// the client field.
	baseURL, httpClient, read := newRecordingServer(t)
	c := NewClient(baseURL, "token", "en")
	c.HTTPClient = httpClient
	c.WithConnectionID(100)

	_, err := c.Request(context.Background(), RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/echo",
		ContentType: "application/json",
		Headers:     map[string]string{HeaderConnectionID: "999"},
	})
	if err != nil {
		t.Fatalf("Request: %v", err)
	}
	if got := read(); got != "999" {
		t.Fatalf("explicit header should win: got %q, want %q", got, "999")
	}
}

func TestStreamFetchAlsoSetsConnectionHeader(t *testing.T) {
	baseURL, httpClient, read := newRecordingServer(t)
	c := NewClient(baseURL, "token", "en")
	c.HTTPClient = httpClient
	// Swap streamClient's transport to point at the test server's client.
	c.streamClient = &http.Client{Transport: httpClient.Transport}
	c.WithConnectionID(77)

	reader, err := c.FetchStreamFilesReader(context.Background(), RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/stream",
		ContentType: "application/json",
	})
	if err != nil {
		t.Fatalf("FetchStreamFilesReader: %v", err)
	}
	_, _ = io.Copy(io.Discard, reader)
	_ = reader.Close()
	if got := read(); got != "77" {
		t.Fatalf("X-Irmin-Connection-ID = %q, want %q", got, "77")
	}
}

// TestFetchStreamFilesAlsoSetsConnectionHeader locks in the header on the
// third outbound path (FetchStreamFiles, multipart-download variant of
// FetchStreamFilesReader). This path was missed in the initial Phase 2e
// wiring; the test keeps it from regressing again.
func TestFetchStreamFilesAlsoSetsConnectionHeader(t *testing.T) {
	baseURL, httpClient, read := newRecordingServer(t)
	c := NewClient(baseURL, "token", "en")
	c.HTTPClient = httpClient
	c.WithConnectionID(88)

	_, err := c.FetchStreamFiles(context.Background(), RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/files",
		ContentType: "application/json",
	})
	if err != nil {
		t.Fatalf("FetchStreamFiles: %v", err)
	}
	if got := read(); got != "88" {
		t.Fatalf("X-Irmin-Connection-Id = %q, want %q", got, "88")
	}
}

func TestHeaderConnectionIDIsStable(t *testing.T) {
	// Locking in the header name — it is part of the cross-service wire
	// contract between irmin-core and irmin-connectors. Renaming it is
	// a breaking change and should require a deliberate decision.
	if HeaderConnectionID != "X-Irmin-Connection-Id" {
		t.Fatalf("HeaderConnectionID = %q; changing this breaks the wire contract", HeaderConnectionID)
	}
	if strings.ContainsAny(HeaderConnectionID, " \t\r\n") {
		t.Fatalf("header name must not contain whitespace: %q", HeaderConnectionID)
	}
}
