package sentryutil

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"testing"

	"github.com/gofiber/fiber/v3"
)

func TestClassifyRequestError(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name   string
		err    error
		status int
		body   string
		report bool
	}{
		{
			name:   "fiber not found",
			err:    fiber.ErrNotFound,
			status: fiber.StatusNotFound,
			body:   "Not Found",
			report: false,
		},
		{
			name:   "fiber unauthorized",
			err:    fiber.NewError(fiber.StatusUnauthorized, "Unauthorized"),
			status: fiber.StatusUnauthorized,
			body:   "Unauthorized",
			report: false,
		},
		{
			name:   "wrapped fiber not found",
			err:    fmt.Errorf("route: %w", fiber.ErrNotFound),
			status: fiber.StatusNotFound,
			body:   "Not Found",
			report: false,
		},
		{
			name:   "fiber bad gateway",
			err:    fiber.NewError(fiber.StatusBadGateway, "upstream"),
			status: fiber.StatusBadGateway,
			body:   "upstream",
			report: true,
		},
		{
			name:   "fiber internal server error",
			err:    fiber.NewError(fiber.StatusInternalServerError, "boom"),
			status: fiber.StatusInternalServerError,
			body:   "boom",
			report: true,
		},
		{
			name:   "non-fiber error",
			err:    errors.New("db down"),
			status: fiber.StatusInternalServerError,
			body:   internalServerErrorMessage,
			report: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			status, message, report := classifyRequestError(tt.err)
			if status != tt.status {
				t.Fatalf("status = %d, want %d", status, tt.status)
			}
			if message != tt.body {
				t.Fatalf("message = %q, want %q", message, tt.body)
			}
			if report != tt.report {
				t.Fatalf("reportToSentry = %v, want %v", report, tt.report)
			}
		})
	}
}

func TestHandleFiberErrorUnknownRouteDoesNotCapture(t *testing.T) {
	t.Parallel()

	captured := 0
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c fiber.Ctx, err error) error {
			return handleFiberError(c, err, func(_ fiber.Ctx, _ error) {
				captured++
			})
		},
	})

	resp := doErrorHandlerRequest(t, app, http.MethodGet, "/health")
	defer closeBody(t, resp)

	if resp.StatusCode != fiber.StatusNotFound {
		t.Fatalf("status = %d, want %d", resp.StatusCode, fiber.StatusNotFound)
	}
	if captured != 0 {
		t.Fatalf("captured = %d, want 0", captured)
	}
	assertBody(t, resp, "Not Found")
}

func TestHandleFiberErrorFiber4xxDoesNotCapture(t *testing.T) {
	t.Parallel()

	captured := 0
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c fiber.Ctx, err error) error {
			return handleFiberError(c, err, func(_ fiber.Ctx, _ error) {
				captured++
			})
		},
	})
	app.Get("/private", func(_ fiber.Ctx) error {
		return fiber.NewError(fiber.StatusUnauthorized, "Unauthorized")
	})

	resp := doErrorHandlerRequest(t, app, http.MethodGet, "/private")
	defer closeBody(t, resp)

	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", resp.StatusCode, fiber.StatusUnauthorized)
	}
	if captured != 0 {
		t.Fatalf("captured = %d, want 0", captured)
	}
	assertBody(t, resp, "Unauthorized")
}

func TestHandleFiberErrorFiber5xxCaptures(t *testing.T) {
	t.Parallel()

	captured := 0
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c fiber.Ctx, err error) error {
			return handleFiberError(c, err, func(_ fiber.Ctx, _ error) {
				captured++
			})
		},
	})
	app.Get("/upstream", func(_ fiber.Ctx) error {
		return fiber.NewError(fiber.StatusBadGateway, "upstream")
	})

	resp := doErrorHandlerRequest(t, app, http.MethodGet, "/upstream")
	defer closeBody(t, resp)

	if resp.StatusCode != fiber.StatusBadGateway {
		t.Fatalf("status = %d, want %d", resp.StatusCode, fiber.StatusBadGateway)
	}
	if captured != 1 {
		t.Fatalf("captured = %d, want 1", captured)
	}
	assertBody(t, resp, "upstream")
}

func TestHandleFiberErrorNonFiberCapturesAs500(t *testing.T) {
	t.Parallel()

	captured := 0
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c fiber.Ctx, err error) error {
			return handleFiberError(c, err, func(_ fiber.Ctx, _ error) {
				captured++
			})
		},
	})
	app.Get("/boom", func(_ fiber.Ctx) error {
		return errors.New("db down")
	})

	resp := doErrorHandlerRequest(t, app, http.MethodGet, "/boom")
	defer closeBody(t, resp)

	if resp.StatusCode != fiber.StatusInternalServerError {
		t.Fatalf("status = %d, want %d", resp.StatusCode, fiber.StatusInternalServerError)
	}
	if captured != 1 {
		t.Fatalf("captured = %d, want 1", captured)
	}
	assertBody(t, resp, internalServerErrorMessage)
}

func doErrorHandlerRequest(t *testing.T, app *fiber.App, method, path string) *http.Response {
	t.Helper()
	req, err := http.NewRequest(method, path, http.NoBody)
	if err != nil {
		t.Fatalf("build request: %v", err)
	}
	resp, err := app.Test(req, fiber.TestConfig{Timeout: -1})
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	return resp
}

func closeBody(t *testing.T, resp *http.Response) {
	t.Helper()
	if err := resp.Body.Close(); err != nil {
		t.Fatalf("close body: %v", err)
	}
}

func assertBody(t *testing.T, resp *http.Response, want string) {
	t.Helper()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read body: %v", err)
	}
	if got := string(body); got != want {
		t.Fatalf("body = %q, want %q", got, want)
	}
}
