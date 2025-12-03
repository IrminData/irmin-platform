package services

import (
	"context"
	"errors"
	"fmt"
	"io"
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/lib"
	"irmin-api/permissions"
	"time"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminutils "github.com/IrminData/irmin-sdk-go/utils"
	"gorm.io/gorm"
)

func (api *APIServices) GetRepositoryObject(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	objectPath string,
	objectRef string,
) (*db.RepositoryObject, irminutils.ObjectDetails, string, error) {
	// Determine the ref and path from the request parameters
	ref := repository.DefaultBranch
	if objectRef != "" {
		ref = objectRef
	}
	path := ""
	if objectPath != "" {
		path = objectPath
	}

	// Get the requested object.
	repositoryObjectDB, err := lib.GetObject(
		c,
		locale,
		api.DB,
		api.Logger,
		api.Env,
		workspace,
		repository,
		path,
		ref,
		false,
	)
	if err != nil {
		api.Logger.WarnContext(c, "Failed to get repository object", "error", err)
	}

	// Parse object details from the path
	detailsFromPath := irminutils.ParseObjectDetailsFromPath(path)

	// Check permissions if object exists
	if repositoryObjectDB != nil {
		// Recursively populate SQL selector for object and all descendants
		var populateSelector func(*db.RepositoryObject)
		populateSelector = func(obj *db.RepositoryObject) {
			if obj == nil {
				return
			}
			obj.SQLSelectorExample = lib.ConstructSQLSelector(
				workspace.Slug,
				repository.Slug,
				obj.Path,
				ref,
			)
			for i := range obj.Children {
				populateSelector(&obj.Children[i])
			}
		}
		populateSelector(repositoryObjectDB)

		if validateErr := api.validateObjectPermissions(c, user, workspace, repositoryObjectDB); validateErr != nil {
			return nil, detailsFromPath, ref, validateErr
		}
	}

	return repositoryObjectDB, detailsFromPath, ref, err
}

// validateObjectPermissions checks user permissions for a repository object
func (api *APIServices) validateObjectPermissions(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	repositoryObjectDB *db.RepositoryObject,
) error {
	if repositoryObjectDB.Type == irminmodels.ObjectTypeGroup {
		return api.validateGroupObjectPermissions(c, user, workspace, repositoryObjectDB)
	}
	return api.validateNonGroupObjectPermissions(c, user, workspace, repositoryObjectDB)
}

// validateGroupObjectPermissions checks if user has read access to a group object
func (api *APIServices) validateGroupObjectPermissions(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	repositoryObjectDB *db.RepositoryObject,
) error {
	allowed, allowedErr := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepositoryObject,
		&repositoryObjectDB.RepositoryID,
		db.PolicyActionRead,
	)
	if allowedErr != nil {
		api.Logger.ErrorContext(c, "Error checking if user has read access to object", "error", allowedErr)
		return allowedErr
	}
	if !allowed {
		return ErrAccessDenied
	}
	return nil
}

// validateNonGroupObjectPermissions filters children objects based on user permissions
func (api *APIServices) validateNonGroupObjectPermissions(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	repositoryObjectDB *db.RepositoryObject,
) error {
	filteredObjectChildren, filterErr := permissions.IsAllowedFilter(
		api.PermissionService,
		user,
		workspace,
		db.PolicyResourceRepositoryObject,
		db.PolicyActionRead,
		repositoryObjectDB.Children,
		func(o db.RepositoryObject) uint { return o.RepositoryID },
	)
	if filterErr != nil {
		api.Logger.ErrorContext(c, "Error filtering objects by permissions", "error", filterErr)
		return filterErr
	}

	repositoryObjectDB.Children = filteredObjectChildren
	return nil
}

