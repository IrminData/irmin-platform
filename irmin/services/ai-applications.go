package services

import (
	"context"
	"fmt"
	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/permissions"
	"irmin-api/utils"
	"strings"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"gorm.io/gorm"
)

// GetAIApplication gets an AI application by its SQID.
//
//nolint:dupl // Each resource type needs its own service method following similar patterns.
func (api *APIServices) GetAIApplication(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	aiApplicationSqid string,
) (*db.AIApplication, error) {
	// Decode the ID
	aiApplicationID, err := api.SQIDManager.Decode("ai_applications", aiApplicationSqid)
	if err != nil {
		api.Logger.ErrorContext(c, "Error decoding AI application SQID", "error", err)
		return nil, NewInternalErrorf("error decoding AI application SQID: %w", err)
	}

	// Make sure this is allowed
	resourceID := uint(aiApplicationID)
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceAIApplication,
		&resourceID,
		db.PolicyActionRead,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		return nil, ErrAccessDenied
	}

	// Get the AI application
	aiApplication, err := api.DB.GetAIApplicationByID(uint(aiApplicationID))
	if err != nil {
		api.Logger.ErrorContext(c, "Error getting AI application", "error", err)
		return nil, NewInternalErrorf("error getting AI application: %w", err)
	}

	return aiApplication, nil
}

// ListAIApplications lists AI applications in a workspace.
func (api *APIServices) ListAIApplications(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
) ([]db.AIApplication, error) {
	// Get all AI applications for the workspace
	aiApplications, err := api.DB.GetAIApplicationsByWorkspaceID(workspace.ID)
	if err != nil {
		api.Logger.ErrorContext(c, "Error retrieving AI applications", "error", err)
		return nil, NewInternalErrorf("error retrieving AI applications: %w", err)
	}

	// Filter AI applications based on user permissions
	filteredAIApplications, err := permissions.IsAllowedFilter(
		api.PermissionService,
		user,
		workspace,
		db.PolicyResourceAIApplication,
		db.PolicyActionRead,
		aiApplications,
		func(a db.AIApplication) uint { return a.ID },
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error filtering AI applications by permissions", "error", err)
		return nil, NewInternalErrorf("error filtering AI applications by permissions: %w", err)
	}

	return filteredAIApplications, nil
}

// CreateAIApplication creates a new AI application.
func (api *APIServices) CreateAIApplication(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	req irmincore.CreateAIApplicationRequest,
) (*db.AIApplication, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceAIApplication,
		nil,
		db.PolicyActionCreate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to create AI application",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
		)
		return nil, ErrAccessDenied
	}

	var aiApplication db.AIApplication

	// Start a transaction for all database operations
	txErr := api.DB.Transaction(func(tx *gorm.DB) error {
		return api.createAIApplicationInTx(c, tx, user, workspace, req, &aiApplication)
	})

	if txErr != nil {
		api.Logger.ErrorContext(c, "Error creating AI application", "error", txErr)
		return nil, NewInternalErrorf("error in database transaction: %w", txErr)
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:            db.LogEventTypeCreate,
		Description:     "AI application created",
		UserID:          &user.ID,
		WorkspaceID:     &workspace.ID,
		AIApplicationID: &aiApplication.ID,
	})

	return &aiApplication, nil
}

