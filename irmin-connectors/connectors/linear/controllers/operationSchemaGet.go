package linearcontrollers

import (
	"log/slog"

	"irmin-connectors/connectors/common"
	linearclient "irmin-connectors/connectors/linear/client"
	linearconfig "irmin-connectors/connectors/linear/config"
	"irmin-connectors/db"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// linearSchemaProvider advertises the on-disk shape of pull output
// and the accepted shape of push/patch input. The schema is
// intentionally permissive — Linear's API surface evolves frequently
// and we keep `additionalProperties: true` so a vendor field
// addition cannot invalidate previously-pulled snapshots or trip up
// previously-valid push files.
type linearSchemaProvider struct{}

// InitializeClient is a no-op for Linear's schema — the shape is
// derived statically from the resource table, not from a live API
// call. Matches the Stripe pattern.
func (p *linearSchemaProvider) InitializeClient(
	_ fiber.Ctx, _ *slog.Logger, _ *db.Operation,
) (any, *string, func(), error) {
	return nil, nil, func() {}, nil
}

// GetSupportedOperationTypes is computed from the static
// capabilities so adding a new capability to GetConnectorInfo is
// the only edit needed to surface it on /operation/schema.
func (p *linearSchemaProvider) GetSupportedOperationTypes() []string {
	return common.CapabilitiesToOperationTypes(linearconfig.GetConnectorInfo().Capabilities)
}

// GetSchema returns an Irmin ObjectSchema describing the connector's
// on-disk layout for a given operation. Pull emits one JSON-array
// file per resource (`issues.json`, `projects.json`, …); push/patch
// expect per-record files under `<resource>/<id>.json` (or
// `<resource>/new-*.json` for create on push).
func (p *linearSchemaProvider) GetSchema(
	_ fiber.Ctx,
	_ any,
	operationType string,
	_ *string,
) (*irminmodels.ObjectSchema, error) {
	jsonCT := "application/json"
	var children []irminmodels.ObjectSchema

	if operationType == "pull" {
		for _, resource := range linearclient.KnownResources() {
			if !resource.Pull {
				continue
			}
			recordSchema := linearRecordSchema(resource.Name)
			arraySchema := irminmodels.JSONSchema{
				Type:        "array",
				Description: strPtr("Linear " + resource.Name + " pulled via Linear's MCP tools at mcp.linear.app."),
				Items:       &recordSchema,
			}
			children = append(children, irminmodels.ObjectSchema{
				Name:        resource.Name + ".json",
				Path:        resource.Name + ".json",
				Type:        irminmodels.ObjectTypeStructured,
				ContentType: &jsonCT,
				Schema:      &arraySchema,
			})
		}
	} else {
		// Push / patch — only `issues` is write-enabled. Advertise
		// `<resource>/{id-or-new-*}.json` so the console renders a
		// single editable shape per resource directory.
		for _, resource := range linearclient.KnownResources() {
			if !resource.Push && !resource.Patch {
				continue
			}
			recordSchema := linearRecordSchema(resource.Name)
			children = append(children, irminmodels.ObjectSchema{
				Name: resource.Name,
				Path: resource.Name,
				Type: irminmodels.ObjectTypeGroup,
				Children: []irminmodels.ObjectSchema{
					{
						Name:        "{id-or-new-*}.json",
						Path:        resource.Name + "/{id-or-new-*}.json",
						Type:        irminmodels.ObjectTypeStructured,
						ContentType: &jsonCT,
						Schema:      &recordSchema,
					},
				},
			})
		}
	}

	return &irminmodels.ObjectSchema{
		Type:     irminmodels.ObjectTypeGroup,
		Name:     "linear",
		Path:     "",
		Children: children,
	}, nil
}

// linearRecordSchema returns a minimal record schema for a Linear
// resource. Linear's response shapes are far richer than the listed
// properties; we enumerate only the highest-signal fields and rely
// on `additionalProperties: true` for everything else. This keeps
// the schema useful without coupling to a transient API shape.
func linearRecordSchema(kind string) irminmodels.JSONSchema {
	props := map[string]irminmodels.JSONSchema{
		"id": {Type: "string", Description: strPtr("Linear-assigned UUID for the record.")},
	}
	switch kind {
	case linearclient.ResourceIssues:
		props["identifier"] = irminmodels.JSONSchema{
			Type:        "string",
			Description: strPtr("Human-readable issue identifier (e.g., IRM-42)."),
		}
		props["title"] = irminmodels.JSONSchema{
			Type:        "string",
			Description: strPtr("Issue title."),
		}
		props["description"] = irminmodels.JSONSchema{
			Type:        "string",
			Description: strPtr("Markdown body of the issue."),
		}
		props["url"] = irminmodels.JSONSchema{
			Type:        "string",
			Description: strPtr("Direct URL to the issue in Linear."),
		}
	case linearclient.ResourceProjects:
		props["name"] = irminmodels.JSONSchema{Type: "string"}
		props["state"] = irminmodels.JSONSchema{Type: "string"}
	case linearclient.ResourceCycles:
		props["number"] = irminmodels.JSONSchema{Type: "integer"}
	case linearclient.ResourceTeams:
		props["key"] = irminmodels.JSONSchema{
			Type:        "string",
			Description: strPtr("Short team key (e.g., IRM)."),
		}
		props["name"] = irminmodels.JSONSchema{Type: "string"}
	}
	return irminmodels.JSONSchema{
		Type:                 "object",
		Properties:           props,
		AdditionalProperties: true,
	}
}

// strPtr returns a pointer to s. Schema fields use *string so the
// JSON encoder can omit the field when empty; this is the canonical
// shorthand every connector uses.
func strPtr(s string) *string { return &s }

// OperationSchemaGet godoc
// @Summary Get Linear operation schema
// @Description Returns an Irmin ObjectSchema describing the on-disk file layout the Linear connector emits on pull and accepts on push/patch.
// @Tags linear
// @Security SystemTokenAuth
// @Accept json
// @Produce json
// @Param operation path string true "Operation type" Enums(pull, push, patch)
// @Success 200 {object} irminmodels.ObjectSchema "Operation schema"
// @Failure 400 {object} fiber.Map "Bad request"
// @Failure 401 {object} fiber.Map "Unauthorized"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /linear/operation/schema/{operation} [post]
func (cs *Controllers) OperationSchemaGet(c fiber.Ctx) error {
	provider := &linearSchemaProvider{}
	return common.HandleOperationSchemaGet(c, provider, cs.Logger, cs.DB, cs.App)
}

// SubscribeToChanges is not supported.
func (cs *Controllers) SubscribeToChanges(c fiber.Ctx) error {
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"error": "Subscribe to changes is not supported by the Linear connector",
	})
}

// UnsubscribeFromChanges is not supported.
func (cs *Controllers) UnsubscribeFromChanges(c fiber.Ctx) error {
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"error": "Unsubscribe from changes is not supported by the Linear connector",
	})
}
