package services

import (
	"context"
	"fmt"
	sandbox "irmin-api/compute-sandbox"
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/lib"
	"irmin-api/permissions"
	"irmin-api/utils"
	"strconv"
	"strings"
	"time"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"gorm.io/gorm"
)

func (api *APIServices) GetScript(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	scriptSqid string,
) (*db.StoredScript, error) {
	return getStoredEntity(
		api,
		c,
		user,
		workspace,
		scriptSqid,
		"scripts",
		db.PolicyResourceScript,
		"script",
		func(s *db.StoredScript) uint { return s.WorkspaceID },
	)
}

func (api *APIServices) ListWorkspaceScripts(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
) ([]db.StoredScript, error) {
	// Get all scripts in the workspace.
	scripts, getScriptsErr := api.DB.GetStoredScriptsByWorkspaceID(workspace.ID)
	if getScriptsErr != nil {
		api.Logger.ErrorContext(c, "Error fetching scripts", "error", getScriptsErr)
		return nil, getScriptsErr
	}

	// Filter scripts based on user permissions
	filteredScripts, err := permissions.IsAllowedFilter(
		api.PermissionService,
		user,
		workspace,
		db.PolicyResourceScript,
		db.PolicyActionRead,
		scripts,
		func(s db.StoredScript) uint { return s.ID },
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error filtering scripts by permissions", "error", err)
		return nil, err
	}

	return filteredScripts, nil
}

func (api *APIServices) CreateScript(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	req irmincore.CreateScriptRequest,
) (*db.StoredScript, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceScript,
		nil,
		db.PolicyActionCreate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to create script",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
		)
		return nil, ErrAccessDenied
	}

	// Pick the name to use, defaulting to the current time if not provided
	name := req.Name
	if name == "" {
		name = strconv.FormatInt(time.Now().Unix(), 10)
	}

	var script *db.StoredScript

	// Use database transaction to ensure atomicity
	transactionErr := api.DB.Transaction(func(tx *gorm.DB) error {
		// Create the stored script in the database
		script = &db.StoredScript{
			Name:        name,
			Description: "",
			Content:     "",
			Language:    "",
			OwnerID:     user.ID,
			WorkspaceID: workspace.ID,
		}
		if req.Description != nil {
			script.Description = *req.Description
		}
		if req.Content != nil {
			script.Content = *req.Content
		}
		if req.Language != nil {
			script.Language = *req.Language
		}
		if saveErr := tx.Create(script).Error; saveErr != nil {
			api.Logger.ErrorContext(c, "Error creating stored script", "error", saveErr)
			return saveErr
		}

		// Add tags if provided
		if len(req.Tags) > 0 {
			if addTagsErr := api.addScriptTags(tx, script, req.Tags, workspace.ID); addTagsErr != nil {
				api.Logger.ErrorContext(c, "Error adding tags to script", "error", addTagsErr)
				return addTagsErr
			}
		}

		return nil
	})

	if transactionErr != nil {
		return nil, transactionErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeCreate,
		Description: fmt.Sprintf("Script %s created", script.Name),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	// Reload the script with Owner and Tags relationships preloaded
	script, getScriptByIDErr := api.DB.GetStoredScriptByID(script.ID)
	if getScriptByIDErr != nil {
		api.Logger.ErrorContext(c, "Error fetching script", "error", getScriptByIDErr)
		return nil, getScriptByIDErr
	}

	return script, nil
}

func (api *APIServices) addScriptTags(
	tx *gorm.DB,
	script *db.StoredScript,
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

			if tagAppendErr := tx.Model(script).Association("Tags").Append(&db.Tag{Model: gorm.Model{ID: uint(tagID)}}); tagAppendErr != nil {
				return tagAppendErr
			}
		}
	}
	return nil
}

func (api *APIServices) UpdateScript(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	script *db.StoredScript,
	req irmincore.UpdateScriptRequest,
) (*db.StoredScript, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceScript,
		&script.ID,
		db.PolicyActionUpdate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to update script",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"script",
			script.ID,
		)
		return nil, ErrAccessDenied
	}

	// Check if the script exists
	if script == nil {
		return nil, ErrNotFound
	}

	// Update the stored script in the database
	if req.Name != nil && len(*req.Name) > 0 {
		script.Name = *req.Name
	}
	if req.Description != nil {
		script.Description = *req.Description
	}
	if req.Content != nil {
		script.Content = *req.Content
	}
	if req.Language != nil {
		script.Language = *req.Language
	}
	if saveErr := api.DB.Save(&script).Error; saveErr != nil {
		api.Logger.ErrorContext(c, "Error updating stored script", "error", saveErr)
		return nil, saveErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeInfo,
		Description: fmt.Sprintf("Script %s updated", script.Name),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	return script, nil
}

// DeleteScript deletes a script from a workspace.
func (api *APIServices) DeleteScript(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	script *db.StoredScript,
) error {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceScript,
		&script.ID,
		db.PolicyActionDelete,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to delete script",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"script",
			script.ID,
		)
		return ErrAccessDenied
	}

	// Delete the stored script from the database
	deleteStoredScriptErr := api.DB.Transaction(func(tx *gorm.DB) error {
		return api.DB.DeleteStoredScript(tx, script.ID)
	})
	if deleteStoredScriptErr != nil {
		api.Logger.ErrorContext(c, "Error deleting stored script", "error", deleteStoredScriptErr)
		return deleteStoredScriptErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeDelete,
		Description: fmt.Sprintf("Script %s deleted", script.Name),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	return nil
}