// UpdateAIApplication updates an AI application.
//
//nolint:gocognit // Complex update logic with multiple optional fields and nested operations.
func (api *APIServices) UpdateAIApplication(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	aiApplication *db.AIApplication,
	req irmincore.UpdateAIApplicationRequest,
) (*db.AIApplication, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceAIApplication,
		&aiApplication.ID,
		db.PolicyActionUpdate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to update AI application",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"ai_application",
			aiApplication.Name,
		)
		return nil, ErrAccessDenied
	}

	// Start a transaction
	txErr := api.DB.Transaction(func(tx *gorm.DB) error {
		// Wrap tx in a Database struct
		txDB := &db.Database{DB: tx}

		// Update AI application fields
		if req.Name != nil && len(*req.Name) > 0 {
			aiApplication.Name = *req.Name
		}
		if req.Description != nil {
			aiApplication.Description = *req.Description
		}
		if req.Documentation != nil {
			aiApplication.Documentation = *req.Documentation
		}
		if req.AllowedOrigins != nil {
			aiApplication.AllowedOrigins = req.AllowedOrigins
		}
		if req.Tools != nil {
			aiApplication.Tools = &db.AIApplicationToolConfig{
				QueryEnabled:        req.Tools.QueryEnabled,
				SchemaEnabled:       req.Tools.SchemaEnabled,
				ListObjectsEnabled:  req.Tools.ListObjectsEnabled,
				GetContentEnabled:   req.Tools.GetContentEnabled,
				VectorSearchEnabled: req.Tools.VectorSearchEnabled,
				DocsEnabled:         req.Tools.DocsEnabled,
			}
		}

		// Save the AI application
		if saveErr := tx.Save(aiApplication).Error; saveErr != nil {
			return NewInternalErrorf("error updating AI application: %w", saveErr)
		}

		// Update data sources if provided
		if req.DataSources != nil {
			if dsErr := api.updateAIApplicationDataSources(tx, txDB, workspace, aiApplication, req.DataSources); dsErr != nil {
				return dsErr
			}
		}

		// Update custom tools if provided
		// nil = field omitted, don't touch tools
		// empty slice = explicitly sent [], delete all tools
		// non-empty slice = update/replace tools
		if req.CustomTools != nil {
			// Preload existing custom tools to track which ones to delete
			if preloadErr := tx.Preload("CustomTools").
				Preload("CustomTools.StoredQuery").
				Preload("CustomTools.Workflow").
				First(aiApplication, aiApplication.ID).Error; preloadErr != nil {
				return NewInternalErrorf("error preloading custom tools: %w", preloadErr)
			}

			var customToolReqs []UpdateCustomToolRequest
			for _, ct := range req.CustomTools {
				customToolReqs = append(customToolReqs, UpdateCustomToolRequest{
					ID:              ct.ID,
					Name:            ct.Name,
					Description:     ct.Description,
					Type:            db.CustomToolType(ct.Type),
					Enabled:         ct.Enabled,
					StoredQueryID:   ct.StoredQueryID,
					WorkflowID:      ct.WorkflowID,
					EmbeddingPath:   ct.EmbeddingPath,
					EmbeddingTopK:   ct.EmbeddingTopK,
					EmbeddingFilter: ct.EmbeddingFilter,
				})
			}
			if ctErr := api.updateAIApplicationCustomTools(tx, workspace, aiApplication, customToolReqs); ctErr != nil {
				return ctErr
			}
		}

		// Update tags if provided
		if req.Tags != nil {
			// Clear existing tags
			if clearTagsErr := tx.Where(&db.AIApplicationTag{AIApplicationID: aiApplication.ID}).
				Delete(&db.AIApplicationTag{}).Error; clearTagsErr != nil {
				return NewInternalErrorf("error clearing existing tags: %w", clearTagsErr)
			}

			// Add new tags
			if addTagsErr := api.addAIApplicationTags(tx, aiApplication, req.Tags, workspace.ID); addTagsErr != nil {
				return NewInternalErrorf("error adding AI application tags: %w", addTagsErr)
			}
		}

		// Fetch the full AI application object with all relations
		return tx.Preload("Owner").
			Preload("DataSources").
			Preload("DataSources.Repository").
			Preload("CustomTools").
			Preload("CustomTools.StoredQuery").
			Preload("CustomTools.Workflow").
			Preload("Tags").
			First(aiApplication, aiApplication.ID).
			Error
	})

	if txErr != nil {
		api.Logger.ErrorContext(c, "Error updating AI application", "error", txErr)
		return nil, NewInternalErrorf("error in database transaction: %w", txErr)
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:            db.LogEventTypeUpdate,
		Description:     fmt.Sprintf("AI application %s updated", aiApplication.Name),
		UserID:          &user.ID,
		WorkspaceID:     &workspace.ID,
		AIApplicationID: &aiApplication.ID,
	})

	return aiApplication, nil
}