func (api *APIServices) UploadRepositoryObject(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	objectPath string,
	objectRef string,
	file io.Reader,
	tags []string,
) (*db.RepositoryObject, error) {
	// Make sure this is allowed
	if err := api.ensureCreateAndModifyPermissions(c, user, workspace, repository); err != nil {
		return nil, err
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c, locale, api.Logger, api.Env, api.DB)
	if err != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", err)
		return nil, err
	}

	// Upload the object to the data engine
	newObject, err := dataEngine.UploadObject(
		workspace.Slug,
		repository.Slug,
		objectPath,
		objectRef,
		file,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error uploading object to Data Engine", "error", err)
		return nil, err
	}

	var repositoryObject *db.RepositoryObject

	// Use database transaction to ensure atomicity
	transactionErr := api.DB.Transaction(func(tx *gorm.DB) error {
		var saveErr error
		repositoryObject, saveErr = api.saveObjectAndTags(
			c,
			tx,
			workspace,
			repository,
			newObject,
			objectRef,
			tags,
		)
		return saveErr
	})

	if transactionErr != nil {
		return nil, transactionErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:               db.LogEventTypeUpdate,
		Description:        fmt.Sprintf("Object %s uploaded to branch %s", newObject.Path, objectRef),
		UserID:             &user.ID,
		WorkspaceID:        &workspace.ID,
		RepositoryID:       &repository.ID,
		RepositoryObjectID: &repositoryObject.ID,
	})

	return repositoryObject, nil
}

func (api *APIServices) UploadRepositoryObjectFromURL(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	objectPath string,
	objectRef string,
	url string,
	headers map[string]string,
	tags []string,
) (*db.RepositoryObject, error) {
	// Make sure this is allowed
	if err := api.ensureCreateAndModifyPermissions(c, user, workspace, repository); err != nil {
		return nil, err
	}

	// Validate required fields
	if url == "" {
		return nil, ErrInvalidPath
	}

	// Download with SSRF protections
	safeBody, err := lib.DownloadFileFromURL(c, url, headers)
	if err != nil {
		api.Logger.ErrorContext(c, "Error downloading file from URL", "error", err)
		return nil, err
	}
	defer safeBody.Close()

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c, locale, api.Logger, api.Env, api.DB)
	if err != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", err)
		return nil, err
	}

	// Upload the file to the data engine
	newObject, err := dataEngine.UploadObject(
		workspace.Slug,
		repository.Slug,
		objectPath,
		objectRef,
		safeBody,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error uploading file to Data Engine", "error", err)
		return nil, err
	}

	var repositoryObject *db.RepositoryObject

	// Use database transaction to ensure atomicity
	transactionErr := api.DB.Transaction(func(tx *gorm.DB) error {
		var saveErr error
		repositoryObject, saveErr = api.saveObjectAndTags(
			c,
			tx,
			workspace,
			repository,
			newObject,
			objectRef,
			tags,
		)
		return saveErr
	})

	if transactionErr != nil {
		return nil, transactionErr
	}

	return repositoryObject, nil
}

// ensureCreateAndModifyPermissions validates that the user can create objects and modify the repository.
func (api *APIServices) ensureCreateAndModifyPermissions(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
) error {
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepositoryObject,
		nil,
		db.PolicyActionCreate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to upload repository object",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"repository",
			repository.Slug,
		)
		return ErrAccessDenied
	}

	isAllowed, err = api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepository,
		&repository.ID,
		db.PolicyActionUpdate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to modify repository",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"repository",
			repository.Slug,
		)
		return ErrAccessDenied
	}
	return nil
}

func (api *APIServices) MoveRepositoryObject(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	object *db.RepositoryObject,
	req irmincore.MoveObjectRequest,
) (*db.RepositoryObject, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepositoryObject,
		nil,
		db.PolicyActionUpdate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to move repository object",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"repository",
			repository.Slug,
			"objectPath",
			object.Path,
			"objectRef",
			object.RepositoryRef,
			"newPath",
			req.NewPath,
		)
		return nil, ErrAccessDenied
	}

	// Make sure that the user has permissions to modify the repository
	isAllowed, err = api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepository,
		&repository.ID,
		db.PolicyActionUpdate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to modify repository",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"repository",
			repository.Slug,
		)
		return nil, ErrAccessDenied
	}

	// Validate required fields
	if req.NewPath == "" {
		return nil, ErrInvalidPath
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c, locale, api.Logger, api.Env, api.DB)
	if err != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", err)
		return nil, err
	}

	// Move the object in the data engine
	newObject, err := dataEngine.MoveObject(
		workspace.Slug,
		repository.Slug,
		object.Path,
		req.NewPath,
		object.RepositoryRef,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error moving object in Data Engine", "error", err)
		return nil, err
	}

	// Use a single transaction to ensure atomicity of cache updates for move
	var repositoryObject *db.RepositoryObject
	transactionErr := api.DB.Transaction(func(tx *gorm.DB) error {
		// First, remove the old object from cache within the tx
		deleteOldObjectErr := api.DB.DeleteObjects(tx,
			&object.Path,
			&repository.ID,
			&object.RepositoryRef,
		)
		if deleteOldObjectErr != nil {
			api.Logger.ErrorContext(c, "Error deleting old object from cache during move", "error", deleteOldObjectErr)
			return deleteOldObjectErr
		}

		// Save the new object to the database using the same tx
		txDB := &db.Database{DB: tx}
		var saveErr error
		repositoryObject, saveErr = lib.SaveObject(
			txDB,
			api.Logger,
			api.Env,
			newObject,
			object.RepositoryRef,
			repository.ID,
		)
		if saveErr != nil {
			api.Logger.ErrorContext(c, "Error saving moved object to database (tx)", "error", saveErr)
			return saveErr
		}
		return nil
	})
	if transactionErr != nil {
		api.Logger.WarnContext(c, "Error performing atomic move cache update", "error", transactionErr)
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type: db.LogEventTypeUpdate,
		Description: fmt.Sprintf(
			"Object moved from %s to %s on branch %s",
			object.Path,
			req.NewPath,
			object.RepositoryRef,
		),
		UserID:             &user.ID,
		WorkspaceID:        &workspace.ID,
		RepositoryID:       &repository.ID,
		RepositoryObjectID: &repositoryObject.ID,
	})

	return repositoryObject, transactionErr
}

