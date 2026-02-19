package common

import (
	"encoding/json"
	"errors"
	"irmin-connectors/db"
	"irmin-connectors/models"
	"irmin-connectors/utils"

	"github.com/gofiber/fiber/v3"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// OperationInitProvider defines the interface for initializing connector operations.
type OperationInitProvider interface {
	// GetOperationFormFields returns the list of required and optional form field names
	GetOperationFormFields() (required []string, optional []string)

	// BuildDetails constructs the details JSON from parsed form fields
	BuildDetails(fields map[string]string) (map[string]string, error)

	// BuildSettings constructs the settings JSON from parsed form fields
	BuildSettings(fields map[string]string) (map[string]string, error)
}

// HandleOperationInit provides a common HTTP handler for operation initialization endpoints.
//
//nolint:gocognit // Complexity is necessary for proper locking and validation logic
func (cs *Controllers) HandleOperationInit(c fiber.Ctx, provider OperationInitProvider) error {
	// Get the connector info from the context
	info, ok := c.Locals("connectorInfo").(*models.ConnectorDetails)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Invalid connector info type in context",
		})
	}

	// Get required and optional form fields from the provider
	requiredFields, optionalFields := provider.GetOperationFormFields()

	// Parse form fields
	fields, err := utils.ParseFormFields(c, requiredFields, optionalFields)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Find relevant connector registration
	connectorRegistration, err := cs.DB.GetConnectorRegistrationByConnectorName(info.Name)
	if err != nil {
		if errors.Is(err, db.ErrConnectorRegistrationNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Connector registration not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch connector registration from database",
		})
	}

	// Create a new operation token
	operationToken, err := utils.GenerateToken(utils.DefaultTokenLength)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate operation token",
		})
	}

	// Build details using the provider
	detailsMap, err := provider.BuildDetails(fields)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Failed to build details: " + err.Error(),
		})
	}

	// Build settings using the provider
	settingsMap, err := provider.BuildSettings(fields)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Failed to build settings: " + err.Error(),
		})
	}

	// Marshal details to JSON
	details, err := json.Marshal(detailsMap)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to marshal details",
		})
	}

	// Marshal settings to JSON
	settings, err := json.Marshal(settingsMap)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to marshal settings",
		})
	}

	// Compute configuration hash for locking and deduplication
	configHash, err := utils.HashJSONFields(details, settings)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to compute configuration hash",
		})
	}

	// Use transaction with Level 1 lock to prevent duplicate operations
	var operation *db.Operation
	var isNewOperation bool
	err = cs.DB.Transaction(func(tx *gorm.DB) error {
		// Acquire lock based on connector name + config hash
		if lockErr := db.LockOperationCreation(tx, info.Name, configHash); lockErr != nil {
			return lockErr
		}

		// Check if an operation already exists for this connector + config
		// IMPORTANT: Use tx instead of cs.DB to check within the transaction scope
		existingOp, findErr := db.FindOperationByConfigHashTx(
			tx,
			connectorRegistration.ID,
			&configHash,
		)
		if findErr != nil && !errors.Is(findErr, gorm.ErrRecordNotFound) {
			return findErr
		}

		// If operation exists, return it instead of creating a new one
		if existingOp != nil {
			operation = existingOp
			return nil
		}

		// Create a new operation
		newOperation := &db.Operation{
			Details:                 datatypes.JSON(details),
			Settings:                datatypes.JSON(settings),
			Token:                   operationToken,
			ConfigHash:              &configHash,
			ConnectorRegistrationID: connectorRegistration.ID,
		}

		// Save the operation to the database within the transaction
		if createErr := tx.Create(newOperation).Error; createErr != nil {
			return createErr
		}

		operation = newOperation
		isNewOperation = true

		return nil
	})

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create operation: " + err.Error(),
		})
	}

	// Log after transaction commit so the operation is visible to all connections
	if isNewOperation {
		LogOperationEvent(
			cs.DB,
			cs.Logger,
			operation.ID,
			db.LogEventTypeInfo,
			"Operation created",
			nil,
		)
	}

	// Send the response
	return c.Status(fiber.StatusOK).JSON(operation)
}
