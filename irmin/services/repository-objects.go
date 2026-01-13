package services

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/lib"
	"irmin-api/permissions"
	"irmin-api/utils"
	"strings"
	"time"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminutils "github.com/IrminData/irmin-sdk-go/utils"
	"gorm.io/gorm"
)

const (
	// Validation strictness modes for repository object validation
	validationModeStrict     = "strict"
	validationModePermissive = "permissive"
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
	if repositoryObjectDB == nil {
		return repositoryObjectDB, detailsFromPath, ref, err
	}

	// Populate SQL selector for the root object and recursively for children
	// Only file objects (structured/binary) should have selectors
	// Groups (directories) don't need selectors, but their children do
	api.populateSelectorsForObject(
		c,
		repositoryObjectDB,
		workspace.Slug,
		repository.Slug,
		ref,
		repository.DefaultBranch,
	)

	if validateErr := api.validateObjectPermissions(c, user, workspace, repositoryObjectDB); validateErr != nil {
		return nil, detailsFromPath, ref, validateErr
	}

	return repositoryObjectDB, detailsFromPath, ref, err
}

// populateSelectorsForObject recursively populates SQL and S3 path selectors for an object and its children.
// Only structured/binary/pointer objects get selectors; groups are traversed but don't get selectors themselves.
// For pointer objects, the selector points to the target object's location, not the pointer file itself.
func (api *APIServices) populateSelectorsForObject(
	c context.Context,
	object *db.RepositoryObject,
	workspaceSlug string,
	repositorySlug string,
	ref string,
	defaultBranch string,
) {
	if object == nil {
		return
	}

	// Populate selector for non-group objects (structured/binary)
	switch {
	case object.Type == irminmodels.ObjectTypeGroup || object.Path == "":
		// Skip selector population for groups or empty paths
	case object.IsPointer:
		// For pointers, construct selector pointing to the target object
		api.populatePointerSelectors(c, object, workspaceSlug, defaultBranch)
	default:
		api.populateNonPointerSelectors(c, object, workspaceSlug, repositorySlug, ref, defaultBranch)
	}

	// Recursively populate selectors for children
	for i := range object.Children {
		api.populateSelectorsForObject(c, &object.Children[i], workspaceSlug, repositorySlug, ref, defaultBranch)
	}
}

// populateNonPointerSelectors constructs SQL and S3 path selectors for non-pointer objects.
func (api *APIServices) populateNonPointerSelectors(
	c context.Context,
	object *db.RepositoryObject,
	workspaceSlug string,
	repositorySlug string,
	ref string,
	defaultBranch string,
) {
	sqlSelector, s3PathSelector, constructErr := lib.ConstructSQLSelector(
		workspaceSlug,
		repositorySlug,
		object.Path,
		ref,
		defaultBranch,
	)
	if constructErr != nil {
		api.Logger.ErrorContext(
			c,
			"Error constructing SQL selector and S3 path selector",
			"error",
			constructErr,
			"path",
			object.Path,
		)
	} else {
		object.SQLSelector = sqlSelector
		object.S3PathSelector = s3PathSelector
	}
}