// DeleteAIApplication deletes an AI application.
//
//nolint:dupl // Each resource type needs its own service method following similar patterns.
func (api *APIServices) DeleteAIApplication(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	aiApplication *db.AIApplication,
) error {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceAIApplication,
		&aiApplication.ID,
		db.PolicyActionDelete,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to delete AI application",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"ai_application",
			aiApplication.Name,
		)
		return ErrAccessDenied
	}

	// Delete the AI application and all related records
	deleteErr := api.DB.Transaction(func(tx *gorm.DB) error {
		return api.DB.DeleteAIApplication(tx, aiApplication.ID)
	})
	if deleteErr != nil {
		api.Logger.ErrorContext(c, "Error deleting AI application", "error", deleteErr)
		return NewInternalErrorf("error deleting AI application: %w", deleteErr)
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:            db.LogEventTypeDelete,
		Description:     "AI application deleted",
		UserID:          &user.ID,
		WorkspaceID:     &workspace.ID,
		AIApplicationID: &aiApplication.ID,
	})

	return nil
}

// TransferAIApplicationOwnership transfers ownership of an AI application.
func (api *APIServices) TransferAIApplicationOwnership(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	aiApplication *db.AIApplication,
	req irmincore.TransferAIApplicationOwnershipRequest,
) (*db.AIApplication, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceAIApplication,
		&aiApplication.ID,
		db.PolicyActionUpdate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to transfer AI application ownership",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"ai_application",
			aiApplication.Name,
		)
		return nil, ErrAccessDenied
	}

	// Validate and decode the new owner SQID
	newOwnerID, err := api.SQIDManager.Decode("users", req.NewOwnerID)
	if err != nil {
		api.Logger.ErrorContext(c, "Error decoding SQID", "sqid", req.NewOwnerID, "type", "users", "error", err)
		return nil, ErrNewOwnerInvalid
	}

	// Make sure the new owner is not the current owner
	if uint(newOwnerID) == aiApplication.OwnerID {
		return nil, ErrNewOwnerInvalid
	}

	// Make sure the new owner is valid and a member of the workspace
	inWorkspace, isUserInWorkspaceErr := api.DB.IsUserInWorkspace(uint(newOwnerID), workspace.ID)
	if isUserInWorkspaceErr != nil {
		api.Logger.ErrorContext(c, "Error checking if user is in workspace", "error", isUserInWorkspaceErr)
		return nil, NewInternalErrorf("error checking if user is in workspace: %w", isUserInWorkspaceErr)
	}
	if !inWorkspace {
		return nil, ErrNewOwnerInvalid
	}

	// Get the new owner's information for the audit log
	newOwner, getNewOwnerErr := api.DB.GetUser(uint(newOwnerID))
	if getNewOwnerErr != nil {
		api.Logger.ErrorContext(c, "Error fetching new owner information", "error", getNewOwnerErr)
		return nil, NewInternalErrorf("error fetching new owner information: %w", getNewOwnerErr)
	}

	// Update the AI application record
	aiApplication.OwnerID = uint(newOwnerID)
	aiApplication.Owner = *newOwner
	if updateErr := api.DB.Save(aiApplication).Error; updateErr != nil {
		api.Logger.ErrorContext(c, "Error updating AI application", "error", updateErr)
		return nil, updateErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:            db.LogEventTypeUpdate,
		Description:     fmt.Sprintf("AI application ownership transferred to %s", newOwner.Email),
		UserID:          &user.ID,
		WorkspaceID:     &workspace.ID,
		AIApplicationID: &aiApplication.ID,
	})

	return aiApplication, nil
}

// Helper functions

