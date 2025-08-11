package services

import (
	"context"
	"fmt"
	"irmin-api/db"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

func (api *APIServices) GetConnectionSchema(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	connection *db.Connection,
	method string,
) (*irminmodels.ObjectSchema, error) {
	// Make sure that the user has permissions to view the connection
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceConnection,
		&connection.ID,
		db.PolicyActionRead,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to view connection",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"connection",
			connection.Name,
		)
		return nil, ErrAccessDenied
	}

	// Determine the method to use
	schemaForMethod := method
	if schemaForMethod == "" {
		schemaForMethod = "pull"
	}

	// Get the connection schema
	schema, err := api.schemaCacheManager.GetConnectionSchema(c, connection, schemaForMethod, locale, false)
	if err != nil {
		return nil, err
	}

	return schema, nil
}

func (api *APIServices) GetRepositoryObjectSchema(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	object *db.RepositoryObject,
	ref string,
) (*irminmodels.ObjectSchema, error) {
	// Make sure the user is allowed to view the object
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepositoryObject,
		&object.ID,
		db.PolicyActionRead,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to view repository object",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"repository",
			repository.Slug,
			"object",
			object.Path,
		)
		return nil, ErrAccessDenied
	}

	// Determine the branch to use
	schemaForRef := repository.DefaultBranch
	if ref != "" {
		schemaForRef = ref
	}

	// Get the object schema
	schema, err := api.schemaCacheManager.GetObjectSchema(
		c,
		workspace,
		repository,
		object,
		schemaForRef,
		locale,
		false,
	)

	if err != nil {
		return nil, err
	}

	// Make sure that the user has permissions to view the repository
	isAllowed, err = api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepository,
		&repository.ID,
		db.PolicyActionRead,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to view repository",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"repository",
			repository.Slug,
		)
		return nil, ErrAccessDenied
	}

	return schema, nil
}

func (api *APIServices) GetWorkspaceSchema(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
) (*irminmodels.ObjectSchema, error) {
	// Fetch connections and repositories concurrently
	connectionsFuture := utils.AsyncWithContext(c, func() ([]db.Connection, error) {
		return api.DB.GetConnectionsByWorkspaceID(workspace.ID)
	})

	repositoriesFuture := utils.AsyncWithContext(c, func() ([]db.Repository, error) {
		return api.DB.GetRepositoriesInWorkspace(workspace.ID)
	})

	// Await both results
	connections, connectionsAwaitErr := connectionsFuture.Await()
	if connectionsAwaitErr != nil {
		api.Logger.ErrorContext(c, "Error fetching connections", "error", connectionsAwaitErr)
		return nil, connectionsAwaitErr
	}

	repositories, repositoriesAwaitErr := repositoriesFuture.Await()
	if repositoriesAwaitErr != nil {
		api.Logger.ErrorContext(c, "Error fetching repositories", "error", repositoriesAwaitErr)
		return nil, repositoriesAwaitErr
	}

	// Fetch connection schemas concurrently
	connectionSchemaFutures := make([]utils.FutureResult[*irminmodels.ObjectSchema], len(connections))
	for i, connection := range connections {
		conn := connection // Create a new variable to avoid closure issues
		connectionSchemaFutures[i] = utils.AsyncWithContext(c, func() (*irminmodels.ObjectSchema, error) {
			return api.GetConnectionSchema(c, locale, user, workspace, &conn, "pull")
		})
	}

	// Fetch root group schemas concurrently
	rootGroupSchemaFutures := make([]utils.FutureResult[*irminmodels.ObjectSchema], len(repositories))
	for i, repository := range repositories {
		repo := repository // Create a new variable to avoid closure issues
		rootGroupSchemaFutures[i] = utils.AsyncWithContext(c, func() (*irminmodels.ObjectSchema, error) {
			return api.GetRepositoryObjectSchema(c, locale, user, workspace, &repo, &db.RepositoryObject{
				Path:          "",
				Name:          "",
				RepositoryRef: repo.DefaultBranch,
				Type:          irminmodels.ObjectTypeGroup,
			}, repo.DefaultBranch)
		})
	}

	// Collect all connection schemas
	connectionSchemas := make([]irminmodels.ObjectSchema, len(connections))
	for i, future := range connectionSchemaFutures {
		schema, connectionSchemaAwaitErr := future.Await()
		if connectionSchemaAwaitErr != nil {
			api.Logger.ErrorContext(c, "Error fetching connection schema", "error", connectionSchemaAwaitErr)
			return nil, connectionSchemaAwaitErr
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
			api.Logger.ErrorContext(c, "Error fetching root group schema", "error", rootGroupSchemaAwaitErr)
			return nil, rootGroupSchemaAwaitErr
		}
		schema.Name = repositories[i].Slug
		schema.Path = fmt.Sprintf("%s/repositories/%s", workspace.Slug, repositories[i].Slug)
		rootGroupSchemas[i] = *schema
	}

	return &irminmodels.ObjectSchema{
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
	}, nil
}
