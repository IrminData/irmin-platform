package controllers

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"
	"log"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

func WorkspaceSchemaIndex(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Fetch connections and repositories concurrently
	connectionsFuture := utils.AsyncWithContext(c.Context(), func() ([]db.Connection, error) {
		return db.GetConnectionsByWorkspaceID(workspace.ID)
	})

	repositoriesFuture := utils.AsyncWithContext(c.Context(), func() ([]db.Repository, error) {
		return db.GetRepositoriesInWorkspace(workspace.ID)
	})

	// Await both results
	connections, err := connectionsFuture.Await()
	if err != nil {
		log.Printf("Error fetching connections: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	repositories, err := repositoriesFuture.Await()
	if err != nil {
		log.Printf("Error fetching repositories: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Fetch connection schemas concurrently
	connectionSchemaFutures := make([]utils.FutureResult[*irminmodels.ObjectSchema], len(connections))
	for i, connection := range connections {
		conn := connection // Create a new variable to avoid closure issues
		connectionSchemaFutures[i] = utils.AsyncWithContext(c.Context(), func() (*irminmodels.ObjectSchema, error) {
			return lib.GetConnectionSchema(&conn, "pull", locale)
		})
	}

	// Fetch root group schemas concurrently
	rootGroupSchemaFutures := make([]utils.FutureResult[*irminmodels.ObjectSchema], len(repositories))
	for i, repository := range repositories {
		repo := repository // Create a new variable to avoid closure issues
		rootGroupSchemaFutures[i] = utils.AsyncWithContext(c.Context(), func() (*irminmodels.ObjectSchema, error) {
			return lib.GetObjectSchema(
				workspace,
				&repo,
				&irminmodels.Object{
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
		schema, err := future.Await()
		if err != nil {
			log.Printf("Error fetching connection schema: %v", err)
			return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
		schema.Name = connections[i].Name
		schema.Path = fmt.Sprintf("%s/connections/%s", workspace.Slug, connections[i].Name)
		connectionSchemas[i] = *schema
	}

	// Collect all root group schemas
	rootGroupSchemas := make([]irminmodels.ObjectSchema, len(repositories))
	for i, future := range rootGroupSchemaFutures {
		schema, err := future.Await()
		if err != nil {
			log.Printf("Error fetching root group schema: %v", err)
			return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
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
