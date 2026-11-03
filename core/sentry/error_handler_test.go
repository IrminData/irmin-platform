package sentryutil_test

import (
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"testing"

	sentryutil "irmin-api/sentry"

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
			body:   "Internal Server Error",
			report: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			status, message, report := sentryutil.ClassifyRequestError(tt.err)
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

func TestFiberErrorHandlerUnknownRouteReturns404(t *testing.T) {
	t.Parallel()

	app := newErrorHandlerApp()
	resp := doErrorHandlerRequest(t, app, "/health")
	defer closeBody(t, resp)

	if resp.StatusCode != fiber.StatusNotFound {
		t.Fatalf("status = %d, want %d", resp.StatusCode, fiber.StatusNotFound)
	}
	assertBody(t, resp, "Not Found")
}

func TestFiberErrorHandlerFiber4xxReturnsStatus(t *testing.T) {
	t.Parallel()

	app := newErrorHandlerApp()
	app.Get("/private", func(_ fiber.Ctx) error {
		return fiber.NewError(fiber.StatusUnauthorized, "Unauthorized")
	})

	resp := doErrorHandlerRequest(t, app, "/private")
	defer closeBody(t, resp)

	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", resp.StatusCode, fiber.StatusUnauthorized)
	}
	assertBody(t, resp, "Unauthorized")
}

func TestFiberErrorHandlerFiber5xxReturnsStatus(t *testing.T) {
	t.Parallel()

	app := newErrorHandlerApp()
	app.Get("/upstream", func(_ fiber.Ctx) error {
		return fiber.NewError(fiber.StatusBadGateway, "upstream")
	})

	resp := doErrorHandlerRequest(t, app, "/upstream")
	defer closeBody(t, resp)

	if resp.StatusCode != fiber.StatusBadGateway {
		t.Fatalf("status = %d, want %d", resp.StatusCode, fiber.StatusBadGateway)
	}
	assertBody(t, resp, "upstream")
}

func TestFiberErrorHandlerNonFiberReturns500(t *testing.T) {
	t.Parallel()

	app := newErrorHandlerApp()
	app.Get("/boom", func(_ fiber.Ctx) error {
		return errors.New("db down")
	})

	resp := doErrorHandlerRequest(t, app, "/boom")
	defer closeBody(t, resp)

	if resp.StatusCode != fiber.StatusInternalServerError {
		t.Fatalf("status = %d, want %d", resp.StatusCode, fiber.StatusInternalServerError)
	}
	assertBody(t, resp, "Internal Server Error")
}

func newErrorHandlerApp() *fiber.App {
	return fiber.New(fiber.Config{
		ErrorHandler: sentryutil.NewFiberErrorHandler(slog.New(slog.DiscardHandler)),
	})
}

func doErrorHandlerRequest(t *testing.T, app *fiber.App, path string) *http.Response {
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
