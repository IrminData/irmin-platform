package main

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cache"
)

func doCacheTestRequest(t *testing.T, app *fiber.App, url string) *http.Response {
	t.Helper()
	req, err := http.NewRequest(http.MethodGet, url, http.NoBody)
	if err != nil {
		t.Fatalf("build request: %v", err)
	}
	resp, err := app.Test(req, fiber.TestConfig{Timeout: -1})
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	return resp
}

func decodeMapBody(t *testing.T, resp *http.Response) map[string]any {
	t.Helper()
	defer func() {
		if err := resp.Body.Close(); err != nil {
			t.Fatalf("close body: %v", err)
		}
	}()
	var body map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	return body
}

func setupLegacyCacheWithoutBypass() fiber.Handler {
	return cache.New(cache.Config{
		Expiration: CacheExpirationDuration,
		Methods: []string{
			http.MethodGet,
			http.MethodHead,
			http.MethodOptions,
		},
		KeyGenerator: func(c fiber.Ctx) string {
			return c.Path()
		},
	})
}

func TestLegacyCacheWouldStaleOperationStatusRoute(t *testing.T) {
	app := fiber.New()
	app.Use(setupLegacyCacheWithoutBypass())

	calls := 0
	app.Get("/operation/status/:job_id", func(c fiber.Ctx) error {
		calls++
		return c.JSON(fiber.Map{"calls": calls})
	})

	firstResp := doCacheTestRequest(t, app, "http://localhost/operation/status/opjob_123")
	secondResp := doCacheTestRequest(t, app, "http://localhost/operation/status/opjob_123")

	firstBody := decodeMapBody(t, firstResp)
	secondBody := decodeMapBody(t, secondResp)

	if firstBody["calls"] != float64(1) {
		t.Fatalf("first calls = %v, want 1", firstBody["calls"])
	}
	if secondBody["calls"] != float64(1) {
		t.Fatalf("second calls = %v, want 1 (stale cached value)", secondBody["calls"])
	}
}

func TestLegacyCacheWouldStaleOperationResultGone(t *testing.T) {
	app := fiber.New()
	app.Use(setupLegacyCacheWithoutBypass())

	calls := 0
	app.Get("/operation/result/:job_id", func(c fiber.Ctx) error {
		calls++
		if calls == 1 {
			return c.Status(http.StatusGone).JSON(fiber.Map{
				"error": "result expired",
			})
		}
		return c.Status(http.StatusOK).JSON(fiber.Map{
			"status": "complete",
		})
	})

	firstResp := doCacheTestRequest(t, app, "http://localhost/operation/result/opjob_123")
	secondResp := doCacheTestRequest(t, app, "http://localhost/operation/result/opjob_123")

	if firstResp.StatusCode != http.StatusGone {
		t.Fatalf("first status = %d, want 410", firstResp.StatusCode)
	}
	if secondResp.StatusCode != http.StatusGone {
		t.Fatalf("second status = %d, want 410 (stale cached gone)", secondResp.StatusCode)
	}
}

func TestSetupCacheSkipsOperationStatusRoute(t *testing.T) {
	app := fiber.New()
	app.Use(setupCache())

	calls := 0
	app.Get("/operation/status/:job_id", func(c fiber.Ctx) error {
		calls++
		return c.JSON(fiber.Map{"calls": calls})
	})

	firstResp := doCacheTestRequest(t, app, "http://localhost/operation/status/opjob_123")
	secondResp := doCacheTestRequest(t, app, "http://localhost/operation/status/opjob_123")

	firstBody := decodeMapBody(t, firstResp)
	secondBody := decodeMapBody(t, secondResp)

	if firstBody["calls"] != float64(1) {
		t.Fatalf("first calls = %v, want 1", firstBody["calls"])
	}
	if secondBody["calls"] != float64(2) {
		t.Fatalf("second calls = %v, want 2", secondBody["calls"])
	}
}