// createAIApplicationInTx creates an AI application within a transaction.
func (api *APIServices) createAIApplicationInTx(
	c context.Context,
	tx *gorm.DB,
	user *db.User,
	workspace *db.Workspace,
	req irmincore.CreateAIApplicationRequest,
	aiApplication *db.AIApplication,
) error {
	// Wrap tx in a Database struct so all DB operations use the transaction
	txDB := &db.Database{DB: tx}

	// Process data sources
	dataSources, dsErr := api.processAIApplicationDataSources(txDB, workspace, req.DataSources)
	if dsErr != nil {
		return dsErr
	}

	// Generate API key
	apiKey, err := api.generateAIApplicationAPIKey(c)
	if err != nil {
		return err
	}

	// Convert tools config
	toolsConfig := api.convertToolsConfig(req.Tools)

	// Create AI application record
	*aiApplication = db.AIApplication{
		Name:           req.Name,
		Description:    req.Description,
		Documentation:  req.Documentation,
		AllowedOrigins: req.AllowedOrigins,
		Tools:          toolsConfig,
		APIKey:         apiKey,
		WorkspaceID:    workspace.ID,
		OwnerID:        user.ID,
	}

	if createErr := tx.Create(aiApplication).Error; createErr != nil {
		return NewInternalErrorf("error creating AI application: %w", createErr)
	}

	// Explicitly create data sources (to match Update pattern and ensure persistence)
	if len(dataSources) > 0 {
		for i := range dataSources {
			dataSources[i].AIApplicationID = aiApplication.ID
			if createErr := tx.Create(&dataSources[i]).Error; createErr != nil {
				return NewInternalErrorf("error creating data source: %w", createErr)
			}
		}
		aiApplication.DataSources = dataSources
	}

	// Process custom tools (using SDK types via irmincore)
	if len(req.CustomTools) > 0 {
		var customToolReqs []CreateCustomToolRequest
		for _, ct := range req.CustomTools {
			customToolReqs = append(customToolReqs, CreateCustomToolRequest{
				Name:            ct.Name,
				Description:     ct.Description,
				Type:            db.CustomToolType(ct.Type),
				Enabled:         ct.Enabled,
				StoredQueryID:   ct.StoredQueryID,
				WorkflowID:      ct.WorkflowID,
				EmbeddingPath:   ct.EmbeddingPath,
				EmbeddingTopK:   ct.EmbeddingTopK,
				EmbeddingFilter: ct.EmbeddingFilter,
			})
		}
		customTools, ctErr := api.processCustomTools(tx, workspace, aiApplication.ID, customToolReqs)
		if ctErr != nil {
			return ctErr
		}
		aiApplication.CustomTools = customTools
	}

	// Add tags
	if addTagsErr := api.addAIApplicationTags(tx, aiApplication, req.Tags, workspace.ID); addTagsErr != nil {
		return NewInternalErrorf("error adding AI application tags: %w", addTagsErr)
	}

	// Fetch the full AI application object with all relations
	return tx.Preload("Owner").
		Preload("DataSources").
		Preload("DataSources.Repository").
		Preload("CustomTools").
		Preload("CustomTools.StoredQuery").
		Preload("CustomTools.Workflow").
		Preload("Tags").
		First(aiApplication, aiApplication.ID).
		Error
}

// generateAIApplicationAPIKey generates a new API key for an AI application.
func (api *APIServices) generateAIApplicationAPIKey(c context.Context) (string, error) {
	randomString, generateErr := utils.GenerateRandomString()
	if generateErr != nil {
		api.Logger.ErrorContext(c, "Error generating random string for API key", "error", generateErr)
		return "", NewInternalErrorf("error generating API key: %w", generateErr)
	}
	return fmt.Sprintf("ai_%s", randomString), nil
}

// convertToolsConfig converts the request tools config to the database model.
func (api *APIServices) convertToolsConfig(tools *irminmodels.AIApplicationToolConfig) *db.AIApplicationToolConfig {
	if tools == nil {
		return nil
	}
	return &db.AIApplicationToolConfig{
		QueryEnabled:        tools.QueryEnabled,
		SchemaEnabled:       tools.SchemaEnabled,
		ListObjectsEnabled:  tools.ListObjectsEnabled,
		GetContentEnabled:   tools.GetContentEnabled,
		VectorSearchEnabled: tools.VectorSearchEnabled,
		DocsEnabled:         tools.DocsEnabled,
	}
}

// processAIApplicationDataSources processes data sources for an AI application.
func (api *APIServices) processAIApplicationDataSources(
	txDB *db.Database,
	workspace *db.Workspace,
	dataSources []irminmodels.AIApplicationDataSource,
) ([]db.AIApplicationDataSource, error) {
	var processedDataSources []db.AIApplicationDataSource

	for _, ds := range dataSources {
		// Get repository by slug
		repository, err := txDB.GetRepositoryBySlugAndWorkspaceID(ds.Repository, workspace.ID)
		if err != nil {
			return nil, NewInternalErrorf("error getting repository: %w", err)
		}

		// Trim leading slash from path
		path := strings.TrimLeft(ds.Path, "/")

		processedDataSources = append(processedDataSources, db.AIApplicationDataSource{
			RepositoryID: repository.ID,
			Branch:       ds.Branch,
			Path:         path,
		})
	}

	return processedDataSources, nil
}