// populatePointerSelectors constructs SQL and S3 path selectors for a pointer object,
// pointing to the target object's location.
func (api *APIServices) populatePointerSelectors(
	c context.Context,
	object *db.RepositoryObject,
	workspaceSlug string,
	defaultBranch string,
) {
	// Get the target information from the pointer object's cached fields
	targetRepo := object.PointerTargetRepository
	targetPath := object.PointerTargetPath
	targetRef := object.PointerTargetRef

	// If pointer target fields are not populated, we can't construct the selector
	if targetRepo == "" || targetPath == "" || targetRef == "" {
		api.Logger.WarnContext(c, "Pointer object missing target information",
			"path", object.Path,
			"target_repository", targetRepo,
			"target_path", targetPath,
			"target_ref", targetRef,
		)
		return
	}

	// Construct the selector pointing to the target object
	sqlSelector, s3PathSelector, constructErr := lib.ConstructSQLSelector(
		workspaceSlug,
		targetRepo,
		targetPath,
		targetRef,
		defaultBranch,
	)
	if constructErr != nil {
		api.Logger.ErrorContext(
			c,
			"Error constructing SQL selector for pointer target",
			"error",
			constructErr,
			"pointer_path",
			object.Path,
			"target_path",
			targetPath,
		)
	} else {
		object.SQLSelector = sqlSelector
		object.S3PathSelector = s3PathSelector
	}
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
		return NewInternalErrorf("error checking permissions: %w", allowedErr)
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
		return NewInternalErrorf("error filtering objects by permissions: %w", filterErr)
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

	// Reject paths that use the reserved pointer prefix (_ptr.)
	// Users should use the CreatePointer endpoint to create pointer files
	if lib.IsPointerPath(objectPath) {
		return nil, ErrReservedPathPrefix
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c, locale, api.Logger, api.Env, api.DB)
	if err != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", err)
		return nil, NewInternalErrorf("error creating data engine client: %w", err)
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
		return nil, NewInternalErrorf("error uploading object to data engine: %w", err)
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
		if saveErr != nil {
			return NewInternalErrorf("error saving object and tags: %w", saveErr)
		}
		return nil
	})

	if transactionErr != nil {
		return nil, NewInternalErrorf("error in database transaction: %w", transactionErr)
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

	// Reject paths that use the reserved pointer prefix (_ptr.)
	// Users should use the CreatePointer endpoint to create pointer files
	if lib.IsPointerPath(objectPath) {
		return nil, ErrReservedPathPrefix
	}

	// Download with SSRF protections
	safeBody, err := lib.DownloadFileFromURL(c, url, headers)
	if err != nil {
		api.Logger.ErrorContext(c, "Error downloading file from URL", "error", err)
		return nil, NewInternalErrorf("error downloading file from URL: %w", err)
	}
	defer safeBody.Close()

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c, locale, api.Logger, api.Env, api.DB)
	if err != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", err)
		return nil, NewInternalErrorf("error creating data engine client: %w", err)
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
		return nil, NewInternalErrorf("error uploading file to data engine: %w", err)
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
		if saveErr != nil {
			return NewInternalErrorf("error saving object and tags: %w", saveErr)
		}
		return nil
	})

	if transactionErr != nil {
		return nil, NewInternalErrorf("error in database transaction: %w", transactionErr)
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
		return NewInternalErrorf("error checking permissions: %w", err)
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
		return NewInternalErrorf("error checking permissions: %w", err)
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
		return nil, NewInternalErrorf("error checking permissions: %w", err)
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
		return nil, NewInternalErrorf("error checking permissions: %w", err)
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

	// Reject paths that use the reserved pointer prefix (_ptr.)
	// Users should use the CreatePointer endpoint to create pointer files
	if lib.IsPointerPath(req.NewPath) {
		return nil, ErrReservedPathPrefix
	}

	// Prevent moving pointer objects to non-pointer paths, which would silently break the pointer
	// The IsPointer flag is determined by the path, so moving a pointer to a regular path
	// would cause the pointer target fields to be lost and the file content to become orphaned
	if object.IsPointer && !lib.IsPointerPath(req.NewPath) {
		return nil, ErrCannotMovePointerToRegularPath
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c, locale, api.Logger, api.Env, api.DB)
	if err != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", err)
		return nil, NewInternalErrorf("error creating data engine client: %w", err)
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
		return nil, NewInternalErrorf("error moving object in data engine: %w", err)
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
			return NewInternalErrorf("error deleting old object from cache: %w", deleteOldObjectErr)
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
			return NewInternalErrorf("error saving moved object: %w", saveErr)
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

	if transactionErr != nil {
		return repositoryObject, NewInternalErrorf("error in database transaction: %w", transactionErr)
	}
	return repositoryObject, nil
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
		return nil, NewInternalErrorf("error checking permissions: %w", err)
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
		return nil, NewInternalErrorf("error checking permissions: %w", err)
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

	// Reject paths that use the reserved pointer prefix (_ptr.)
	// Users should use the CreatePointer endpoint to create pointer files
	if lib.IsPointerPath(req.NewPath) {
		return nil, ErrReservedPathPrefix
	}

	// Prevent copying pointer objects to non-pointer paths, which would silently break the pointer
	// The IsPointer flag is determined by the path, so copying a pointer to a regular path
	// would cause the pointer target fields to be lost and the file content to become orphaned
	if object.IsPointer && !lib.IsPointerPath(req.NewPath) {
		return nil, ErrCannotMovePointerToRegularPath
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c, locale, api.Logger, api.Env, api.DB)
	if err != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", err)
		return nil, NewInternalErrorf("error creating data engine client: %w", err)
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
		return nil, NewInternalErrorf("error copying object in data engine: %w", err)
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
			return NewInternalErrorf("error saving copied object: %w", saveErr)
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

	if transactionErr != nil {
		return repositoryObject, NewInternalErrorf("error in database transaction: %w", transactionErr)
	}
	return repositoryObject, nil
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
		return NewInternalErrorf("error checking permissions: %w", err)
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
		return NewInternalErrorf("error checking permissions: %w", err)
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
			return NewInternalErrorf("error creating data engine client: %w", dataEngineErr)
		}

		// Delete the object from the data engine
		if deleteEngineObjectErr := dataEngine.DeleteObject(workspace.Slug, repository.Slug, object.Path, object.RepositoryRef, tx); deleteEngineObjectErr != nil {
			api.Logger.ErrorContext(c, "Error deleting object from Data Engine", "error", deleteEngineObjectErr)
			return NewInternalErrorf("error deleting object from data engine: %w", deleteEngineObjectErr)
		}

		// Delete the object cache from the database after successful engine deletion
		deleteDatabaseObjectErr := api.DB.DeleteObjects(tx,
			&object.Path,
			&repository.ID,
			&object.RepositoryRef,
		)
		if deleteDatabaseObjectErr != nil {
			api.Logger.ErrorContext(c, "Error deleting object from database", "error", deleteDatabaseObjectErr)
			return NewInternalErrorf("error deleting object from database: %w", deleteDatabaseObjectErr)
		}

		return nil
	})

	if transactionErr != nil {
		return NewInternalErrorf("error in database transaction: %w", transactionErr)
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
	limitResponse bool,
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
		return nil, NewInternalErrorf("error checking permissions: %w", err)
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

	// If this is a pointer, resolve the target and get its content
	if object.IsPointer || lib.IsPointerPath(object.Path) {
		return api.getPointerTargetContent(c, locale, user, workspace, repository, object, limitResponse)
	}

	// Check size limit before fetching content to avoid loading large objects into memory
	if limitResponse && object.SizeBytes > utils.DefaultMaxBinaryResponseSizeBytes {
		api.Logger.WarnContext(c, "Object content exceeds size limit, refusing to fetch",
			"size_mb", float64(object.SizeBytes)/utils.BytesPerMB,
			"limit_mb", float64(utils.DefaultMaxBinaryResponseSizeBytes)/utils.BytesPerMB,
			"path", object.Path,
		)
		return nil, ErrContentTooLarge
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c, locale, api.Logger, api.Env, api.DB)
	if err != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", err)
		return nil, NewInternalErrorf("error creating data engine client: %w", err)
	}

	// Get the object content from the data engine
	content, err := dataEngine.GetObjectContent(workspace.Slug, repository.Slug, object.Path, object.RepositoryRef)
	if err != nil {
		api.Logger.ErrorContext(c, "Error retrieving object content from Data Engine", "error", err)
		return nil, NewInternalErrorf("error retrieving object content from data engine: %w", err)
	}

	// Safety check: Verify actual content size matches expectations when limiting responses
	// This catches cases where object metadata might be stale or incorrect
	if limitResponse {
		if errorMsg := utils.CheckByteSizeLimit(content, utils.DefaultMaxBinaryResponseSizeBytes); errorMsg != nil {
			api.Logger.WarnContext(c, "Content size mismatch detected",
				"metadata_size", object.SizeBytes,
				"actual_size", len(content),
				"path", object.Path,
			)
			return nil, ErrContentTooLarge
		}
	}

	return content, nil
}

