package main

import (
	"encoding/json"
	"io"
	"net/http"
	"testing"

	"irmin-connectors/utils"

	"github.com/gofiber/fiber/v3"
)

func TestHealthRouteReturnsOKWithoutAuth(t *testing.T) {
	app := setupFiberApp(&utils.ConnectorsEnv{})
	app.Get("/health", healthHandler)

	resp := doHealthTestRequest(t, app, "/health")
	defer closeResponseBody(t, resp)

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want %d", resp.StatusCode, http.StatusOK)
	}

	body := decodeHealthBody(t, resp)
	if body["status"] != "ok" {
		t.Fatalf("status field = %v, want ok", body["status"])
	}
}

func TestUnknownRouteReturns404(t *testing.T) {
	app := setupFiberApp(&utils.ConnectorsEnv{})

	resp := doHealthTestRequest(t, app, "/definitely-not-a-route")
	defer closeResponseBody(t, resp)

	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("status = %d, want %d", resp.StatusCode, http.StatusNotFound)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read body: %v", err)
	}
	if got := string(body); got != "Not Found" {
		t.Fatalf("body = %q, want %q", got, "Not Found")
	}
}

func doHealthTestRequest(t *testing.T, app *fiber.App, path string) *http.Response {
	t.Helper()
	req, err := http.NewRequest(http.MethodGet, path, http.NoBody)
	if err != nil {
		t.Fatalf("build request: %v", err)
	}
	resp, err := app.Test(req, fiber.TestConfig{Timeout: -1})
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	return resp
}

func closeResponseBody(t *testing.T, resp *http.Response) {
	t.Helper()
	if err := resp.Body.Close(); err != nil {
		t.Fatalf("close body: %v", err)
	}
}

func decodeHealthBody(t *testing.T, resp *http.Response) map[string]any {
	t.Helper()
	var body map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	return body
}