func TestSetupCacheSkipsOperationResultRoute(t *testing.T) {
	app := fiber.New()
	app.Use(setupCache())

	calls := 0
	app.Get("/operation/result/:job_id", func(c fiber.Ctx) error {
		calls++
		if calls == 1 {
			return c.Status(http.StatusGone).JSON(fiber.Map{
				"error": "result expired",
			})
		}
		return c.Status(http.StatusOK).JSON(fiber.Map{
			"status": "complete",
		})
	})

	firstResp := doCacheTestRequest(t, app, "http://localhost/operation/result/opjob_123")
	secondResp := doCacheTestRequest(t, app, "http://localhost/operation/result/opjob_123")

	if firstResp.StatusCode != http.StatusGone {
		t.Fatalf("first status = %d, want 410", firstResp.StatusCode)
	}
	if secondResp.StatusCode != http.StatusOK {
		t.Fatalf("second status = %d, want 200", secondResp.StatusCode)
	}
}

// TestSetupCacheSkipsSlugPrefixedOperationStatusRoute is the
// regression companion to PR #184: lifecycle routes are now mirrored
// per-connector under /{slug}/operation/{status,result}/:job_id, and
// the response cache must bypass that shape too — otherwise the SDK's
// poll loop would see a 10-second-stale row and miss the
// running→complete transition. shouldBypassAppCache uses
// strings.Contains specifically to cover both mounts.
func TestSetupCacheSkipsSlugPrefixedOperationStatusRoute(t *testing.T) {
	app := fiber.New()
	app.Use(setupCache())

	calls := 0
	app.Get("/stripe/operation/status/:job_id", func(c fiber.Ctx) error {
		calls++
		return c.JSON(fiber.Map{"calls": calls})
	})

	firstResp := doCacheTestRequest(t, app, "http://localhost/stripe/operation/status/opjob_123")
	secondResp := doCacheTestRequest(t, app, "http://localhost/stripe/operation/status/opjob_123")

	firstBody := decodeMapBody(t, firstResp)
	secondBody := decodeMapBody(t, secondResp)

	if firstBody["calls"] != float64(1) {
		t.Fatalf("first calls = %v, want 1", firstBody["calls"])
	}
	if secondBody["calls"] != float64(2) {
		t.Fatalf("second calls = %v, want 2 (slug-prefixed lifecycle route must bypass cache)", secondBody["calls"])
	}
}

func TestSetupCacheSkipsSlugPrefixedOperationResultRoute(t *testing.T) {
	app := fiber.New()
	app.Use(setupCache())

	calls := 0
	app.Get("/stripe/operation/result/:job_id", func(c fiber.Ctx) error {
		calls++
		if calls == 1 {
			return c.Status(http.StatusConflict).JSON(fiber.Map{
				"error":  "job not ready",
				"status": "running",
			})
		}
		return c.Status(http.StatusOK).JSON(fiber.Map{
			"status": "complete",
		})
	})

	firstResp := doCacheTestRequest(t, app, "http://localhost/stripe/operation/result/opjob_123")
	secondResp := doCacheTestRequest(t, app, "http://localhost/stripe/operation/result/opjob_123")

	if firstResp.StatusCode != http.StatusConflict {
		t.Fatalf("first status = %d, want 409", firstResp.StatusCode)
	}
	if secondResp.StatusCode != http.StatusOK {
		t.Fatalf(
			"second status = %d, want 200 (slug-prefixed lifecycle route must bypass cache)",
			secondResp.StatusCode,
		)
	}
}

func TestSetupCacheStillCachesNonOperationGET(t *testing.T) {
	app := fiber.New()
	app.Use(setupCache())

	calls := 0
	app.Get("/connector/details", func(c fiber.Ctx) error {
		calls++
		return c.JSON(fiber.Map{"calls": calls})
	})

	firstResp := doCacheTestRequest(t, app, "http://localhost/connector/details")
	secondResp := doCacheTestRequest(t, app, "http://localhost/connector/details")

	firstBody := decodeMapBody(t, firstResp)
	secondBody := decodeMapBody(t, secondResp)

	if firstBody["calls"] != float64(1) {
		t.Fatalf("first calls = %v, want 1", firstBody["calls"])
	}
	if secondBody["calls"] != float64(1) {
		t.Fatalf("second calls = %v, want 1 (cached)", secondBody["calls"])
	}
}
