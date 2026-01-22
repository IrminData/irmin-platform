package middlewares

import (
	"crypto/subtle"
	"errors"
	"irmin-api/db"
	"irmin-api/services"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// ErrNoMatchingSubscription indicates no active subscription matches the provided webhook token.
var ErrNoMatchingSubscription = errors.New("no matching subscription found")

const (
	// WebhookTokenHeader is the header name for the webhook authentication token.
	//nolint:gosec // G101: This is a header name, not a credential
	WebhookTokenHeader = "X-Webhook-Token"
)

// ConnectorWebhookMiddleware validates webhook requests from connectors.
// It verifies the webhook token and loads the connection into the context.
//
// This middleware does NOT require user authentication - it uses webhook tokens
// that are generated when a connection subscription is created.
func (api *APIMiddlewares) ConnectorWebhookMiddleware(c fiber.Ctx) error {
	// Get the dictionary for translations
	dict, _ := api.lm.GetDictionary(c)

	// Get connection ID from path parameter
	connectionParam := c.Params("connection")
	if connectionParam == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Message: "Connection ID is required",
		})
	}

	// Decode the connection SQID to get the numeric ID
	connectionID, err := api.SQIDManager.Decode("connections", connectionParam)
	if err != nil {
		api.Logger.Warn("Invalid connection SQID in webhook request",
			"connection_param", connectionParam,
			"error", err,
		)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Message: "Invalid connection ID",
		})
	}

	// Get the webhook token from the header
	webhookToken := c.Get(WebhookTokenHeader)
	if webhookToken == "" {
		api.Logger.Warn("Missing webhook token in connector webhook request",
			"connection_id", connectionID,
		)
		return utils.WriteResponse(c, fiber.StatusUnauthorized, irminmodels.IrminAPIResponse{
			Message: "Webhook token is required",
		})
	}

	// Load the connection from the database
	connection, err := api.DB.GetConnectionByID(uint(connectionID))
	if err != nil {
		api.Logger.Warn("Connection not found for webhook request",
			"connection_id", connectionID,
			"error", err,
		)
		return api.handleServiceError(
			c,
			"Connection not found",
			services.ErrNotFound,
			dict,
		)
	}

	// Validate the webhook token against the stored subscription token
	// Look up the subscription for this connection and validate the token
	subscription, validateErr := api.validateWebhookToken(connection.ID, webhookToken)
	if validateErr != nil {
		if errors.Is(validateErr, ErrNoMatchingSubscription) {
			api.Logger.Warn("Invalid webhook token for connection",
				"connection_id", connectionID,
			)
			return utils.WriteResponse(c, fiber.StatusUnauthorized, irminmodels.IrminAPIResponse{
				Message: "Invalid webhook token",
			})
		}
		api.Logger.Error("Error validating webhook token",
			"connection_id", connectionID,
			"error", validateErr,
		)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Message: "Error validating webhook token",
		})
	}

	// Store connection and subscription in context for the controller
	c.Locals("connection", connection)
	c.Locals("subscription", subscription)
	c.Locals("dict", dict)

	api.Logger.Debug("Connector webhook authenticated successfully",
		"connection_id", connection.ID,
		"connection_name", connection.Name,
	)

	return c.Next()
}

// validateWebhookToken checks if the provided token is valid for the given connection.
// It looks up subscriptions in the database and compares tokens securely.
// Returns the matching subscription if found, nil otherwise.
func (api *APIMiddlewares) validateWebhookToken(connectionID uint, token string) (*db.ConnectionSubscription, error) {
	// Get all subscriptions for this connection
	subscriptions, err := api.DB.GetConnectionSubscriptionsByConnectionID(connectionID)
	if err != nil {
		return nil, err
	}

	// Check if any active subscription has a matching token
	for i := range subscriptions {
		sub := subscriptions[i]
		// Skip inactive subscriptions - deactivated tokens should not authenticate
		if !sub.IsActive {
			continue
		}
		// Use constant-time comparison to prevent timing attacks
		if subtle.ConstantTimeCompare([]byte(sub.WebhookToken), []byte(token)) == 1 {
			return &sub, nil
		}
	}

	return nil, ErrNoMatchingSubscription
}

// LocaleMiddlewareForWebhooks provides locale detection for webhook endpoints
// that don't have user authentication.
func (api *APIMiddlewares) LocaleMiddlewareForWebhooks(c fiber.Ctx) error {
	// Use the existing locale manager to get the dictionary based on Accept-Language header
	dict, locale := api.lm.GetDictionary(c)

	// Store in context
	c.Locals("locale", locale)
	c.Locals("dict", dict)

	return c.Next()
}