func (api *APIServices) CopyRepositoryObject(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	object *db.RepositoryObject,
	req irmincore.MoveObjectRequest,
) (*db.RepositoryObject, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepositoryObject,
		&object.ID,
		db.PolicyActionCreate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to copy repository object",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"repository",
			repository.Slug,
			"objectPath",
			object.Path,
			"objectRef",
			object.RepositoryRef,
			"newPath",
			req.NewPath,
		)
		return nil, ErrAccessDenied
	}

	// Make sure that the user has permissions to modify the repository
	isAllowed, err = api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepository,
		&repository.ID,
		db.PolicyActionUpdate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to modify repository",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"repository",
			repository.Slug,
		)
		return nil, ErrAccessDenied
	}

	// Validate required fields
	if req.NewPath == "" {
		return nil, ErrInvalidPath
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c, locale, api.Logger, api.Env, api.DB)
	if err != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", err)
		return nil, err
	}

	// Copy the object in the data engine
	newObject, err := dataEngine.CopyObject(
		workspace.Slug,
		repository.Slug,
		object.Path,
		req.NewPath,
		object.RepositoryRef,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error copying object in Data Engine", "error", err)
		return nil, err
	}

	// Save the new object to the database
	var repositoryObject *db.RepositoryObject
	transactionErr := api.DB.Transaction(func(tx *gorm.DB) error {
		txDB := &db.Database{DB: tx}
		var saveErr error
		repositoryObject, saveErr = lib.SaveObject(
			txDB,
			api.Logger,
			api.Env,
			newObject,
			object.RepositoryRef,
			repository.ID,
		)
		if saveErr != nil {
			api.Logger.ErrorContext(c, "Error saving copied object to database (tx)", "error", saveErr)
			return saveErr
		}
		return nil
	})
	if transactionErr != nil {
		api.Logger.WarnContext(c, "Error performing atomic copy cache update", "error", transactionErr)
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type: db.LogEventTypeUpdate,
		Description: fmt.Sprintf(
			"Object copied from %s to %s on branch %s",
			object.Path,
			req.NewPath,
			object.RepositoryRef,
		),
		UserID:             &user.ID,
		WorkspaceID:        &workspace.ID,
		RepositoryID:       &repository.ID,
		RepositoryObjectID: &repositoryObject.ID,
	})

	return repositoryObject, transactionErr
}