// addAIApplicationTags adds tags to an AI application.
func (api *APIServices) addAIApplicationTags(
	tx *gorm.DB,
	aiApplication *db.AIApplication,
	tags []string,
	workspaceID uint,
) error {
	if len(tags) > 0 {
		for _, tagSqid := range tags {
			tagID, tagDecodeErr := api.SQIDManager.Decode("tags", tagSqid)
			if tagDecodeErr != nil {
				return tagDecodeErr
			}

			// Verify tag belongs to the workspace
			var tag db.Tag
			if err := tx.First(&tag, uint(tagID)).Error; err != nil {
				return err
			}
			if tag.WorkspaceID != workspaceID {
				return ErrInvalidRequest
			}

			if tagAppendErr := tx.Model(aiApplication).Association("Tags").Append(&db.Tag{Model: gorm.Model{ID: uint(tagID)}}); tagAppendErr != nil {
				return tagAppendErr
			}
		}
	}
	return nil
}

// updateAIApplicationDataSources updates data sources for an AI application.
func (api *APIServices) updateAIApplicationDataSources(
	tx *gorm.DB,
	txDB *db.Database,
	workspace *db.Workspace,
	aiApplication *db.AIApplication,
	dataSourcesReq []irminmodels.AIApplicationDataSource,
) error {
	// Delete existing data sources
	if deleteErr := tx.Where(&db.AIApplicationDataSource{AIApplicationID: aiApplication.ID}).
		Delete(&db.AIApplicationDataSource{}).Error; deleteErr != nil {
		return NewInternalErrorf("error deleting existing data sources: %w", deleteErr)
	}

	// Process new data sources
	if len(dataSourcesReq) > 0 {
		dataSources, dsErr := api.processAIApplicationDataSources(txDB, workspace, dataSourcesReq)
		if dsErr != nil {
			return dsErr
		}

		// Explicitly create new data sources (GORM Save doesn't persist one-to-many associations)
		for i := range dataSources {
			dataSources[i].AIApplicationID = aiApplication.ID
			if createErr := tx.Create(&dataSources[i]).Error; createErr != nil {
				return NewInternalErrorf("error creating data source: %w", createErr)
			}
		}
		aiApplication.DataSources = dataSources
	} else {
		aiApplication.DataSources = []db.AIApplicationDataSource{}
	}

	return nil
}

// CreateCustomToolRequest represents the request body for creating a custom tool.
// This is defined here to avoid circular imports with the SDK.
type CreateCustomToolRequest struct {
	Name            string            `json:"name"`
	Description     string            `json:"description"`
	Type            db.CustomToolType `json:"type"`
	Enabled         bool              `json:"enabled"`
	StoredQueryID   *string           `json:"stored_query_id,omitempty"`
	WorkflowID      *string           `json:"workflow_id,omitempty"`
	EmbeddingPath   string            `json:"embedding_path,omitempty"`
	EmbeddingTopK   int               `json:"embedding_top_k,omitempty"`
	EmbeddingFilter map[string]string `json:"embedding_filter,omitempty"`
}

// UpdateCustomToolRequest represents the request body for updating a custom tool.
type UpdateCustomToolRequest struct {
	ID              *string           `json:"id,omitempty"`
	Name            string            `json:"name"`
	Description     string            `json:"description"`
	Type            db.CustomToolType `json:"type"`
	Enabled         bool              `json:"enabled"`
	StoredQueryID   *string           `json:"stored_query_id,omitempty"`
	WorkflowID      *string           `json:"workflow_id,omitempty"`
	EmbeddingPath   string            `json:"embedding_path,omitempty"`
	EmbeddingTopK   int               `json:"embedding_top_k,omitempty"`
	EmbeddingFilter map[string]string `json:"embedding_filter,omitempty"`
}

// processCustomTools processes custom tools for an AI application during creation.
func (api *APIServices) processCustomTools(
	tx *gorm.DB,
	workspace *db.Workspace,
	aiApplicationID uint,
	customToolsReq []CreateCustomToolRequest,
) ([]db.AIApplicationCustomTool, error) {
	var customTools []db.AIApplicationCustomTool

	for _, ct := range customToolsReq {
		tool, err := api.createCustomToolFromRequest(tx, workspace, aiApplicationID, ct)
		if err != nil {
			return nil, err
		}
		customTools = append(customTools, *tool)
	}

	return customTools, nil
}