// getPointerTargetContent resolves a pointer and returns the content of the target object.
func (api *APIServices) getPointerTargetContent(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	pointerObject *db.RepositoryObject,
	limitResponse bool,
) ([]byte, error) {
	// Initialize Data Engine client to fetch pointer content
	dataEngine, err := engine.NewClient(c, locale, api.Logger, api.Env, api.DB)
	if err != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", err)
		return nil, NewInternalErrorf("error creating data engine client: %w", err)
	}

	// Fetch the pointer file content
	pointerContent, err := dataEngine.GetObjectContent(
		workspace.Slug,
		repository.Slug,
		pointerObject.Path,
		pointerObject.RepositoryRef,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error retrieving pointer content from Data Engine", "error", err)
		return nil, NewInternalErrorf("error retrieving pointer content: %w", err)
	}

	// Parse the pointer content
	pointerTarget, parseErr := lib.ParsePointerFile(pointerContent)
	if parseErr != nil {
		api.Logger.ErrorContext(c, "Error parsing pointer file content", "error", parseErr, "path", pointerObject.Path)
		return nil, NewInternalErrorf("error parsing pointer file: %w", parseErr)
	}

	// Resolve the target repository (must be in the same workspace for now)
	targetRepository, repoErr := api.DB.GetRepositoryBySlugAndWorkspaceID(pointerTarget.Repository, workspace.ID)
	if repoErr != nil || targetRepository == nil {
		api.Logger.ErrorContext(c, "Pointer target repository not found",
			"target_repository", pointerTarget.Repository,
			"pointer_path", pointerObject.Path,
		)
		return nil, ErrNotFound
	}

	// Check permissions on the target repository
	isAllowed, permErr := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepository,
		&targetRepository.ID,
		db.PolicyActionRead,
	)
	if permErr != nil {
		api.Logger.ErrorContext(c, "Error checking target repository permissions", "error", permErr)
		return nil, NewInternalErrorf("error checking permissions: %w", permErr)
	}
	if !isAllowed {
		api.Logger.ErrorContext(c, "User not allowed to access pointer target repository",
			"user", user.Email,
			"target_repository", pointerTarget.Repository,
		)
		return nil, ErrAccessDenied
	}

	// Check object-level permissions on the target object
	// This ensures deny policies on specific objects are enforced when accessing through pointers
	targetObjectPath := strings.TrimPrefix(pointerTarget.Path, "/")
	targetObject, targetObjErr := api.DB.FindObject(&targetObjectPath, &targetRepository.ID, &pointerTarget.Ref)
	if targetObjErr == nil && targetObject != nil {
		isObjectAllowed, objPermErr := api.PermissionService.IsAllowed(
			user,
			workspace,
			db.PolicyResourceRepositoryObject,
			&targetObject.ID,
			db.PolicyActionRead,
		)
		if objPermErr != nil {
			api.Logger.ErrorContext(c, "Error checking target object permissions", "error", objPermErr)
			return nil, NewInternalErrorf("error checking object permissions: %w", objPermErr)
		}
		if !isObjectAllowed {
			api.Logger.ErrorContext(c, "User not allowed to access pointer target object",
				"user", user.Email,
				"target_repository", pointerTarget.Repository,
				"target_path", pointerTarget.Path,
			)
			return nil, ErrAccessDenied
		}

		// Check size limit before fetching content to avoid loading large objects into memory
		if limitResponse && targetObject.SizeBytes > utils.DefaultMaxBinaryResponseSizeBytes {
			api.Logger.WarnContext(c, "Pointer target object exceeds size limit, refusing to fetch",
				"size_mb", float64(targetObject.SizeBytes)/utils.BytesPerMB,
				"limit_mb", float64(utils.DefaultMaxBinaryResponseSizeBytes)/utils.BytesPerMB,
				"target_path", pointerTarget.Path,
			)
			return nil, ErrContentTooLarge
		}
	}

	// Get the target object content
	targetContent, contentErr := dataEngine.GetObjectContent(
		workspace.Slug,
		targetRepository.Slug,
		targetObjectPath,
		pointerTarget.Ref,
	)
	if contentErr != nil {
		api.Logger.ErrorContext(c, "Error retrieving pointer target content from Data Engine",
			"error", contentErr,
			"target_repository", pointerTarget.Repository,
			"target_path", pointerTarget.Path,
		)
		return nil, NewInternalErrorf("error retrieving pointer target content: %w", contentErr)
	}

	// Safety check for response size limit
	if limitResponse {
		if errorMsg := utils.CheckByteSizeLimit(targetContent, utils.DefaultMaxBinaryResponseSizeBytes); errorMsg != nil {
			api.Logger.WarnContext(c, "Pointer target content exceeds size limit",
				"actual_size", len(targetContent),
				"target_path", pointerTarget.Path,
			)
			return nil, ErrContentTooLarge
		}
	}

	return targetContent, nil
}

