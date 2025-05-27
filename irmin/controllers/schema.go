package controllers

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

func (api *APIControllers) WorkspaceSchemaIndex(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)

	if !localeOk || !dictOk || !workspaceOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Fetch connections and repositories concurrently
	connectionsFuture := utils.AsyncWithContext(c.Context(), func() ([]db.Connection, error) {
		return api.DB.GetConnectionsByWorkspaceID(workspace.ID)
	})

	repositoriesFuture := utils.AsyncWithContext(c.Context(), func() ([]db.Repository, error) {
		return api.DB.GetRepositoriesInWorkspace(workspace.ID)
	})

	// Await both results
	connections, connectionsAwaitErr := connectionsFuture.Await()
	if connectionsAwaitErr != nil {
		api.Logger.Error("Error fetching connections", "error", connectionsAwaitErr)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	repositories, repositoriesAwaitErr := repositoriesFuture.Await()
	if repositoriesAwaitErr != nil {
		api.Logger.Error("Error fetching repositories", "error", repositoriesAwaitErr)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Create a new schema cache manager
	scm := lib.NewSchemaCacheManager(api.Env, api.Logger, api.DB)

	// Fetch connection schemas concurrently
	connectionSchemaFutures := make([]utils.FutureResult[*irminmodels.ObjectSchema], len(connections))
	for i, connection := range connections {
		conn := connection // Create a new variable to avoid closure issues
		connectionSchemaFutures[i] = utils.AsyncWithContext(c.Context(), func() (*irminmodels.ObjectSchema, error) {
			return scm.GetConnectionSchema(c.Context(), &conn, "pull", locale)
		})
	}

	// Fetch root group schemas concurrently
	rootGroupSchemaFutures := make([]utils.FutureResult[*irminmodels.ObjectSchema], len(repositories))
	for i, repository := range repositories {
		repo := repository // Create a new variable to avoid closure issues
		rootGroupSchemaFutures[i] = utils.AsyncWithContext(c.Context(), func() (*irminmodels.ObjectSchema, error) {
			return scm.GetObjectSchema(
				c.Context(),
				workspace,
				&repo,
				&db.RepositoryObject{
					Path: "",
					Name: "",
					Type: irminmodels.ObjectTypeGroup,
				},
				repo.DefaultBranch,
				locale,
			)
		})
	}

	// Collect all connection schemas
	connectionSchemas := make([]irminmodels.ObjectSchema, len(connections))
	for i, future := range connectionSchemaFutures {
		schema, connectionSchemaAwaitErr := future.Await()
		if connectionSchemaAwaitErr != nil {
			api.Logger.Error("Error fetching connection schema", "error", connectionSchemaAwaitErr)
			return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "error_occurred")},
			})
		}
		schema.Name = connections[i].Name
		schema.Path = fmt.Sprintf("%s/connections/%s", workspace.Slug, connections[i].Name)
		connectionSchemas[i] = *schema
	}

	// Collect all root group schemas
	rootGroupSchemas := make([]irminmodels.ObjectSchema, len(repositories))
	for i, future := range rootGroupSchemaFutures {
		schema, rootGroupSchemaAwaitErr := future.Await()
		if rootGroupSchemaAwaitErr != nil {
			api.Logger.Error("Error fetching root group schema", "error", rootGroupSchemaAwaitErr)
			return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "error_occurred")},
			})
		}
		schema.Name = repositories[i].Slug
		schema.Path = fmt.Sprintf("%s/repositories/%s", workspace.Slug, repositories[i].Slug)
		rootGroupSchemas[i] = *schema
	}

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: irminmodels.ObjectSchema{
			Name: workspace.Slug,
			Path: workspace.Slug,
			Type: irminmodels.ObjectTypeGroup,
			Children: []irminmodels.ObjectSchema{
				{
					Name:     "connections",
					Path:     fmt.Sprintf("%s/connections", workspace.Slug),
					Type:     irminmodels.ObjectTypeGroup,
					Children: connectionSchemas,
				},
				{
					Name:     "repositories",
					Path:     fmt.Sprintf("%s/repositories", workspace.Slug),
					Type:     irminmodels.ObjectTypeGroup,
					Children: rootGroupSchemas,
				},
			},
		},
	})
}
