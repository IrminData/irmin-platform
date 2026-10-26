package sentryutil

import (
	"errors"
	"log/slog"

	"github.com/gofiber/fiber/v3"
)

const internalServerErrorMessage = "Internal Server Error"

// NewFiberErrorHandler returns a Fiber ErrorHandler that reports unexpected
// errors to Sentry. Expected client errors (*fiber.Error with a 4xx status)
// are returned with that status and are not sent to Sentry. 5xx Fiber errors
// and non-Fiber errors are logged, reported, and returned as 5xx.
func NewFiberErrorHandler(logger *slog.Logger) fiber.ErrorHandler {
	return func(c fiber.Ctx, err error) error {
		status, message, reportToSentry := ClassifyRequestError(err)
		if reportToSentry {
			if logger != nil {
				logger.ErrorContext(
					c.Context(),
					"Unhandled request error",
					"error", err,
					"path", c.Path(),
					"method", c.Method(),
				)
			}
			GetHubFromFiber(c).CaptureException(err)
		}
		return c.Status(status).SendString(message)
	}
}

// ClassifyRequestError maps a request error to an HTTP status, response body,
// and whether it should be reported to Sentry.
func ClassifyRequestError(err error) (int, string, bool) {
	var fiberErr *fiber.Error
	if errors.As(err, &fiberErr) && fiberErr != nil {
		message := fiberErr.Message
		if message == "" {
			message = fiberErr.Error()
		}
		// 4xx Fiber errors are expected client outcomes (unknown route, auth, validation).
		reportToSentry := fiberErr.Code < fiber.StatusBadRequest ||
			fiberErr.Code >= fiber.StatusInternalServerError
		return fiberErr.Code, message, reportToSentry
	}

	return fiber.StatusInternalServerError, internalServerErrorMessage, true
}
