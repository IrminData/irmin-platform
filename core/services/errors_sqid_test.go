package services_test

import (
	"errors"
	"fmt"
	"net/http"
	"testing"

	"irmin-api/services"

	"github.com/gofiber/fiber/v3"
)

// TestMapErrorToStatusCode_WrappedSQIDDecodeIsNotFound pins the
// contract that middleware relies on: when a SQID decode failure is
// wrapped with ErrNotFound (the pattern resourceMiddleware uses),
// the status code becomes 404 — not 500.
//
// Regression: frontend-generated placeholder IDs like
// `temp-connections-1776715825635-w2tvvkr` were producing 500s and
// flooding Sentry with "internal: error decoding sqid" stacks, when
// the correct answer is "that resource doesn't exist".
func TestMapErrorToStatusCode_WrappedSQIDDecodeIsNotFound(t *testing.T) {
	// resourceMiddleware wraps the sentinel on SQID decode failure.
	// The raw SQIDManager error goes into the human log message
	// (handleServiceError's first arg), not into the returned error,
	// so only ErrNotFound is wrapped.
	wrapped := fmt.Errorf("invalid %s id %q: %w",
		"connections", "temp-abc-123", services.ErrNotFound,
	)

	if !errors.Is(wrapped, services.ErrNotFound) {
		t.Fatalf("wrapped SQID error must satisfy errors.Is(err, ErrNotFound)")
	}

	gotStatus := services.MapErrorToStatusCode(wrapped)
	if gotStatus != fiber.StatusNotFound {
		t.Errorf("status = %d, want %d (http.StatusNotFound)", gotStatus, http.StatusNotFound)
	}
}