// validateAndDecodeStoredQueryID validates and decodes a stored query ID, returning the uint ID.
func (api *APIServices) validateAndDecodeStoredQueryID(
	tx *gorm.DB,
	workspace *db.Workspace,
	storedQueryIDSqid *string,
) (*uint, error) {
	if storedQueryIDSqid == nil {
		return nil, fmt.Errorf("%w: stored_query_id is required for stored_query type", ErrInvalidRequest)
	}
	queryID, decodeErr := api.SQIDManager.Decode("queries", *storedQueryIDSqid)
	if decodeErr != nil {
		return nil, fmt.Errorf("%w: invalid stored_query_id", ErrInvalidRequest)
	}
	var query db.StoredQuery
	if findErr := tx.First(&query, uint(queryID)).Error; findErr != nil {
		return nil, fmt.Errorf("%w: stored query not found", ErrInvalidRequest)
	}
	if query.WorkspaceID != workspace.ID {
		return nil, fmt.Errorf("%w: stored query does not belong to this workspace", ErrInvalidRequest)
	}
	queryIDUint := uint(queryID)
	return &queryIDUint, nil
}

// validateAndDecodeWorkflowID validates and decodes a workflow ID, returning the uint ID.
func (api *APIServices) validateAndDecodeWorkflowID(
	tx *gorm.DB,
	workspace *db.Workspace,
	workflowIDSqid *string,
) (*uint, error) {
	if workflowIDSqid == nil {
		return nil, fmt.Errorf("%w: workflow_id is required for workflow type", ErrInvalidRequest)
	}
	workflowID, decodeErr := api.SQIDManager.Decode("workflows", *workflowIDSqid)
	if decodeErr != nil {
		return nil, fmt.Errorf("%w: invalid workflow_id", ErrInvalidRequest)
	}
	var workflow db.Workflow
	if findErr := tx.First(&workflow, uint(workflowID)).Error; findErr != nil {
		return nil, fmt.Errorf("%w: workflow not found", ErrInvalidRequest)
	}
	if workflow.WorkspaceID != workspace.ID {
		return nil, fmt.Errorf("%w: workflow does not belong to this workspace", ErrInvalidRequest)
	}
	workflowIDUint := uint(workflowID)
	return &workflowIDUint, nil
}

// setEmbeddingSearchFields sets embedding search fields on a tool with defaults.
func setEmbeddingSearchFields(tool *db.AIApplicationCustomTool, path string, topK int, filter map[string]string) error {
	if path == "" {
		return fmt.Errorf("%w: embedding_path is required for embedding_search type", ErrInvalidRequest)
	}
	tool.EmbeddingPath = path
	tool.EmbeddingTopK = topK
	if tool.EmbeddingTopK <= 0 {
		tool.EmbeddingTopK = 10
	}
	tool.EmbeddingFilter = filter
	return nil
}

// createCustomToolFromRequest creates a custom tool from a request.
func (api *APIServices) createCustomToolFromRequest(
	tx *gorm.DB,
	workspace *db.Workspace,
	aiApplicationID uint,
	req CreateCustomToolRequest,
) (*db.AIApplicationCustomTool, error) {
	// Validate required fields
	if req.Name == "" {
		return nil, ErrCustomToolNameRequired
	}

	// Validate tool name uniqueness
	txDB := &db.Database{DB: tx}
	exists, err := txDB.CustomToolNameExists(req.Name, aiApplicationID, nil)
	if err != nil {
		return nil, NewInternalErrorf("error checking tool name: %w", err)
	}
	if exists {
		return nil, fmt.Errorf("%w: custom tool with name '%s' already exists", ErrInvalidRequest, req.Name)
	}

	tool := &db.AIApplicationCustomTool{
		AIApplicationID: aiApplicationID,
		Name:            req.Name,
		Description:     req.Description,
		Type:            req.Type,
		Enabled:         req.Enabled,
	}

	// Process type-specific fields
	if typeErr := api.setToolTypeSpecificFields(tx, workspace, tool, req.Type,
		req.StoredQueryID, req.WorkflowID, req.EmbeddingPath, req.EmbeddingTopK, req.EmbeddingFilter); typeErr != nil {
		return nil, typeErr
	}

	if createErr := tx.Create(tool).Error; createErr != nil {
		return nil, NewInternalErrorf("error creating custom tool: %w", createErr)
	}

	return tool, nil
}

