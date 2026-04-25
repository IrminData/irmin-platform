package common

import (
	"irmin-connectors/db"
	"irmin-connectors/lib"
	"irmin-connectors/models"

	"github.com/gofiber/fiber/v3"
)

// ValidateSystemToken validates the system token for connector endpoints.
// It automatically gets connector info and sets context locals.
func ValidateSystemToken(
	c fiber.Ctx,
	app *models.ConnectorsApp,
	getConnectorInfo func() models.ConnectorDetails,
) error {
	// Get connector info
	info := getConnectorInfo()

	// Validate the system token
	tokenValid, registration := lib.ValidateConnectorSystemToken(app.DB, app.Env, app.Logger, c, info.Name)
	if !tokenValid {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	// Set the request-specific data in the context
	c.Locals("connectorInfo", &info)
	c.Locals("registration", registration)

	return c.Next()
}

// EnsureOperation is the Phase-4 middleware that runs after
// ValidateSystemToken on every data route (pull / push / patch /
// schema / subscribe / unsubscribe). It parses
// `details[<key>]=<value>` / `settings[<key>]=<value>` form fields
// the SDK ships on every Start* request, finds-or-creates the
// matching Operation row keyed on (ConnectorRegistrationID,
// ConfigHash), and stamps it on c.Locals("operation") so handlers
// that read it (the bulk of common/operation*.go) keep working
// unchanged.
//
// Why this isn't merged into ValidateSystemToken: cheap metadata
// routes (info / configuration/{key}/fields / configuration/validate)
// don't need an Operation row, and EnsureOperationFromRequest does
// real work (DB transaction, advisory lock). Splitting them keeps
// metadata fast and avoids creating empty-credential Operation rows
// for the cases that don't need them.
func EnsureOperation(
	c fiber.Ctx,
	database *db.Database,
	provider OperationConfigProvider,
) error {
	info, ok := c.Locals("connectorInfo").(*models.ConnectorDetails)
	if !ok || info == nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": ErrConnectorInfoMissing.Error(),
		})
	}
	operation, ensureErr := EnsureOperationFromRequest(c, database, info, provider)
	if ensureErr != nil {
		return c.Status(ensureErr.Status).JSON(fiber.Map{"error": ensureErr.Message})
	}
	c.Locals("operation", operation)
	return c.Next()
}

// CreateEnsureOperationMiddleware returns a fiber.Handler that runs
// EnsureOperation against the connector's controller (which must
// satisfy OperationConfigProvider). Each per-connector controller
// supplies its own concrete provider; this factory keeps the route-
// wiring boilerplate in setupConnectorRoutes free of generic-method
// gymnastics.
func CreateEnsureOperationMiddleware(
	app *models.ConnectorsApp,
	provider OperationConfigProvider,
) fiber.Handler {
	return func(c fiber.Ctx) error {
		return EnsureOperation(c, app.DB, provider)
	}
}

// CreateSystemTokenMiddleware creates a system token validation middleware for a specific connector.
func CreateSystemTokenMiddleware(
	app *models.ConnectorsApp,
	getConnectorInfo func() models.ConnectorDetails,
) fiber.Handler {
	return func(c fiber.Ctx) error {
		return ValidateSystemToken(c, app, getConnectorInfo)
	}
}
