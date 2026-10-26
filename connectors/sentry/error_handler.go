package sentryutil

import (
	"errors"
	"log/slog"

	"github.com/gofiber/fiber/v3"
)

const internalServerErrorMessage = "Internal Server Error"

// HandleFiberError is a Fiber ErrorHandler that reports unexpected errors to Sentry.
// Expected client errors (*fiber.Error with a 4xx status) are returned with that
// status and are not sent to Sentry. 5xx Fiber errors and non-Fiber errors are
// reported and returned as 5xx.
func HandleFiberError(c fiber.Ctx, err error) error {
	return handleFiberError(c, err, func(ctx fiber.Ctx, captured error) {
		GetHubFromFiber(ctx).CaptureException(captured)
	})
}

func handleFiberError(c fiber.Ctx, err error, capture func(fiber.Ctx, error)) error {
	status, message, reportToSentry := classifyRequestError(err)
	if reportToSentry {
		slog.Error("Unhandled request error", "error", err, "path", c.Path(), "method", c.Method())
		capture(c, err)
	}
	return c.Status(status).SendString(message)
}

func classifyRequestError(err error) (status int, message string, reportToSentry bool) {
	var fiberErr *fiber.Error
	if errors.As(err, &fiberErr) && fiberErr != nil {
		status = fiberErr.Code
		message = fiberErr.Message
		if message == "" {
			message = fiberErr.Error()
		}
		// 4xx Fiber errors are expected client outcomes (unknown route, auth, validation).
		reportToSentry = status < fiber.StatusBadRequest || status >= fiber.StatusInternalServerError
		return status, message, reportToSentry
	}

	return fiber.StatusInternalServerError, internalServerErrorMessage, true
}