// setToolTypeSpecificFields sets type-specific fields on a custom tool.
func (api *APIServices) setToolTypeSpecificFields(
	tx *gorm.DB,
	workspace *db.Workspace,
	tool *db.AIApplicationCustomTool,
	toolType db.CustomToolType,
	storedQueryID *string,
	workflowID *string,
	embeddingPath string,
	embeddingTopK int,
	embeddingFilter map[string]string,
) error {
	switch toolType {
	case db.CustomToolTypeStoredQuery:
		queryIDUint, err := api.validateAndDecodeStoredQueryID(tx, workspace, storedQueryID)
		if err != nil {
			return err
		}
		tool.StoredQueryID = queryIDUint

	case db.CustomToolTypeWorkflow:
		workflowIDUint, err := api.validateAndDecodeWorkflowID(tx, workspace, workflowID)
		if err != nil {
			return err
		}
		tool.WorkflowID = workflowIDUint

	case db.CustomToolTypeEmbeddingSearch:
		if err := setEmbeddingSearchFields(tool, embeddingPath, embeddingTopK, embeddingFilter); err != nil {
			return err
		}

	default:
		return fmt.Errorf("%w: invalid custom tool type: %s", ErrInvalidRequest, toolType)
	}
	return nil
}

// updateAIApplicationCustomTools updates custom tools for an AI application.
func (api *APIServices) updateAIApplicationCustomTools(
	tx *gorm.DB,
	workspace *db.Workspace,
	aiApplication *db.AIApplication,
	customToolsReq []UpdateCustomToolRequest,
) error {
	existingToolIDs := api.buildExistingToolIDsMap(aiApplication)
	requestToolIDs := make(map[uint]bool)

	for _, ct := range customToolsReq {
		toolIDUint, err := api.processCustomToolRequest(tx, workspace, aiApplication, ct, existingToolIDs)
		if err != nil {
			return err
		}
		if toolIDUint > 0 {
			requestToolIDs[toolIDUint] = true
		}
	}

	return api.deleteRemovedCustomTools(tx, existingToolIDs, requestToolIDs)
}

// buildExistingToolIDsMap builds a map of existing tool IDs.
func (api *APIServices) buildExistingToolIDsMap(aiApplication *db.AIApplication) map[uint]bool {
	existingToolIDs := make(map[uint]bool)
	for _, tool := range aiApplication.CustomTools {
		existingToolIDs[tool.ID] = true
	}
	return existingToolIDs
}

// processCustomToolRequest processes a single custom tool request (create or update).
// Returns the tool ID for tracking purposes.
func (api *APIServices) processCustomToolRequest(
	tx *gorm.DB,
	workspace *db.Workspace,
	aiApplication *db.AIApplication,
	ct UpdateCustomToolRequest,
	existingToolIDs map[uint]bool,
) (uint, error) {
	if ct.ID == nil {
		return api.createCustomToolFromUpdateRequest(tx, workspace, aiApplication.ID, ct)
	}
	return api.updateExistingCustomTool(tx, workspace, aiApplication.ID, ct, existingToolIDs)
}

// createCustomToolFromUpdateRequest creates a new custom tool from an update request.
// Returns the ID of the newly created tool.
func (api *APIServices) createCustomToolFromUpdateRequest(
	tx *gorm.DB,
	workspace *db.Workspace,
	aiApplicationID uint,
	ct UpdateCustomToolRequest,
) (uint, error) {
	createReq := CreateCustomToolRequest{
		Name:            ct.Name,
		Description:     ct.Description,
		Type:            ct.Type,
		Enabled:         ct.Enabled,
		StoredQueryID:   ct.StoredQueryID,
		WorkflowID:      ct.WorkflowID,
		EmbeddingPath:   ct.EmbeddingPath,
		EmbeddingTopK:   ct.EmbeddingTopK,
		EmbeddingFilter: ct.EmbeddingFilter,
	}
	tool, err := api.createCustomToolFromRequest(tx, workspace, aiApplicationID, createReq)
	if err != nil {
		return 0, err
	}
	return tool.ID, nil
}

