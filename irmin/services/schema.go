package services

import (
	"context"
	"errors"
	"fmt"
	"io"

	"irmin-api/db"
	"irmin-api/engine"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// GenerateSchemaFromUploadedFile generates a schema for an uploaded file.
func (api *APIServices) GenerateSchemaFromUploadedFile(
	ctx context.Context,
	locale string,
	filename string,
	fileReader io.Reader,
) (*irminmodels.ObjectSchema, error) {
	// Read the file data
	fileData, err := io.ReadAll(fileReader)
	if err != nil {
		return nil, fmt.Errorf("failed to read file data: %w", err)
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(ctx, locale, api.Logger, api.Env, api.DB)
	if err != nil {
		api.Logger.ErrorContext(ctx, "error creating data engine client", "error", err)
		return nil, err
	}

	// Generate the schema
	schema, err := dataEngine.GenerateSchemaFromFile(ctx, filename, fileData)
	if err != nil {
		api.Logger.ErrorContext(ctx, "error generating schema from file", "error", err)
		return nil, fmt.Errorf("failed to generate schema: %w", err)
	}

	return schema, nil
}

// GetRepositoryObjectSchema gets the schema for a repository object.
func (api *APIServices) GetRepositoryObjectSchema(
	ctx context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	object *db.RepositoryObject,
	ref string,
) (*irminmodels.ObjectSchema, error) {
	// Check user permissions for the repository
	allowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepository,
		&repository.ID,
		db.PolicyActionRead,
	)
	if err != nil {
		api.Logger.ErrorContext(ctx, "error checking repository permissions", "error", err)
		return nil, fmt.Errorf("failed to check permissions: %w", err)
	}
	if !allowed {
		return nil, errors.New("unauthorized access to repository object schema")
	}

	// Use the schema cache manager to get the object schema
	schema, err := api.schemaCacheManager.GetObjectSchema(
		ctx,
		workspace,
		repository,
		object,
		ref,
		locale,
		false,
	)
	if err != nil {
		api.Logger.ErrorContext(ctx, "error getting object schema", "error", err)
		return nil, fmt.Errorf("failed to get object schema: %w", err)
	}

	return schema, nil
}

// GetConnectionSchema gets the schema for a connection.
func (api *APIServices) GetConnectionSchema(
	ctx context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	connection *db.Connection,
	operationMethod string,
	path string,
) (*irminmodels.ObjectSchema, error) {
	// Check user permissions for the connection
	allowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceConnection,
		&connection.ID,
		db.PolicyActionRead,
	)
	if err != nil {
		api.Logger.ErrorContext(ctx, "error checking connection permissions", "error", err)
		return nil, fmt.Errorf("failed to check permissions: %w", err)
	}
	if !allowed {
		return nil, errors.New("unauthorized access to connection schema")
	}

	// Use the schema cache manager to get the connection schema
	schema, _, err := api.schemaCacheManager.GetConnectionSchema(
		ctx,
		connection,
		operationMethod,
		path,
		locale,
		false,
	)
	if err != nil {
		api.Logger.ErrorContext(ctx, "error getting connection schema", "error", err)
		return nil, fmt.Errorf("failed to get connection schema: %w", err)
	}

	return schema, nil
}

// GetWorkspaceSchema gets the complete schema for a workspace.
func (api *APIServices) GetWorkspaceSchema(
	ctx context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	includeConnections bool,
	includeRepositories bool,
) (*irminmodels.ObjectSchema, error) {
	// Check user permissions for the workspace
	allowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceWorkspace,
		&workspace.ID,
		db.PolicyActionRead,
	)
	if err != nil {
		api.Logger.ErrorContext(ctx, "error checking workspace permissions", "error", err)
		return nil, fmt.Errorf("failed to check permissions: %w", err)
	}
	if !allowed {
		return nil, errors.New("unauthorized access to workspace schema")
	}

	// Create the base workspace schema
	workspaceSchema := &irminmodels.ObjectSchema{
		Name:     workspace.Name,
		Type:     irminmodels.ObjectTypeGroup,
		Children: []irminmodels.ObjectSchema{},
	}

	// Include connections if requested
	if includeConnections {
		if connErr := api.addConnectionSchemas(ctx, locale, user, workspace, workspaceSchema); connErr != nil {
			return nil, connErr
		}
	}

	// Include repositories if requested
	if includeRepositories {
		if repoErr := api.addRepositorySchemas(ctx, locale, user, workspace, workspaceSchema); repoErr != nil {
			return nil, repoErr
		}
	}

	return workspaceSchema, nil
}