func (api *APIServices) TransferScriptOwnership(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	script *db.StoredScript,
	req irmincore.TransferScriptOwnershipRequest,
) (*db.StoredScript, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceScript,
		&script.ID,
		db.PolicyActionUpdate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to transfer script ownership",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"script",
			script.ID,
		)
		return nil, ErrAccessDenied
	}

	// Validate required fields
	if req.NewOwnerID == "" {
		return nil, ErrNewOwnerInvalid
	}

	// Parse the new owner ID from the sqid
	newOwnerID, decodeSqidsErr := api.SQIDManager.Decode("users", req.NewOwnerID)
	if decodeSqidsErr != nil {
		api.Logger.ErrorContext(c, "Error decoding sqid", "error", decodeSqidsErr)
		return nil, ErrNewOwnerInvalid
	}

	// Make sure the new owner is valid and a member of the workspace
	inWorkspace, isUserInWorkspaceErr := api.DB.IsUserInWorkspace(uint(newOwnerID), workspace.ID)
	if isUserInWorkspaceErr != nil {
		api.Logger.ErrorContext(c, "Error checking if user is in workspace", "error", isUserInWorkspaceErr)
		return nil, isUserInWorkspaceErr
	}
	if !inWorkspace {
		return nil, ErrNewOwnerInvalid
	}

	// Get the new owner's information for the audit log
	newOwner, getNewOwnerErr := api.DB.GetUser(uint(newOwnerID))
	if getNewOwnerErr != nil {
		api.Logger.ErrorContext(c, "Error fetching new owner information", "error", getNewOwnerErr)
		return nil, getNewOwnerErr
	}

	// Update the stored script in the database
	script.OwnerID = uint(newOwnerID)
	if saveErr := api.DB.Save(&script).Error; saveErr != nil {
		api.Logger.ErrorContext(c, "Error updating stored script", "error", saveErr)
		return nil, saveErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeInfo,
		Description: fmt.Sprintf("Script %s ownership transferred to %s", script.Name, newOwner.Email),
		UserID:      &user.ID,
		WorkspaceID: &script.WorkspaceID,
	})

	return script, nil
}

func (api *APIServices) ExecuteScript(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	script *db.StoredScript,
	req irmincore.ExecuteScriptRequest,
) (*irminmodels.ScriptResult, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceScript,
		&script.ID,
		db.PolicyActionCreate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to execute script",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"script",
			script.ID,
		)
		return nil, ErrAccessDenied
	}

	// Prepare input files from request
	inputFiles := make(map[string][]byte)
	if len(req.Input) > 0 {
		// Initialize Data Engine client for fetching input data
		dataEngine, createDataEngineClientErr := engine.NewClient(c, "en", api.Logger, api.Env, api.DB)
		if createDataEngineClientErr != nil {
			api.Logger.ErrorContext(c, "error creating data engine client", "error", createDataEngineClientErr)
			return nil, createDataEngineClientErr
		}

		// Create a slice to store all async operations
		var futures []utils.FutureResult[[]byte]

		// Launch concurrent fetches for each input object
		for _, input := range req.Input {
			inputRepository := input.Repository
			inputPath := strings.TrimPrefix(input.RepositoryPath, "/")
			inputRef := input.RepositoryRef

			// Create an async operation for fetching the object
			future := utils.Async(func() ([]byte, error) {
				return dataEngine.GetObjectContent(workspace.Slug, inputRepository, inputPath, inputRef)
			})
			futures = append(futures, future)
		}

		// Wait for all results and handle errors
		for i, future := range futures {
			content, awaitErr := future.Await()
			if awaitErr != nil {
				api.Logger.ErrorContext(c, "Error getting object", "error", awaitErr)
				return nil, awaitErr
			}
			// Add the object to the input objects map using the original path
			inputFiles[req.Input[i].RepositoryPath] = content
		}
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeInfo,
		Description: fmt.Sprintf("Script %s execution started", script.Name),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	// Execute the script in the compute sandbox
	computeSandbox := sandbox.NewComputeSandbox(api.Env, api.DB, api.Logger)
	computeResult, executeScriptErr := computeSandbox.ExecutedStoredScript(
		c,
		inputFiles,
		*user,
		script,
	)
	if executeScriptErr != nil {
		api.Logger.ErrorContext(c, "Error executing script in the compute sandbox", "error", executeScriptErr)
		lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
			Type:        db.LogEventTypeError,
			Description: fmt.Sprintf("Script %s execution failed", script.Name),
			UserID:      &user.ID,
			WorkspaceID: &workspace.ID,
		})
		return nil, executeScriptErr
	}

	// Check if the logs contain errors
	hasErrors := strings.Contains(strings.ToLower(computeResult.Logs), "error")

	// Parse the structured result files if any
	parsedResults, parseStructuredFileErr := lib.ParseStructuredFiles(
		c,
		computeResult.ResultFiles,
		api.Env,
		api.Logger,
	)
	if parseStructuredFileErr != nil {
		api.Logger.ErrorContext(c, "Error parsing structured files", "error", parseStructuredFileErr)
	}

	// Log completion event
	if hasErrors {
		lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
			Type:        db.LogEventTypeError,
			Description: fmt.Sprintf("Script %s execution completed with errors", script.Name),
			UserID:      &user.ID,
			WorkspaceID: &workspace.ID,
		})
	} else {
		lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
			Type:        db.LogEventTypeInfo,
			Description: fmt.Sprintf("Script %s execution completed", script.Name),
			UserID:      &user.ID,
			WorkspaceID: &workspace.ID,
		})
	}

	// Return the results
	return &irminmodels.ScriptResult{
		StructuredResults: parsedResults,
		StartedAt:         computeResult.StartTime,
		FinishedAt:        computeResult.EndTime,
		Duration:          computeResult.EndTime.Sub(computeResult.StartTime),
		HasErrors:         hasErrors,
		Logs:              strings.Split(computeResult.Logs, "\n"),
	}, nil
}