func (api *APIServices) GetRepositoryObjectStructuredContent(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	object *db.RepositoryObject,
	limitResponse bool,
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
		return nil, NewInternalErrorf("error checking permissions: %w", err)
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
	content, err := api.GetRepositoryObjectContent(c, locale, user, workspace, repository, object, limitResponse)
	if err != nil {
		api.Logger.ErrorContext(c, "Error getting object content", "error", err)
		return nil, NewInternalErrorf("error getting object content: %w", err)
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
		return nil, NewInternalErrorf("error parsing structured files: %w", parseStructuredFileErr)
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
		return NewInternalError("group object is nil")
	}
	if group.Type != irminmodels.ObjectTypeGroup {
		return fmt.Errorf("object %q is not a group", group.Name)
	}

	for i := range group.Children {
		child := &group.Children[i]
		if child.Type == irminmodels.ObjectTypeGroup {
			if err := api.processGroupObjectDownload(child, workspace, repository, objectRef, dataEngine, files); err != nil {
				return NewInternalErrorf("error processing group object download: %w", err)
			}
		} else {
			if err := api.processSingleObjectDownload(child, workspace, repository, objectRef, dataEngine, files); err != nil {
				return NewInternalErrorf("error processing single object download: %w", err)
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
		return NewInternalErrorf("error getting object content from data engine: %w", err)
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
		return nil, NewInternalErrorf("error checking permissions: %w", err)
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
		return nil, NewInternalErrorf("error checking permissions: %w", err)
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
		return nil, NewInternalErrorf("error creating data engine client: %w", err)
	}

	// Get the object history from the data engine
	history, err := dataEngine.GetObjectChanges(workspace.Slug, repository.Slug, object.Path, object.RepositoryRef)
	if err != nil {
		api.Logger.ErrorContext(c, "Error retrieving object history from Data Engine", "error", err)
		return nil, NewInternalErrorf("error retrieving object history from data engine: %w", err)
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
		return nil, NewInternalErrorf("error saving object to database: %w", saveErr)
	}

	// Add tags
	if len(tags) > 0 {
		for _, tagSqid := range tags {
			tagID, tagDecodeErr := api.SQIDManager.Decode("tags", tagSqid)
			if tagDecodeErr != nil {
				api.Logger.ErrorContext(c, "Error decoding tag SQID", "error", tagDecodeErr)
				return nil, NewInternalErrorf("error decoding tag SQID: %w", tagDecodeErr)
			}

			// Verify tag belongs to the workspace
			var tag db.Tag
			if tagErr := tx.First(&tag, uint(tagID)).Error; tagErr != nil {
				return nil, NewInternalErrorf("error fetching tag from database: %w", tagErr)
			}
			if tag.WorkspaceID != workspace.ID {
				return nil, ErrInvalidRequest
			}

			// Add tag using the transaction
			if tagAddErr := tx.Model(repositoryObject).Association("Tags").Append(&db.Tag{Model: gorm.Model{ID: uint(tagID)}}); tagAddErr != nil {
				api.Logger.ErrorContext(c, "Error adding tag to repository object", "error", tagAddErr)
				return nil, NewInternalErrorf("error adding tag to repository object: %w", tagAddErr)
			}
		}
	}
	return repositoryObject, nil
}

func (api *APIServices) ValidateRepositoryObject(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	object *db.RepositoryObject,
	validationSchema *irminmodels.ObjectSchema,
	validationMode string,
) (*irmincore.ValidateObjectResponse, error) {
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
		return nil, NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to validate repository object",
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

	// Get the object content
	content, err := api.GetRepositoryObjectContent(c, locale, user, workspace, repository, object, false)
	if err != nil {
		api.Logger.ErrorContext(c, "Error getting object content", "error", err)
		return nil, NewInternalErrorf("error getting object content: %w", err)
	}

	// Validate the schema parameter
	if validationSchema == nil {
		return nil, ErrInvalidRequest
	}

	// Default validation mode to "strict" if not provided
	if validationMode == "" {
		validationMode = validationModeStrict
	}

	// Validate mode is either "strict" or "permissive"
	if validationMode != validationModeStrict && validationMode != validationModePermissive {
		return nil, ErrInvalidRequest
	}

	// Validate the object content against the schema with DuckDB support for non-JSON files
	validationConfig := &lib.ValidationConfig{
		Ctx:    c,
		Env:    api.Env,
		Logger: api.Logger,
	}
	result := lib.ValidateDataAgainstSchemaWithConfig(object.Path, content, validationSchema, validationConfig)

	// Build logs from validation result
	var logs []string
	if result.Valid {
		logs = append(logs, fmt.Sprintf("✓ Object '%s' passed validation", object.Path))
	} else {
		logs = append(logs, fmt.Sprintf("✗ Object '%s' failed validation:", object.Path))
		for _, err := range result.Errors {
			logs = append(logs, fmt.Sprintf("  - %s", err))
		}
	}

	// Log warnings if any
	for _, warning := range result.Warnings {
		logs = append(logs, fmt.Sprintf("  ⚠ %s", warning))
	}

	// Determine if we should return an error based on validation result and mode
	var validationErr error
	if !result.Valid {
		if validationMode == validationModeStrict {
			validationErr = fmt.Errorf("validation failed for object '%s'", object.Path)
		} else {
			logs = append(logs, "Validation mode is 'permissive', continuing despite errors")
		}
	}

	// Log the validation event
	eventDescription := fmt.Sprintf("Object %s validated on branch %s", object.Path, object.RepositoryRef)
	eventType := db.LogEventTypeInfo
	if validationErr != nil {
		eventDescription = fmt.Sprintf("Object %s validation failed on branch %s", object.Path, object.RepositoryRef)
		eventType = db.LogEventTypeError
	}

	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:               eventType,
		Description:        eventDescription,
		UserID:             &user.ID,
		WorkspaceID:        &workspace.ID,
		RepositoryID:       &repository.ID,
		RepositoryObjectID: &object.ID,
	})

	response := &irmincore.ValidateObjectResponse{
		Valid: result.Valid,
		Logs:  logs,
	}
	if validationErr != nil {
		response.Error = validationErr.Error()
	}

	return response, nil
}