// addConnectionSchemas adds connection schemas to the workspace schema.
func (api *APIServices) addConnectionSchemas(
	ctx context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	workspaceSchema *irminmodels.ObjectSchema,
) error {
	connections, err := api.DB.GetConnectionsByWorkspaceID(workspace.ID)
	if err != nil {
		api.Logger.ErrorContext(ctx, "error getting connections for workspace", "error", err)
		return fmt.Errorf("failed to get connections: %w", err)
	}

	for _, connection := range connections {
		// Check permissions for each connection
		connAllowed, connErr := api.PermissionService.IsAllowed(
			user,
			workspace,
			db.PolicyResourceConnection,
			&connection.ID,
			db.PolicyActionRead,
		)
		if connErr != nil {
			api.Logger.WarnContext(
				ctx,
				"error checking connection permissions",
				"connection_id",
				connection.ID,
				"error",
				connErr,
			)
			continue
		}
		if !connAllowed {
			continue
		}

		// Get connection schema for pull operation (default)
		connSchema, _, connSchemaErr := api.schemaCacheManager.GetConnectionSchema(
			ctx,
			&connection,
			"pull",
			"",
			locale,
			false,
		)
		if connSchemaErr != nil {
			api.Logger.WarnContext(
				ctx,
				"error getting connection schema",
				"connection_id",
				connection.ID,
				"error",
				connSchemaErr,
			)
			continue
		}

		workspaceSchema.Children = append(workspaceSchema.Children, *connSchema)
	}

	return nil
}

// addRepositorySchemas adds repository schemas to the workspace schema.
func (api *APIServices) addRepositorySchemas(
	ctx context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	workspaceSchema *irminmodels.ObjectSchema,
) error {
	repositories, err := api.DB.GetRepositoriesInWorkspace(workspace.ID)
	if err != nil {
		api.Logger.ErrorContext(ctx, "error getting repositories for workspace", "error", err)
		return fmt.Errorf("failed to get repositories: %w", err)
	}

	for _, repository := range repositories {
		// Check permissions for each repository
		repoAllowed, repoErr := api.PermissionService.IsAllowed(
			user,
			workspace,
			db.PolicyResourceRepository,
			&repository.ID,
			db.PolicyActionRead,
		)
		if repoErr != nil {
			api.Logger.WarnContext(
				ctx,
				"error checking repository permissions",
				"repository_id",
				repository.ID,
				"error",
				repoErr,
			)
			continue
		}
		if !repoAllowed {
			continue
		}

		repoSchema, repoSchemaErr := api.buildRepositorySchema(ctx, locale, workspace, &repository)
		if repoSchemaErr != nil {
			api.Logger.WarnContext(
				ctx,
				"error building repository schema",
				"repository_id",
				repository.ID,
				"error",
				repoSchemaErr,
			)
			continue
		}

		workspaceSchema.Children = append(workspaceSchema.Children, *repoSchema)
	}

	return nil
}

// buildRepositorySchema builds the schema for a single repository.
func (api *APIServices) buildRepositorySchema(
	ctx context.Context,
	locale string,
	workspace *db.Workspace,
	repository *db.Repository,
) (*irminmodels.ObjectSchema, error) {
	// Get repository objects to build schema using the repository's default branch
	objects, err := api.DB.GetFlatDBObjects(repository.ID, repository.DefaultBranch)
	if err != nil {
		return nil, fmt.Errorf("failed to get repository objects: %w", err)
	}

	// Create repository schema
	repoSchema := &irminmodels.ObjectSchema{
		Name:     repository.Name,
		Type:     irminmodels.ObjectTypeGroup,
		Children: []irminmodels.ObjectSchema{},
	}

	for _, object := range objects {
		// Get object schema using the repository's default branch
		objSchema, objSchemaErr := api.schemaCacheManager.GetObjectSchema(
			ctx,
			workspace,
			repository,
			&object,
			repository.DefaultBranch,
			locale,
			false,
		)
		if objSchemaErr != nil {
			api.Logger.WarnContext(ctx, "error getting object schema", "object_id", object.ID, "error", objSchemaErr)
			continue
		}

		repoSchema.Children = append(repoSchema.Children, *objSchema)
	}

	return repoSchema, nil
}
