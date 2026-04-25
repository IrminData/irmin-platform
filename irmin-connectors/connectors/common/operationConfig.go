package common

import (
	"encoding/json"
	"errors"
	"fmt"
	"irmin-connectors/db"
	"irmin-connectors/models"
	"irmin-connectors/utils"

	"github.com/gofiber/fiber/v3"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// OperationConfigProvider exposes a connector's request-time
// configuration shape. EnsureOperationFromRequest consumes it on every
// data route to parse the SDK's `details[<key>]` / `settings[<key>]`
// form fields, build the per-connector credential maps, and upsert the
// matching Operation row keyed on (Connector, ConfigHash).
//
// The interface used to be called OperationInitProvider when its sole
// caller was the (now-retired) /operation/init handler. Phase 4 retired
// init; the methods here drive the inline upsert path on every Start*
// request, so the name reflects the surviving role: build the request-
// time config, not initialise anything.
type OperationConfigProvider interface {
	// GetOperationFormFields returns the list of required and optional
	// form field names ParseFormFields should look up on the request.
	GetOperationFormFields() (required []string, optional []string)

	// BuildDetails constructs the details JSON from parsed form fields.
	BuildDetails(fields map[string]string) (map[string]string, error)

	// BuildSettings constructs the settings JSON from parsed form fields.
	BuildSettings(fields map[string]string) (map[string]string, error)
}

// EnsureOperationFromRequestError carries an HTTP-shaped error returned
// by EnsureOperationFromRequest. Handlers translate it into the
// appropriate JobError envelope or other HTTP response.
type EnsureOperationFromRequestError struct {
	Status  int
	Message string
	Cause   error
}

// Error implements the error interface so the type works with errors.Is /
// errors.As and so a bare `return err` from a handler still produces an
// operator-facing message in the worst case.
func (e *EnsureOperationFromRequestError) Error() string {
	if e == nil {
		return ""
	}
	if e.Cause != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Cause)
	}
	return e.Message
}

// Unwrap exposes the underlying cause for errors.Is / errors.As.
func (e *EnsureOperationFromRequestError) Unwrap() error {
	if e == nil {
		return nil
	}
	return e.Cause
}

