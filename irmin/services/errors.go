package services

import (
	"errors"
	"fmt"
	"irmin-api/engine"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"
	"log/slog"
	"strings"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

// Sentinel errors used for consistent HTTP mapping in controllers
var (
	ErrNotFound                               = errors.New("not found")
	ErrInvalidRequest                         = errors.New("invalid request")
	ErrInvalidQueryParams                     = errors.New("invalid query parameters")
	ErrAccessDenied                           = errors.New("access denied")
	ErrContentTooLarge                        = errors.New("content too large to display")
	ErrSystemUserRequired                     = errors.New("system user required")
	ErrWorkspaceNotMember                     = errors.New("user not a member of the workspace")
	ErrWorkspaceNotOwner                      = errors.New("user is not the owner of the workspace")
	ErrWorkspaceOwnerCannotLeave              = errors.New("user is the owner of the workspace")
	ErrWorkspaceLastMemberCannotLeave         = errors.New("user is the last user in the workspace")
	ErrNewOwnerInvalid                        = errors.New("new owner is invalid")
	ErrURLAndSystemTokenRequiredForConnectors = errors.New("URL and system token are required for connectors")
	ErrAPITokenNotBelongToUser                = errors.New("API token does not belong to user")
	ErrAPITokenIsHidden                       = errors.New("API token is hidden")
	ErrEditorItemPathRequired                 = errors.New("editor item path is required")
	ErrEditorItemDestinationPathRequired      = errors.New("editor item destination path is required")
	ErrUserAlreadyInWorkspace                 = errors.New("user already in the workspace")
	ErrUserAlreadyInvitedToWorkspace          = errors.New("user already invited to the workspace")
	ErrInvalidRole                            = errors.New("invalid role")
	ErrInviteExpired                          = errors.New("invite expired")
	ErrInviteNotAllowed                       = errors.New("invite not allowed")
	ErrInviteAlreadyAcceptedOrDeclined        = errors.New("invite already accepted or declined")
	ErrPolicyAlreadyExists                    = errors.New("policy already exists")
	ErrRepositoryAlreadyExists                = errors.New("repository already exists")
	ErrCannotRemoveSelfFromWorkspace          = errors.New("cannot remove self from workspace")
	ErrCannotRemoveOwnerFromWorkspace         = errors.New("cannot remove owner from workspace")
	ErrInvalidWebhookType                     = errors.New("invalid webhook type")
	ErrTagNameRequired                        = errors.New("tag name is required")
	ErrCustomToolNameRequired                 = errors.New("custom tool name is required")
	ErrInvalidWorkflowType                    = errors.New("invalid workflow type")
	ErrWorkflowRunNotFound                    = errors.New("workflow run not found")
	ErrInvalidPath                            = errors.New("invalid path")
	ErrWorkflowAlreadyPaused                  = errors.New("workflow already paused")
	ErrWorkflowAlreadyRunning                 = errors.New("workflow already running")
	ErrBranchAlreadyExists                    = errors.New("branch already exists")
	ErrNoContentExtracted                     = errors.New("no content could be extracted from AI response")
	ErrReservedPathPrefix                     = errors.New("path uses reserved prefix")
	ErrCannotMovePointerToRegularPath         = errors.New("cannot move or copy pointer to a non-pointer path")
	ErrConnectorMissingPullCapability         = engine.ErrConnectorMissingPullCapability
	ErrConnectorMissingPushCapability         = engine.ErrConnectorMissingPushCapability
	ErrConnectorMissingPatchCapability        = engine.ErrConnectorMissingPatchCapability
	ErrConnectorMissingWebhookCapability      = engine.ErrConnectorMissingWebhookCapability
)

// internalErrorPrefix is used to mark errors that should not be exposed to clients
const internalErrorPrefix = "internal: "

// NewInternalError creates an error that should not be exposed to clients.
// The error message will be logged server-side but clients will receive a generic error.
func NewInternalError(msg string) error {
	return fmt.Errorf("%s%s", internalErrorPrefix, msg)
}

// NewInternalErrorf creates a formatted internal error that should not be exposed to clients.
// The error message will be logged server-side but clients will receive a generic error.
func NewInternalErrorf(format string, args ...any) error {
	return fmt.Errorf("%s"+format, append([]any{internalErrorPrefix}, args...)...)
}

// IsInternalError checks if an error is marked as internal-only and should not be exposed to clients.
func IsInternalError(err error) bool {
	if err == nil {
		return false
	}
	return strings.HasPrefix(err.Error(), internalErrorPrefix)
}

// GetInternalErrorMessage strips the internal prefix for logging purposes.
// This allows server-side logs to display the actual error message without the prefix.
func GetInternalErrorMessage(err error) string {
	if err == nil {
		return ""
	}
	return strings.TrimPrefix(err.Error(), internalErrorPrefix)
}

// GetTranslationKeyForError maps service errors to their corresponding translation keys.
// This ensures that sentinel errors with spaces in their messages (e.g., "not found")
// are mapped to proper translation keys with underscores (e.g., "not_found").
func GetTranslationKeyForError(err error) string {
	if err == nil {
		return ""
	}

	// Map specific sentinel errors to their translation keys
	switch {
	case errors.Is(err, ErrNotFound):
		return "not_found"
	case errors.Is(err, ErrInvalidRequest):
		return "invalid_request"
	case errors.Is(err, ErrInvalidQueryParams):
		return "invalid_request" // Use generic invalid_request for query params
	case errors.Is(err, ErrAccessDenied):
		return "access_denied"
	case errors.Is(err, ErrContentTooLarge):
		// Convert "content too large to display" to "content_too_large_to_display"
		// but check if a simpler key exists first
		return strings.ReplaceAll(strings.ToLower(err.Error()), " ", "_")
	case errors.Is(err, gorm.ErrRecordNotFound):
		return "not_found"
	}

	// For other errors, convert the error message to a translation key format
	// by replacing spaces with underscores and converting to lowercase
	errorMsg := err.Error()
	translationKey := strings.ReplaceAll(strings.ToLower(errorMsg), " ", "_")

	return translationKey
}

// ErrorHandler provides common error handling functionality for controllers and middlewares.
type ErrorHandler struct {
	Logger *slog.Logger
	lm     *locales.LocaleManager
}

// NewErrorHandler creates a new error handler instance.
func NewErrorHandler(logger *slog.Logger, lm *locales.LocaleManager) *ErrorHandler {
	return &ErrorHandler{
		Logger: logger,
		lm:     lm,
	}
}

// HandleServiceError handles errors from the service layer with proper translation and logging.
// It checks if the error is internal-only and either exposes it to the client or returns a generic error.
func (eh *ErrorHandler) HandleServiceError(
	c fiber.Ctx,
	consoleLogPrefix string,
	err error,
	dict locales.Dictionary,
) error {
	// Check if error should be hidden from client
	var translationKey string
	if IsInternalError(err) {
		// Internal error - log the real message server-side, hide from client
		eh.Logger.Error(
			"Internal service error",
			"source",
			consoleLogPrefix,
			"error",
			GetInternalErrorMessage(err),
		)
		translationKey = "error_occurred"
	} else {
		// Safe to expose - log and potentially translate
		eh.Logger.Error("Service error", "source", consoleLogPrefix, "error", err)
		// Map error to proper translation key (converts "not found" -> "not_found", etc.)
		translationKey = GetTranslationKeyForError(err)
	}

	// Try to translate - returns raw message if no translation key exists
	translatedMessage := eh.lm.T(dict, translationKey)

	// Map error to HTTP status code
	statusCode := MapErrorToStatusCode(err)

	// Return response with error message
	return utils.WriteResponse(c, statusCode, irminmodels.IrminAPIResponse{
		Message: translatedMessage,
		Errors: []string{
			translatedMessage,               // Specific error (if safe) or generic error_occurred
			eh.lm.T(dict, "error_occurred"), // Fallback
		},
	})
}

// MapErrorToStatusCode maps service layer errors to appropriate HTTP status codes
//
//nolint:gocyclo,cyclop,funlen // This function is intentionally complex due to comprehensive error mapping
func MapErrorToStatusCode(err error) int {
	if err == nil {
		return fiber.StatusOK
	}

	// Check for specific sentinel errors
	switch {
	case errors.Is(err, ErrNotFound):
		return fiber.StatusNotFound
	case errors.Is(err, ErrAccessDenied):
		return fiber.StatusForbidden
	case errors.Is(err, ErrInvalidRequest):
		return fiber.StatusBadRequest
	case errors.Is(err, ErrInvalidQueryParams):
		return fiber.StatusBadRequest
	case errors.Is(err, ErrContentTooLarge):
		return fiber.StatusRequestEntityTooLarge
	case errors.Is(err, ErrSystemUserRequired):
		return fiber.StatusForbidden
	case errors.Is(err, ErrWorkspaceNotMember):
		return fiber.StatusForbidden
	case errors.Is(err, ErrWorkspaceNotOwner):
		return fiber.StatusForbidden
	case errors.Is(err, ErrWorkspaceOwnerCannotLeave):
		return fiber.StatusBadRequest
	case errors.Is(err, ErrWorkspaceLastMemberCannotLeave):
		return fiber.StatusBadRequest
	case errors.Is(err, ErrNewOwnerInvalid):
		return fiber.StatusBadRequest
	case errors.Is(err, ErrURLAndSystemTokenRequiredForConnectors):
		return fiber.StatusBadRequest
	case errors.Is(err, ErrAPITokenNotBelongToUser):
		return fiber.StatusForbidden
	case errors.Is(err, ErrAPITokenIsHidden):
		return fiber.StatusForbidden
	case errors.Is(err, ErrEditorItemPathRequired):
		return fiber.StatusBadRequest
	case errors.Is(err, ErrEditorItemDestinationPathRequired):
		return fiber.StatusBadRequest
	case errors.Is(err, ErrUserAlreadyInWorkspace):
		return fiber.StatusConflict
	case errors.Is(err, ErrUserAlreadyInvitedToWorkspace):
		return fiber.StatusConflict
	case errors.Is(err, ErrInvalidRole):
		return fiber.StatusBadRequest
	case errors.Is(err, ErrInviteExpired):
		return fiber.StatusGone
	case errors.Is(err, ErrInviteNotAllowed):
		return fiber.StatusForbidden
	case errors.Is(err, ErrInviteAlreadyAcceptedOrDeclined):
		return fiber.StatusConflict
	case errors.Is(err, ErrPolicyAlreadyExists):
		return fiber.StatusConflict
	case errors.Is(err, ErrRepositoryAlreadyExists):
		return fiber.StatusBadRequest
	case errors.Is(err, ErrCannotRemoveSelfFromWorkspace):
		return fiber.StatusBadRequest
	case errors.Is(err, ErrCannotRemoveOwnerFromWorkspace):
		return fiber.StatusBadRequest
	case errors.Is(err, ErrInvalidWebhookType):
		return fiber.StatusBadRequest
	case errors.Is(err, ErrTagNameRequired):
		return fiber.StatusBadRequest
	case errors.Is(err, ErrCustomToolNameRequired):
		return fiber.StatusBadRequest
	case errors.Is(err, ErrInvalidWorkflowType):
		return fiber.StatusBadRequest
	case errors.Is(err, ErrWorkflowRunNotFound):
		return fiber.StatusNotFound
	case errors.Is(err, ErrInvalidPath):
		return fiber.StatusBadRequest
	case errors.Is(err, ErrWorkflowAlreadyPaused):
		return fiber.StatusConflict
	case errors.Is(err, ErrWorkflowAlreadyRunning):
		return fiber.StatusConflict
	case errors.Is(err, lib.ErrWorkflowMinIntervalNotMet):
		return fiber.StatusConflict
	case errors.Is(err, ErrBranchAlreadyExists):
		return fiber.StatusConflict
	case errors.Is(err, ErrNoContentExtracted):
		return fiber.StatusUnprocessableEntity
	case errors.Is(err, ErrReservedPathPrefix):
		return fiber.StatusBadRequest
	case errors.Is(err, ErrCannotMovePointerToRegularPath):
		return fiber.StatusBadRequest
	case errors.Is(err, ErrConnectorMissingPullCapability):
		return fiber.StatusBadRequest
	case errors.Is(err, ErrConnectorMissingPushCapability):
		return fiber.StatusBadRequest
	case errors.Is(err, ErrConnectorMissingPatchCapability):
		return fiber.StatusBadRequest
	case errors.Is(err, ErrConnectorMissingWebhookCapability):
		return fiber.StatusBadRequest
	case errors.Is(err, gorm.ErrRecordNotFound):
		return fiber.StatusNotFound
	}

	// Default to internal server error for unknown errors
	return fiber.StatusInternalServerError
}
