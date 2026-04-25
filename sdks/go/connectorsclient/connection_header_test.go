// Internal tests for the X-Irmin-Connection-Id header injection. The
// server-side connectors service keys off this header to fetch
// per-connection OAuth access tokens from Core's internal endpoint —
// reshaping it here without the tests would be a silent wire-contract
// regression.
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
	c := NewClient(baseURL, "token")
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
		t.Fatalf("X-Irmin-Connection-Id = %q, want %q", got, "42")
	}
}

func TestRequestOmitsConnectionHeaderWhenUnset(t *testing.T) {
	baseURL, httpClient, read := newRecordingServer(t)
	c := NewClient(baseURL, "token")
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
		t.Fatalf("expected no X-Irmin-Connection-Id header, got %q", got)
	}
}

func TestWithConnectionIDClearsWithZero(t *testing.T) {
	c := NewClient("http://example.test", "tok")
	c.WithConnectionID(7)
	c.WithConnectionID(0)
	if c.ConnectionID != 0 {
		t.Fatalf("ConnectionID should be 0 after reset, got %d", c.ConnectionID)
	}
}

func TestClientConnectionIDWinsOverOptsHeaders(t *testing.T) {
	// Security-relevant headers (Authorization, X-Irmin-Connection-Id)
	// are stamped LAST by applyDefaultHeaders so a caller cannot
	// silently downgrade them via opts.Headers — e.g. swapping the
	// connection ID to one the caller is not authorized for, or
	// substituting a different bearer token. The client field wins.
	baseURL, httpClient, read := newRecordingServer(t)
	c := NewClient(baseURL, "token")
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
	if got := read(); got != "100" {
		t.Fatalf("client ConnectionID should win: got %q, want %q", got, "100")
	}
}

func TestStreamFetchAlsoSetsConnectionHeader(t *testing.T) {
	baseURL, httpClient, read := newRecordingServer(t)
	c := NewClient(baseURL, "token")
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
		t.Fatalf("X-Irmin-Connection-Id = %q, want %q", got, "77")
	}
}

// TestFetchStreamFilesAlsoSetsConnectionHeader locks in the header on
// the third outbound path (FetchStreamFiles — multipart-download
// variant of FetchStreamFilesReader).
func TestFetchStreamFilesAlsoSetsConnectionHeader(t *testing.T) {
	baseURL, httpClient, read := newRecordingServer(t)
	c := NewClient(baseURL, "token")
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
	// Lock in the header name — part of the cross-service wire
	// contract between irmin (Core) and irmin-connectors. Renaming it
	// is a breaking change and should require a deliberate decision.
	if HeaderConnectionID != "X-Irmin-Connection-Id" {
		t.Fatalf("HeaderConnectionID = %q; changing this breaks the wire contract", HeaderConnectionID)
	}
	if strings.ContainsAny(HeaderConnectionID, " \t\r\n") {
		t.Fatalf("header name must not contain whitespace: %q", HeaderConnectionID)
	}
}
