package main

import (
	"io"
	"net/http"
	"testing"

	"irmin-api/utils"

	"github.com/gofiber/fiber/v3"
)

func TestSetupFiberAppUnknownRouteReturns404(t *testing.T) {
	app := setupFiberApp(&utils.CoreAPIEnv{}, func(c fiber.Ctx) error {
		return c.Next()
	})

	req, err := http.NewRequest(http.MethodGet, "/definitely-not-a-route", http.NoBody)
	if err != nil {
		t.Fatalf("build request: %v", err)
	}
	resp, err := app.Test(req, fiber.TestConfig{Timeout: -1})
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer func() {
		if closeErr := resp.Body.Close(); closeErr != nil {
			t.Fatalf("close body: %v", closeErr)
		}
	}()

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