// CreatePointer creates a pointer file that references an object in another repository.
func (api *APIServices) CreatePointer(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	pointerPath string,
	ref string,
	targetWorkspace string,
	targetRepository string,
	targetPath string,
	targetRef string,
) (*db.RepositoryObject, error) {
	// Make sure the user can create objects in this repository
	if err := api.ensureCreateAndModifyPermissions(c, user, workspace, repository); err != nil {
		return nil, err
	}

	// Normalize the pointer path
	normalizedPath := api.normalizePointerPath(pointerPath)

	// Validate and get the target repository
	targetRepo, repoErr := api.validateTargetRepository(c, user, workspace, targetRepository)
	if repoErr != nil {
		return nil, repoErr
	}

	// Validate the target object exists, is not a pointer, and user has access
	if validateErr := api.validateTargetObject(c, locale, user, workspace, targetRepo, targetPath, targetRef); validateErr != nil {
		return nil, validateErr
	}

	// Create and upload the pointer file
	newObject, err := api.createAndUploadPointer(
		c,
		locale,
		workspace,
		repository,
		normalizedPath,
		ref,
		targetWorkspace,
		targetRepository,
		targetPath,
		targetRef,
	)
	if err != nil {
		return nil, err
	}

	// Save the pointer object to the database
	repositoryObject, err := api.savePointerObject(
		repository,
		newObject,
		ref,
		targetRepository,
		targetPath,
		targetRef,
	)
	if err != nil {
		return nil, err
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type: db.LogEventTypeCreate,
		Description: fmt.Sprintf(
			"Pointer %s created pointing to %s/%s@%s",
			normalizedPath,
			targetRepository,
			targetPath,
			targetRef,
		),
		UserID:             &user.ID,
		WorkspaceID:        &workspace.ID,
		RepositoryID:       &repository.ID,
		RepositoryObjectID: &repositoryObject.ID,
	})

	return repositoryObject, nil
}

