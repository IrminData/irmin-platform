package services

import (
	"context"
	"errors"
	"io"

	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/lib"

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
		return nil, NewInternalErrorf("failed to read file data: %w", err)
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(ctx, api.Logger, api.Env, api.DB)
	if err != nil {
		api.Logger.ErrorContext(ctx, "error creating data engine client", "error", err)
		return nil, NewInternalErrorf("error creating data engine client: %w", err)
	}

	// Generate the schema
	schema, err := dataEngine.GenerateSchemaFromFile(ctx, filename, fileData)
	if err != nil {
		api.Logger.ErrorContext(ctx, "error generating schema from file", "error", err)
		return nil, NewInternalErrorf("failed to generate schema: %w", err)
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
		return nil, NewInternalErrorf("failed to check permissions: %w", err)
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
		return nil, NewInternalErrorf("failed to get object schema: %w", err)
	}

	// Populate SQL selector for the root object and recursively for children
	// Only file objects (structured/binary) should have selectors
	// Groups (directories) don't need selectors, but their children do
	if schema != nil {
		api.populateSQLSelector(ctx, schema, workspace.Slug, repository.Slug, ref, repository.DefaultBranch)
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
		return nil, NewInternalErrorf("failed to check permissions: %w", err)
	}
	if !allowed {
		return nil, errors.New("unauthorized access to connection schema")
	}

	// Use the schema cache manager to get the connection schema
	schema, err := api.schemaCacheManager.GetConnectionSchema(
		ctx,
		connection,
		operationMethod,
		path,
		locale,
		false,
	)
	if err != nil {
		api.Logger.ErrorContext(ctx, "error getting connection schema", "error", err)
		return nil, NewInternalErrorf("failed to get connection schema: %w", err)
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
		return nil, NewInternalErrorf("failed to check permissions: %w", err)
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

	// Track the starting index of repositories to distinguish them from connections
	repositoryStartIndex := len(workspaceSchema.Children)

	// Include repositories if requested
	if includeRepositories {
		if repoErr := api.addRepositorySchemas(ctx, locale, user, workspace, workspaceSchema); repoErr != nil {
			return nil, repoErr
		}
	}

	// Deduplicate root-level objects that are also present in repositories
	if includeConnections && includeRepositories {
		api.deduplicateWorkspaceSchema(workspaceSchema, repositoryStartIndex)
	}

	return workspaceSchema, nil
}

// deduplicateWorkspaceSchema removes root-level objects that are also present in repositories.
// This prevents showing the same object twice (once as a connection/loose object and once inside the repository).
func (api *APIServices) deduplicateWorkspaceSchema(
	workspaceSchema *irminmodels.ObjectSchema,
	repositoryStartIndex int,
) {
	// Collect all names of objects inside repository groups only (not connection groups)
	repoObjectNames := api.collectRepositoryObjectNames(workspaceSchema.Children, repositoryStartIndex)

	// Filter out root-level items that are present in repositories
	filteredChildren := make([]irminmodels.ObjectSchema, 0, len(workspaceSchema.Children))
	for _, child := range workspaceSchema.Children {
		// Keep groups (repositories and group connections)
		if child.Type == irminmodels.ObjectTypeGroup {
			filteredChildren = append(filteredChildren, child)
			continue
		}

		// For non-groups (structured/binary connections), check if they exist in repositories
		if !repoObjectNames[child.Name] {
			filteredChildren = append(filteredChildren, child)
		}
	}
	workspaceSchema.Children = filteredChildren
}

// collectRepositoryObjectNames collects names of objects inside repository groups.
func (api *APIServices) collectRepositoryObjectNames(
	children []irminmodels.ObjectSchema,
	repositoryStartIndex int,
) map[string]bool {
	repoObjectNames := make(map[string]bool)
	for i := repositoryStartIndex; i < len(children); i++ {
		child := children[i]
		if child.Type == irminmodels.ObjectTypeGroup {
			for _, repoChild := range child.Children {
				repoObjectNames[repoChild.Name] = true
			}
		}
	}
	return repoObjectNames
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
		return NewInternalErrorf("failed to get connections: %w", err)
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
		connSchema, connSchemaErr := api.schemaCacheManager.GetConnectionSchema(
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
		return NewInternalErrorf("failed to get repositories: %w", err)
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
		return nil, NewInternalErrorf("failed to get repository objects: %w", err)
	}

	// Create repository schema
	repoSchema := &irminmodels.ObjectSchema{
		Name:     repository.Name,
		Type:     irminmodels.ObjectTypeGroup,
		Children: []irminmodels.ObjectSchema{},
	}

	for _, object := range objects {
		// Only process root-level objects (where ParentID is nil)
		// This avoids duplicates since children are included in the schema of their parent group
		if object.ParentID != nil {
			continue
		}

		objSchema, objSchemaErr := api.getObjectSchemaWithSelector(
			ctx,
			workspace,
			repository,
			&object,
			repository.DefaultBranch,
			locale,
		)
		if objSchemaErr != nil {
			api.Logger.WarnContext(ctx, "error getting object schema", "object_id", object.ID, "error", objSchemaErr)
			continue
		}

		api.appendObjectToRepositorySchema(repoSchema, &object, objSchema)
	}

	return repoSchema, nil
}

// getObjectSchemaWithSelector gets the object schema and populates SQL selector examples.
func (api *APIServices) getObjectSchemaWithSelector(
	ctx context.Context,
	workspace *db.Workspace,
	repository *db.Repository,
	object *db.RepositoryObject,
	ref string,
	locale string,
) (*irminmodels.ObjectSchema, error) {
	objSchema, err := api.schemaCacheManager.GetObjectSchema(
		ctx,
		workspace,
		repository,
		object,
		ref,
		locale,
		false,
	)
	if err != nil {
		return nil, err
	}

	api.populateSQLSelector(ctx, objSchema, workspace.Slug, repository.Slug, ref, repository.DefaultBranch)
	return objSchema, nil
}

// populateSQLSelector recursively sets the SQL selector example for all objects in the schema.
func (api *APIServices) populateSQLSelector(
	ctx context.Context,
	schema *irminmodels.ObjectSchema,
	workspaceSlug string,
	repositorySlug string,
	ref string,
	defaultBranch string,
) {
	if schema == nil {
		return
	}

	// Only populate selector for non-group objects (Structured, Binary)
	// Groups (directories) don't need selectors as they don't contain queryable data
	if (schema.Type == irminmodels.ObjectTypeStructured ||
		schema.Type == irminmodels.ObjectTypeBinary) && schema.Path != "" {
		selector, s3PathSelector, constructErr := lib.ConstructSQLSelector(
			workspaceSlug,
			repositorySlug,
			schema.Path,
			ref,
			defaultBranch,
		)
		if constructErr != nil {
			api.Logger.WarnContext(
				ctx,
				"Error constructing SQL selector and S3 path selector",
				"error",
				constructErr,
				"path",
				schema.Path,
			)
		} else {
			schema.SQLSelector = selector
			schema.S3PathSelector = s3PathSelector
		}
	}

	// Continue processing children even if this object failed
	for i := range schema.Children {
		api.populateSQLSelector(ctx, &schema.Children[i], workspaceSlug, repositorySlug, ref, defaultBranch)
	}
}

// appendObjectToRepositorySchema appends an object schema to the repository schema,
// unwrapping root group objects to avoid extra nesting levels.
func (api *APIServices) appendObjectToRepositorySchema(
	repoSchema *irminmodels.ObjectSchema,
	object *db.RepositoryObject,
	objSchema *irminmodels.ObjectSchema,
) {
	// If this is the root object (empty path) and it's a group,
	// append its children directly to the repository schema to avoid an extra nesting level
	if object.Path == "" && objSchema.Type == irminmodels.ObjectTypeGroup {
		repoSchema.Children = append(repoSchema.Children, objSchema.Children...)
	} else {
		repoSchema.Children = append(repoSchema.Children, *objSchema)
	}
}