func (api *APIServices) DeleteRepositoryObject(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	object *db.RepositoryObject,
) error {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepositoryObject,
		&object.ID,
		db.PolicyActionDelete,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to delete repository object",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"repository",
			repository.Slug,
			"objectPath",
			object.Path,
		)
		return ErrAccessDenied
	}

	// Make sure that the user has permissions to modify the repository
	isAllowed, err = api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepository,
		&repository.ID,
		db.PolicyActionUpdate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to modify repository",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"repository",
			repository.Slug,
		)
		return ErrAccessDenied
	}

	// Delete the object from the data engine and the database
	transactionErr := api.DB.Transaction(func(tx *gorm.DB) error {
		// Initialize Data Engine client
		dataEngine, dataEngineErr := engine.NewClient(c, locale, api.Logger, api.Env, api.DB)
		if dataEngineErr != nil {
			api.Logger.ErrorContext(c, "error creating data engine client", "error", dataEngineErr)
			return dataEngineErr
		}

		// Delete the object from the data engine
		if deleteEngineObjectErr := dataEngine.DeleteObject(workspace.Slug, repository.Slug, object.Path, object.RepositoryRef, tx); deleteEngineObjectErr != nil {
			api.Logger.ErrorContext(c, "Error deleting object from Data Engine", "error", deleteEngineObjectErr)
			return deleteEngineObjectErr
		}

		// Delete the object cache from the database after successful engine deletion
		deleteDatabaseObjectErr := api.DB.DeleteObjects(tx,
			&object.Path,
			&repository.ID,
			&object.RepositoryRef,
		)
		if deleteDatabaseObjectErr != nil {
			api.Logger.ErrorContext(c, "Error deleting object from database", "error", deleteDatabaseObjectErr)
			return deleteDatabaseObjectErr
		}

		return nil
	})

	if transactionErr != nil {
		return transactionErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeDelete,
		Description:  fmt.Sprintf("Object %s deleted from branch %s", object.Path, object.RepositoryRef),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
	})

	return nil
}

func (api *APIServices) GetRepositoryObjectContent(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	object *db.RepositoryObject,
) ([]byte, error) {
	// Make sure this is allowed
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
			"User is not allowed to get repository object content",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"repository",
			repository.Slug,
			"objectPath",
			object.Path,
		)
		return nil, ErrAccessDenied
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c, locale, api.Logger, api.Env, api.DB)
	if err != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", err)
		return nil, err
	}

	// Get the object content from the data engine
	content, err := dataEngine.GetObjectContent(workspace.Slug, repository.Slug, object.Path, object.RepositoryRef)
	if err != nil {
		api.Logger.ErrorContext(c, "Error retrieving object content from Data Engine", "error", err)
		return nil, err
	}

	return content, nil
}

func (api *APIServices) GetRepositoryObjectStructuredContent(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	object *db.RepositoryObject,
) (map[string][]map[string]any, error) {
	// Make sure this is allowed
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
			"User is not allowed to get repository object structured content",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"repository",
			repository.Slug,
			"objectPath",
			object.Path,
		)
		return nil, ErrAccessDenied
	}

	// Make sure the object is a structured file
	if object.Type != irminmodels.ObjectTypeStructured {
		return nil, ErrInvalidPath
	}

	// Get the object content
	content, err := api.GetRepositoryObjectContent(c, locale, user, workspace, repository, object)
	if err != nil {
		api.Logger.ErrorContext(c, "Error getting object content", "error", err)
		return nil, err
	}

	// Parse the file content
	parsedResults, parseStructuredFileErr := lib.ParseStructuredFiles(
		c,
		map[string][]byte{object.Path: content},
		api.Env,
		api.Logger,
	)
	if parseStructuredFileErr != nil {
		api.Logger.ErrorContext(c, "Error parsing structured files", "error", parseStructuredFileErr)
		return nil, parseStructuredFileErr
	}

	// If there are no results, return a 404
	if len(parsedResults) == 0 {
		return nil, ErrNotFound
	}

	return parsedResults, nil
}

func (api *APIServices) ZipRepositoryObject(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	object *db.RepositoryObject,
) ([]byte, string, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepositoryObject,
		&object.ID,
		db.PolicyActionRead,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, "", err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to get repository object content",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"repository",
			repository.Slug,
			"objectPath",
			object.Path,
		)
		return nil, "", ErrAccessDenied
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c, locale, api.Logger, api.Env, api.DB)
	if err != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", err)
		return nil, "", err
	}

	// Initialize the files map
	files := make(map[string][]byte)

	// Process the object
	var processErr error
	if object.Type == irminmodels.ObjectTypeGroup {
		processErr = api.processGroupObjectDownload(
			object,
			workspace,
			repository,
			object.RepositoryRef,
			dataEngine,
			files,
		)
	} else {
		processErr = api.processSingleObjectDownload(object, workspace, repository, object.RepositoryRef, dataEngine, files)
	}

	// If there is an error, return it
	if processErr != nil {
		api.Logger.ErrorContext(c, "Error processing object download", "error", processErr)
		return nil, "", processErr
	}

	// Create the zip file
	zipContent, err := irminutils.ZipFiles(files)
	if err != nil {
		api.Logger.ErrorContext(c, "Error creating zip file", "error", err)
		return nil, "", err
	}

	// Create the zip name
	timestamp := time.Now().UnixMilli()
	zipName := fmt.Sprintf(
		"%s-%s-%s-%s-%d.zip",
		workspace.Slug,
		repository.Slug,
		object.Name,
		object.RepositoryRef,
		timestamp,
	)

	// Return the zip file
	return zipContent, zipName, nil
}