// normalizePointerPath ensures the pointer path has the correct prefix.
func (api *APIServices) normalizePointerPath(pointerPath string) string {
	if !lib.IsPointerPath(pointerPath) {
		// Automatically add the pointer prefix if not present
		parts := strings.Split(pointerPath, "/")
		filename := parts[len(parts)-1]
		if len(parts) > 1 {
			return strings.Join(parts[:len(parts)-1], "/") + "/" + lib.PointerFilePrefix + filename
		}
		return lib.PointerFilePrefix + filename
	}
	return pointerPath
}

// validateTargetRepository validates that the target repository exists and user has read access.
func (api *APIServices) validateTargetRepository(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	targetRepository string,
) (*db.Repository, error) {
	targetRepo, repoErr := api.DB.GetRepositoryBySlugAndWorkspaceID(targetRepository, workspace.ID)
	if repoErr != nil || targetRepo == nil {
		api.Logger.ErrorContext(c, "Target repository not found",
			"target_repository", targetRepository,
			"workspace", workspace.Slug,
		)
		return nil, ErrNotFound
	}

	// Check read permissions on the target repository
	isAllowed, permErr := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepository,
		&targetRepo.ID,
		db.PolicyActionRead,
	)
	if permErr != nil {
		api.Logger.ErrorContext(c, "Error checking target repository permissions", "error", permErr)
		return nil, NewInternalErrorf("error checking permissions: %w", permErr)
	}
	if !isAllowed {
		api.Logger.ErrorContext(c, "User not allowed to access target repository",
			"user", user.Email,
			"target_repository", targetRepository,
		)
		return nil, ErrAccessDenied
	}

	return targetRepo, nil
}