// updateExistingCustomTool validates and updates an existing custom tool.
func (api *APIServices) updateExistingCustomTool(
	tx *gorm.DB,
	workspace *db.Workspace,
	aiApplicationID uint,
	ct UpdateCustomToolRequest,
	existingToolIDs map[uint]bool,
) (uint, error) {
	toolID, decodeErr := api.SQIDManager.Decode("ai_application_custom_tools", *ct.ID)
	if decodeErr != nil {
		return 0, fmt.Errorf("%w: invalid custom tool id", ErrInvalidRequest)
	}
	toolIDUint := uint(toolID)

	if !existingToolIDs[toolIDUint] {
		return 0, fmt.Errorf("%w: custom tool not found", ErrInvalidRequest)
	}

	// Check name uniqueness (excluding current tool)
	txDB := &db.Database{DB: tx}
	exists, err := txDB.CustomToolNameExists(ct.Name, aiApplicationID, &toolIDUint)
	if err != nil {
		return 0, NewInternalErrorf("error checking tool name: %w", err)
	}
	if exists {
		return 0, fmt.Errorf("%w: custom tool with name '%s' already exists", ErrInvalidRequest, ct.Name)
	}

	if updateErr := api.updateCustomToolFromRequest(tx, workspace, toolIDUint, ct); updateErr != nil {
		return 0, updateErr
	}
	return toolIDUint, nil
}

// deleteRemovedCustomTools deletes tools that are no longer in the request.
func (api *APIServices) deleteRemovedCustomTools(
	tx *gorm.DB,
	existingToolIDs map[uint]bool,
	requestToolIDs map[uint]bool,
) error {
	for toolID := range existingToolIDs {
		if !requestToolIDs[toolID] {
			if deleteErr := tx.Delete(&db.AIApplicationCustomTool{}, toolID).Error; deleteErr != nil {
				return NewInternalErrorf("error deleting custom tool: %w", deleteErr)
			}
		}
	}
	return nil
}

// updateCustomToolFromRequest updates an existing custom tool from a request.
func (api *APIServices) updateCustomToolFromRequest(
	tx *gorm.DB,
	workspace *db.Workspace,
	toolID uint,
	req UpdateCustomToolRequest,
) error {
	var tool db.AIApplicationCustomTool
	if findErr := tx.First(&tool, toolID).Error; findErr != nil {
		return fmt.Errorf("%w: custom tool not found", ErrInvalidRequest)
	}

	// Validate required fields
	if req.Name == "" {
		return ErrCustomToolNameRequired
	}

	// Validate tool name uniqueness (excluding current tool)
	txDB := &db.Database{DB: tx}
	exists, err := txDB.CustomToolNameExists(req.Name, tool.AIApplicationID, &toolID)
	if err != nil {
		return NewInternalErrorf("error checking tool name: %w", err)
	}
	if exists {
		return fmt.Errorf("%w: custom tool with name '%s' already exists", ErrInvalidRequest, req.Name)
	}

	tool.Name = req.Name
	tool.Description = req.Description
	tool.Type = req.Type
	tool.Enabled = req.Enabled

	// Clear type-specific fields first
	clearToolTypeSpecificFields(&tool)

	// Set type-specific fields using shared helper
	if setToolTypeSpecificFieldsErr := api.setToolTypeSpecificFields(tx, workspace, &tool, req.Type,
		req.StoredQueryID, req.WorkflowID, req.EmbeddingPath, req.EmbeddingTopK, req.EmbeddingFilter); setToolTypeSpecificFieldsErr != nil {
		return setToolTypeSpecificFieldsErr
	}

	if saveCustomToolErr := tx.Save(&tool).Error; saveCustomToolErr != nil {
		return NewInternalErrorf("error updating custom tool: %w", saveCustomToolErr)
	}

	return nil
}

// clearToolTypeSpecificFields clears all type-specific fields on a custom tool.
func clearToolTypeSpecificFields(tool *db.AIApplicationCustomTool) {
	tool.StoredQueryID = nil
	tool.WorkflowID = nil
	tool.EmbeddingPath = ""
	tool.EmbeddingTopK = 0
	tool.EmbeddingFilter = nil
}