// processGroupObject recursively processes a group object and its children, storing file contents in the provided map.
func (api *APIServices) processGroupObjectDownload(
	group *db.RepositoryObject,
	workspace *db.Workspace,
	repository *db.Repository,
	objectRef string,
	dataEngine *engine.Client,
	files map[string][]byte,
) error {
	if group == nil {
		return errors.New("group object is nil")
	}
	if group.Type != irminmodels.ObjectTypeGroup {
		return fmt.Errorf("object %q is not a group", group.Name)
	}

	for i := range group.Children {
		child := &group.Children[i]
		if child.Type == irminmodels.ObjectTypeGroup {
			if err := api.processGroupObjectDownload(child, workspace, repository, objectRef, dataEngine, files); err != nil {
				return err
			}
		} else {
			if err := api.processSingleObjectDownload(child, workspace, repository, objectRef, dataEngine, files); err != nil {
				return err
			}
		}
	}
	return nil
}

// processSingleObject fetches and stores the content of a single object.
func (api *APIServices) processSingleObjectDownload(
	object *db.RepositoryObject,
	workspace *db.Workspace,
	repository *db.Repository,
	objectRef string,
	dataEngine *engine.Client,
	files map[string][]byte,
) error {
	content, err := dataEngine.GetObjectContent(workspace.Slug, repository.Slug, object.Path, objectRef)
	if err != nil {
		return err
	}
	files[object.Path] = content
	return nil
}

func (api *APIServices) GetRepositoryObjectHistory(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	object *db.RepositoryObject,
) ([]irminmodels.Commit, error) {
	// Make sure this is allowed
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
			"User is not allowed to get repository object history",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"repository",
			repository.Slug,
			"objectPath",
			object.Path,
		)
		return nil, ErrAccessDenied
	}

	// Make sure the user is allowed to see commits in this repository
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
			"User is not allowed to see commits in this repository",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"repository",
			repository.Slug,
		)
		return nil, ErrAccessDenied
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c, locale, api.Logger, api.Env, api.DB)
	if err != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", err)
		return nil, err
	}

	// Get the object history from the data engine
	history, err := dataEngine.GetObjectChanges(workspace.Slug, repository.Slug, object.Path, object.RepositoryRef)
	if err != nil {
		api.Logger.ErrorContext(c, "Error retrieving object history from Data Engine", "error", err)
		return nil, err
	}

	return history, nil
}

func (api *APIServices) saveObjectAndTags(
	c context.Context,
	tx *gorm.DB,
	workspace *db.Workspace,
	repository *db.Repository,
	newObject *irminmodels.Object,
	objectRef string,
	tags []string,
) (*db.RepositoryObject, error) {
	// Save the object to the database
	txDB := &db.Database{DB: tx}
	repositoryObject, saveErr := lib.SaveObject(
		txDB,
		api.Logger,
		api.Env,
		newObject,
		objectRef,
		repository.ID,
	)
	if saveErr != nil {
		api.Logger.ErrorContext(c, "Error saving object to database", "error", saveErr)
		return nil, saveErr
	}

	// Add tags
	if len(tags) > 0 {
		for _, tagSqid := range tags {
			tagID, tagDecodeErr := api.SQIDManager.Decode("tags", tagSqid)
			if tagDecodeErr != nil {
				api.Logger.ErrorContext(c, "Error decoding tag SQID", "error", tagDecodeErr)
				return nil, tagDecodeErr
			}

			// Verify tag belongs to the workspace
			var tag db.Tag
			if tagErr := tx.First(&tag, uint(tagID)).Error; tagErr != nil {
				return nil, tagErr
			}
			if tag.WorkspaceID != workspace.ID {
				return nil, ErrInvalidRequest
			}

			// Add tag using the transaction
			if tagAddErr := tx.Model(repositoryObject).Association("Tags").Append(&db.Tag{Model: gorm.Model{ID: uint(tagID)}}); tagAddErr != nil {
				api.Logger.ErrorContext(c, "Error adding tag to repository object", "error", tagAddErr)
				return nil, tagAddErr
			}
		}
	}
	return repositoryObject, nil
}