// validateTargetObject validates that the target object exists, is not a pointer, and user has read access.
func (api *APIServices) validateTargetObject(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	targetRepo *db.Repository,
	targetPath string,
	targetRef string,
) error {
	// Validate that target ref is not empty - required for pointer creation
	if targetRef == "" {
		api.Logger.ErrorContext(c, "Target ref is required for pointer creation",
			"target_repository", targetRepo.Slug,
			"target_path", targetPath,
		)
		return fmt.Errorf("%w: target ref is required", ErrInvalidRequest)
	}

	// Validate that target path is not empty - required for pointer creation
	if targetPath == "" {
		api.Logger.ErrorContext(c, "Target path is required for pointer creation",
			"target_repository", targetRepo.Slug,
			"target_ref", targetRef,
		)
		return fmt.Errorf("%w: target path is required", ErrInvalidRequest)
	}

	// Validate that the target is not itself a pointer (no pointer chains allowed)
	if lib.IsPointerPath(targetPath) {
		api.Logger.ErrorContext(c, "Cannot create pointer to another pointer",
			"target_repository", targetRepo.Slug,
			"target_path", targetPath,
		)
		return fmt.Errorf("%w: cannot create pointer to another pointer file", ErrInvalidRequest)
	}

	// Validate that the target object exists
	dataEngineForValidation, dataEngineErr := engine.NewClient(c, locale, api.Logger, api.Env, api.DB)
	if dataEngineErr != nil {
		api.Logger.ErrorContext(c, "error creating data engine client for validation", "error", dataEngineErr)
		return NewInternalErrorf("error creating data engine client: %w", dataEngineErr)
	}

	targetObject, targetObjectErr := dataEngineForValidation.GetPath(
		workspace.Slug,
		targetRepo.Slug,
		targetPath,
		targetRef,
	)
	if targetObjectErr != nil {
		api.Logger.ErrorContext(c, "Target object not found",
			"target_repository", targetRepo.Slug,
			"target_path", targetPath,
			"target_ref", targetRef,
			"error", targetObjectErr,
		)
		return fmt.Errorf(
			"%w: target object %s@%s in repository %s",
			ErrNotFound,
			targetPath,
			targetRef,
			targetRepo.Slug,
		)
	}

	// Also check if the resolved object is a pointer (cannot point to pointers)
	if targetObject.IsPointer {
		api.Logger.ErrorContext(c, "Cannot create pointer to another pointer",
			"target_repository", targetRepo.Slug,
			"target_path", targetPath,
		)
		return fmt.Errorf("%w: cannot create pointer to another pointer file", ErrInvalidRequest)
	}

	// Check object-level permissions on the target object
	// This ensures deny policies on specific objects are enforced when creating pointers
	normalizedPath := strings.TrimPrefix(targetPath, "/")
	dbTargetObject, dbErr := api.DB.FindObject(&normalizedPath, &targetRepo.ID, &targetRef)
	if dbErr == nil && dbTargetObject != nil {
		isObjectAllowed, objPermErr := api.PermissionService.IsAllowed(
			user,
			workspace,
			db.PolicyResourceRepositoryObject,
			&dbTargetObject.ID,
			db.PolicyActionRead,
		)
		if objPermErr != nil {
			api.Logger.ErrorContext(c, "Error checking target object permissions", "error", objPermErr)
			return NewInternalErrorf("error checking object permissions: %w", objPermErr)
		}
		if !isObjectAllowed {
			api.Logger.ErrorContext(c, "User not allowed to access target object",
				"user", user.Email,
				"target_repository", targetRepo.Slug,
				"target_path", targetPath,
			)
			return ErrAccessDenied
		}
	}

	return nil
}