// EnsureOperationFromRequest is the Phase 4 replacement for the
// /operation/init handshake. Each Start* request now carries
// `details[<key>]=<value>` and `settings[<key>]=<value>` form fields
// (the SDK's StartOperation*Request.Details / .Settings) — this
// helper parses them through the connector's existing
// OperationConfigProvider, marshals + hashes the result, and atomically
// upserts the matching Operation row keyed on
// (ConnectorRegistrationID, ConfigHash). Subsequent calls with the
// same credentials reuse the same row, so worker code that reads
// `operation.Details` / `.Settings` keeps working unchanged.
//
// Returns *EnsureOperationFromRequestError on failure so handlers can
// translate the carried HTTP status into their preferred envelope
// (RespondJobError for Start*, plain fiber.Map for the legacy init
// route during the transitional release).
//
//nolint:gocognit // upsert-with-lock + form parsing is inherently branchy
func EnsureOperationFromRequest(
	c fiber.Ctx,
	database *db.Database,
	info *models.ConnectorDetails,
	provider OperationConfigProvider,
) (*db.Operation, *EnsureOperationFromRequestError) {
	if info == nil {
		return nil, &EnsureOperationFromRequestError{
			Status:  fiber.StatusInternalServerError,
			Message: "connector info not set in context",
		}
	}

	// Get required and optional form fields from the provider.
	requiredFields, optionalFields := provider.GetOperationFormFields()
	fields, err := utils.ParseFormFields(c, requiredFields, optionalFields)
	if err != nil {
		return nil, &EnsureOperationFromRequestError{
			Status:  fiber.StatusBadRequest,
			Message: err.Error(),
			Cause:   err,
		}
	}

	connectorRegistration, err := database.GetConnectorRegistrationByConnectorName(info.Name)
	if err != nil {
		if errors.Is(err, db.ErrConnectorRegistrationNotFound) {
			return nil, &EnsureOperationFromRequestError{
				Status:  fiber.StatusNotFound,
				Message: "connector registration not found",
				Cause:   err,
			}
		}
		return nil, &EnsureOperationFromRequestError{
			Status:  fiber.StatusInternalServerError,
			Message: "failed to fetch connector registration",
			Cause:   err,
		}
	}

	detailsMap, err := provider.BuildDetails(fields)
	if err != nil {
		return nil, &EnsureOperationFromRequestError{
			Status:  fiber.StatusBadRequest,
			Message: "failed to build details",
			Cause:   err,
		}
	}
	settingsMap, err := provider.BuildSettings(fields)
	if err != nil {
		return nil, &EnsureOperationFromRequestError{
			Status:  fiber.StatusBadRequest,
			Message: "failed to build settings",
			Cause:   err,
		}
	}

	details, err := json.Marshal(detailsMap)
	if err != nil {
		return nil, &EnsureOperationFromRequestError{
			Status:  fiber.StatusInternalServerError,
			Message: "failed to marshal details",
			Cause:   err,
		}
	}
	settings, err := json.Marshal(settingsMap)
	if err != nil {
		return nil, &EnsureOperationFromRequestError{
			Status:  fiber.StatusInternalServerError,
			Message: "failed to marshal settings",
			Cause:   err,
		}
	}

	configHash, err := utils.HashJSONFields(details, settings)
	if err != nil {
		return nil, &EnsureOperationFromRequestError{
			Status:  fiber.StatusInternalServerError,
			Message: "failed to compute configuration hash",
			Cause:   err,
		}
	}

	// Phase 4 keeps /operation/init's invariant: at most one
	// Operation row per (Connector, ConfigHash). The advisory lock
	// prevents two concurrent Start* requests from racing the
	// upsert — without it, the second caller would create a
	// duplicate row when both observed an empty FindByConfigHash.
	var operation *db.Operation
	var isNewOperation bool
	txErr := database.Transaction(func(tx *gorm.DB) error {
		if lockErr := db.LockOperationCreation(tx, info.Name, configHash); lockErr != nil {
			return lockErr
		}

		existingOp, findErr := db.FindOperationByConfigHashTx(
			tx,
			connectorRegistration.ID,
			&configHash,
		)
		if findErr != nil && !errors.Is(findErr, gorm.ErrRecordNotFound) {
			return findErr
		}

		if existingOp != nil {
			operation = existingOp
			return nil
		}

		// Phase 4 retires Operation.Token as a client-facing
		// credential; the per-job operation_token persisted on
		// OperationJob is what handlers / Core use now. The
		// column stays for back-compat (rollback safety to a
		// pre-Phase-4 binary) but we populate it with a fresh
		// throwaway value rather than a useful credential.
		throwawayToken, tokenErr := utils.GenerateToken(utils.DefaultTokenLength)
		if tokenErr != nil {
			return fmt.Errorf("generate placeholder token: %w", tokenErr)
		}
		newOperation := &db.Operation{
			Details:                 datatypes.JSON(details),
			Settings:                datatypes.JSON(settings),
			Token:                   throwawayToken,
			ConfigHash:              &configHash,
			ConnectorRegistrationID: connectorRegistration.ID,
		}
		if createErr := tx.Create(newOperation).Error; createErr != nil {
			return createErr
		}
		operation = newOperation
		isNewOperation = true
		return nil
	})

	if txErr != nil {
		return nil, &EnsureOperationFromRequestError{
			Status:  fiber.StatusInternalServerError,
			Message: "failed to upsert operation",
			Cause:   txErr,
		}
	}

	if isNewOperation {
		// Caller logger isn't reachable from here; LogOperationEvent
		// tolerates a nil logger. Matches the legacy init behaviour.
		LogOperationEvent(database, nil, operation.ID, db.LogEventTypeInfo, "Operation upserted from Start*", nil)
	}

	return operation, nil
}