// createAndUploadPointer creates the pointer file content and uploads it to the repository.
func (api *APIServices) createAndUploadPointer(
	c context.Context,
	locale string,
	workspace *db.Workspace,
	repository *db.Repository,
	pointerPath string,
	ref string,
	targetWorkspace string,
	targetRepository string,
	targetPath string,
	targetRef string,
) (*irminmodels.Object, error) {
	// Create the pointer target struct
	pointerTarget := &irminmodels.PointerTarget{
		Workspace:  targetWorkspace,
		Repository: targetRepository,
		Path:       targetPath,
		Ref:        targetRef,
	}

	// Generate the pointer file content
	pointerContent, contentErr := lib.CreatePointerContent(pointerTarget)
	if contentErr != nil {
		api.Logger.ErrorContext(c, "Error creating pointer content", "error", contentErr)
		return nil, NewInternalErrorf("error creating pointer content: %w", contentErr)
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c, locale, api.Logger, api.Env, api.DB)
	if err != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", err)
		return nil, NewInternalErrorf("error creating data engine client: %w", err)
	}

	// Upload the pointer file to the repository
	newObject, err := dataEngine.UploadObject(
		workspace.Slug,
		repository.Slug,
		pointerPath,
		ref,
		bytes.NewReader(pointerContent),
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error uploading pointer file to Data Engine", "error", err)
		return nil, NewInternalErrorf("error uploading pointer file: %w", err)
	}

	// Mark the object as a pointer (keeping the underlying type from the target)
	newObject.IsPointer = true
	newObject.PointerTarget = pointerTarget

	return newObject, nil
}

// savePointerObject saves the pointer object to the database with all metadata.
func (api *APIServices) savePointerObject(
	repository *db.Repository,
	newObject *irminmodels.Object,
	ref string,
	targetRepository string,
	targetPath string,
	targetRef string,
) (*db.RepositoryObject, error) {
	var repositoryObject *db.RepositoryObject

	// Use database transaction to ensure atomicity
	transactionErr := api.DB.Transaction(func(tx *gorm.DB) error {
		txDB := &db.Database{DB: tx}
		var saveErr error
		repositoryObject, saveErr = lib.SaveObject(
			txDB,
			api.Logger,
			api.Env,
			newObject,
			ref,
			repository.ID,
		)
		if saveErr != nil {
			return NewInternalErrorf("error saving pointer object: %w", saveErr)
		}

		// Update the pointer fields in the database
		repositoryObject.IsPointer = true
		repositoryObject.PointerTargetWorkspace = newObject.PointerTarget.Workspace
		repositoryObject.PointerTargetRepository = targetRepository
		repositoryObject.PointerTargetPath = targetPath
		repositoryObject.PointerTargetRef = targetRef

		if updateErr := tx.Save(repositoryObject).Error; updateErr != nil {
			return NewInternalErrorf("error updating pointer metadata: %w", updateErr)
		}

		return nil
	})

	if transactionErr != nil {
		return nil, NewInternalErrorf("error in database transaction: %w", transactionErr)
	}

	return repositoryObject, nil
}
