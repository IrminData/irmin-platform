package repositoryobjectcache

import (
	"context"
	"errors"
	"fmt"
	"irmin-api/db"
	"irmin-api/utils"
	"strings"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminutils "github.com/IrminData/irmin-sdk-go/utils"
)

// ensureRootObject ensures that a root object exists in the database.
// Root objects have empty path and name and serve as parents for root-level objects.
func (m *Manager) ensureRootObject(
	repositoryID uint,
	ref string,
	flatObjects *[]db.RepositoryObject,
) (*uint, error) {
	// Always check database first to avoid race conditions
	// This ensures we get the most up-to-date information
	existingRoot, err := m.db.FindObject(utils.StringPtr(""), &repositoryID, &ref)
	if err == nil && existingRoot != nil {
		// Root exists in database, add it to flat objects if not already there
		found := false
		for _, flatObject := range *flatObjects {
			if flatObject.Path == "" && flatObject.Name == "" {
				found = true
				break
			}
		}
		if !found {
			newFlatObject := db.RepositoryObject{
				Model:    existingRoot.Model,
				Path:     existingRoot.Path,
				ParentID: existingRoot.ParentID,
			}
			*flatObjects = append(*flatObjects, newFlatObject)
		}
		return &existingRoot.ID, nil
	}

	// Root doesn't exist, create it
	rootObject := &db.RepositoryObject{
		Name:          "",                          // Root object has empty name
		Path:          "",                          // Root object has empty path
		Type:          irminmodels.ObjectTypeGroup, // Root is always a group/directory
		ContentType:   "",                          // No content type for root
		RepositoryID:  repositoryID,
		RepositoryRef: ref,
		ParentID:      nil, // Root has no parent
	}

	// Save the root object
	if saveErr := m.db.Save(rootObject).Error; saveErr != nil {
		return nil, fmt.Errorf("error saving root object to database: %w", saveErr)
	}

	// Verify ID was set
	if rootObject.ID == 0 {
		return nil, errors.New("failed to get valid ID after saving root object")
	}

	// Load the Repository relationship
	if repoErr := m.db.Model(rootObject).Association("Repository").Find(&rootObject.Repository); repoErr != nil {
		return nil, fmt.Errorf("error loading repository relationship for root object: %w", repoErr)
	}

	// Add the newly created root object to flatObjects
	newFlatObject := db.RepositoryObject{
		Model:    rootObject.Model,
		Path:     rootObject.Path,
		ParentID: rootObject.ParentID,
	}
	*flatObjects = append(*flatObjects, newFlatObject)

	return &rootObject.ID, nil
}

// ensureParentObject ensures that a parent object exists in the database.
// If the parent doesn't exist, it creates a placeholder parent object.
// Returns the parent object ID and updates flatObjects if a new object is created.
func (m *Manager) ensureParentObject(
	parentPath string,
	repositoryID uint,
	ref string,
	flatObjects *[]db.RepositoryObject,
) (*uint, error) {
	// Don't create parent objects for empty paths (root directory)
	if parentPath == "" {
		return nil, nil //nolint:nilnil // Valid case: no parent ID for root directory
	}

	// First check if parent exists in provided flat objects snapshot (tolerate trailing slash differences)
	normalized := strings.TrimSuffix(parentPath, "/")
	withSlash := ""
	if normalized != "" {
		withSlash = normalized + "/"
	}
	for _, flatObject := range *flatObjects {
		if flatObject.Path == parentPath || flatObject.Path == normalized ||
			(withSlash != "" && flatObject.Path == withSlash) {
			return &flatObject.ID, nil
		}
	}

	// Then check database directly for the parent object (source of truth)
	existingParent, err := m.db.FindObject(&parentPath, &repositoryID, &ref)
	if err == nil && existingParent != nil {
		// Parent exists in database, add it to flat objects and return
		newFlatObject := db.RepositoryObject{
			Model:    existingParent.Model,
			Path:     existingParent.Path,
			ParentID: existingParent.ParentID,
		}
		*flatObjects = append(*flatObjects, newFlatObject)
		return &existingParent.ID, nil
	}

	// Parent doesn't exist, create it using path parser
	// Remove trailing slash from parent path for proper parsing
	cleanParentPath := strings.TrimSuffix(parentPath, "/")
	parentDetails := irminutils.ParseObjectDetailsFromPath(cleanParentPath)

	// Additional check: don't create objects with empty paths
	if parentDetails.FullPath == "" {
		return nil, nil //nolint:nilnil // Valid case: no parent ID for empty path
	}

	// Create parent object
	parentObject := &db.RepositoryObject{
		Name:          parentDetails.Name,
		Path:          parentDetails.FullPath,
		Type:          parentDetails.Type,
		ContentType:   parentDetails.ContentType,
		RepositoryID:  repositoryID,
		RepositoryRef: ref,
	}

	// If this parent also has a parent, ensure it exists recursively
	if parentDetails.ParentPath != nil {
		grandParentID, grandParentErr := m.ensureParentObject(
			*parentDetails.ParentPath,
			repositoryID,
			ref,
			flatObjects,
		)
		if grandParentErr != nil {
			return nil, fmt.Errorf("error ensuring grandparent object: %w", grandParentErr)
		}
		parentObject.ParentID = grandParentID
	}

	// Save the parent object
	// CRITICAL: Must pass pointer to GORM so it can update auto-generated fields like ID
	if saveErr := m.db.Save(parentObject).Error; saveErr != nil {
		return nil, fmt.Errorf("error saving parent object to database: %w", saveErr)
	}

	// Verify ID was set
	if parentObject.ID == 0 {
		return nil, errors.New("failed to get valid ID after saving parent object")
	}

	// Load the Repository relationship to ensure the object is complete
	// This matches what we do in ProcessEngineObject
	if repoErr := m.db.Model(parentObject).Association("Repository").Find(&parentObject.Repository); repoErr != nil {
		return nil, fmt.Errorf("error loading repository relationship for parent object: %w", repoErr)
	}

	// Add the newly created object to flatObjects for future lookups
	// This prevents duplicate creation and ensures consistency
	newFlatObject := db.RepositoryObject{
		Model:    parentObject.Model,
		Path:     parentObject.Path,
		ParentID: parentObject.ParentID,
	}
	*flatObjects = append(*flatObjects, newFlatObject)

	return &parentObject.ID, nil
}

// isRootPath checks if a path represents the root directory
func (m *Manager) isRootPath(path string) bool {
	return path == "" || path == "/"
}

// syncCacheWithDataEngine removes cached objects that no longer exist in the data engine
// and ensures the cache only contains objects that actually exist
func (m *Manager) syncCacheWithDataEngine(
	engineChildren []irminmodels.Object,
	flatObjects []db.RepositoryObject,
	repositoryID uint,
	ref string,
	parentPath string,
) {
	// Create a map of engine object paths (canonical) for quick lookup
	engineObjectPaths := make(map[string]bool)
	for _, engineObj := range engineChildren {
		// Normalize/parse to canonical path, matching DB path format
		parsed := irminutils.ParseObjectDetailsFromPath(strings.TrimPrefix(engineObj.Path, "/"))
		canonicalPath := parsed.FullPath
		if engineObj.Type == irminmodels.ObjectTypeGroup {
			// Groups are stored with trailing slash (non-root)
			trimmed := strings.TrimSuffix(canonicalPath, "/")
			if trimmed != "" {
				canonicalPath = trimmed + "/"
			} else {
				canonicalPath = ""
			}
		} else {
			canonicalPath = strings.TrimSuffix(canonicalPath, "/")
		}
		engineObjectPaths[canonicalPath] = true
	}

	// Check cached objects and remove stale ones
	stalePaths := make([]string, 0)
	for _, cachedObj := range flatObjects {
		if m.shouldRemoveCachedObject(cachedObj, engineObjectPaths, parentPath) {
			stalePaths = append(stalePaths, cachedObj.Path)
		}
	}

	// Remove stale objects and their children
	for _, stalePath := range stalePaths {
		m.removeStaleObjectAndChildren(stalePath, repositoryID, ref)
	}
}

// shouldRemoveCachedObject determines if a cached object should be removed
func (m *Manager) shouldRemoveCachedObject(
	cachedObj db.RepositoryObject,
	engineObjectPaths map[string]bool,
	parentPath string,
) bool {
	// If object still exists in data engine, keep it
	if engineObjectPaths[cachedObj.Path] {
		return false
	}

	// Check if this is a child of the current parent
	if cachedObj.ParentID != nil {
		return m.isChildOfParent(cachedObj, parentPath)
	}

	// Root level objects - remove if they don't exist in engine
	return parentPath == "" && cachedObj.Path != ""
}

// isChildOfParent checks if a cached object is a child of the given parent
func (m *Manager) isChildOfParent(cachedObj db.RepositoryObject, parentPath string) bool {
	var parentObj db.RepositoryObject
	err := m.db.First(&parentObj, *cachedObj.ParentID).Error
	if err != nil {
		return false
	}
	// Compare canonical paths
	parsed := irminutils.ParseObjectDetailsFromPath(strings.TrimSuffix(parentPath, "/"))
	canonicalPath := parsed.FullPath
	if canonicalPath != "" {
		canonicalPath = strings.TrimSuffix(canonicalPath, "/")
	}
	// Parent objects are groups and stored with trailing slash (non-root)
	if parentObj.Path != "" {
		return strings.TrimSuffix(parentObj.Path, "/") == canonicalPath
	}
	return canonicalPath == ""
}

// removeStaleObjectAndChildren removes a stale object and all its children from the cache
func (m *Manager) removeStaleObjectAndChildren(objectPath string, repositoryID uint, ref string) {
	tx := m.db.Begin()

	// First remove all children (objects whose path starts with this object's path + "/")
	childPathPattern := objectPath + "/"

	// Find all children objects that should be removed
	var childObjects []db.RepositoryObject
	findErr := m.db.Where("repository_id = ? AND repository_ref = ? AND path LIKE ?",
		repositoryID, ref, childPathPattern+"%").Find(&childObjects).Error

	if findErr == nil {
		// Delete each child object within the same transaction
		for _, child := range childObjects {
			deleteErr := m.db.DeleteObjects(tx, &child.Path, &repositoryID, &ref)
			if deleteErr != nil {
				tx.Rollback()
				return
			}
		}
	}

	// Then remove the object itself within the same transaction
	deleteErr := m.db.DeleteObjects(tx, &objectPath, &repositoryID, &ref)
	if deleteErr != nil {
		tx.Rollback()
	} else {
		tx.Commit()
	}
}

// handleObjectNotFound handles the case when an object is not found in the data engine
func (m *Manager) handleObjectNotFound(
	ctx context.Context,
	path, ref string,
	repositoryID uint,
	existingObject *db.RepositoryObject,
	originalErr error,
) error {
	// If object exists in cache but not in data engine, remove it from cache
	if existingObject != nil {
		m.logger.InfoContext(
			ctx,
			"Object not found in data engine, removing from cache",
			"path", path,
			"ref", ref,
		)
		m.cleanupStaleCache(ctx, path, repositoryID, ref)
	}
	return fmt.Errorf("error getting object from data engine: %w", originalErr)
}

// cleanupStaleCache removes a stale object from the cache
func (m *Manager) cleanupStaleCache(
	ctx context.Context,
	path string,
	repositoryID uint,
	ref string,
) {
	tx := m.db.Begin()
	deleteErr := m.db.DeleteObjects(tx, &path, &repositoryID, &ref)
	if deleteErr != nil {
		tx.Rollback()
		m.logger.WarnContext(
			ctx,
			"Failed to remove stale object from cache",
			"error", deleteErr,
			"path", path,
		)
	} else {
		tx.Commit()
		m.logger.InfoContext(
			ctx,
			"Removed stale object from cache",
			"path", path,
		)
	}
}

// setParentFromPath sets the parent ID for a repository object based on the parent path.
// It handles both root-level objects and nested objects.
func (m *Manager) setParentFromPath(
	repositoryObject *db.RepositoryObject,
	parentPath string,
	repositoryID uint,
	ref string,
	flatObjects *[]db.RepositoryObject,
) error {
	if parentPath == "" || m.isRootPath(parentPath) {
		// For root-level objects, ensure root object exists and set as parent
		rootObjectID, err := m.ensureRootObject(repositoryID, ref, flatObjects)
		if err != nil {
			return fmt.Errorf("error ensuring root object: %w", err)
		}
		repositoryObject.ParentID = rootObjectID
		return nil
	}

	// For nested objects, ensure parent object exists
	parentObjectID, err := m.ensureParentObject(parentPath, repositoryID, ref, flatObjects)
	if err != nil {
		return fmt.Errorf("error ensuring parent object: %w", err)
	}
	repositoryObject.ParentID = parentObjectID
	return nil
}

// deriveParentPathFromRawPath returns a parent path pointer for a raw input path
// If the object is at root level, returns pointer to empty string to indicate root parent
func (m *Manager) deriveParentPathFromRawPath(inputPath string) *string {
	parsed := irminutils.ParseObjectDetailsFromPath(inputPath)
	if parsed.ParentPath != nil {
		return parsed.ParentPath
	}
	empty := ""
	return &empty
}

// normalizeEngineObject normalizes object fields in-place and returns normalized path and name
func (m *Manager) normalizeEngineObject(object *irminmodels.Object) (string, string) {
	// Trim leading slash
	object.Path = strings.TrimPrefix(object.Path, "/")
	// Parse using SDK utils to determine canonical values
	parseInput := strings.TrimSuffix(object.Path, "/")
	parsed := irminutils.ParseObjectDetailsFromPath(parseInput)
	object.Name = parsed.Name
	if object.Type == "" {
		object.Type = parsed.Type
	}
	if object.ContentType == "" {
		object.ContentType = parsed.ContentType
	}
	// Canonicalize path depending on type
	if object.Type == irminmodels.ObjectTypeGroup {
		trimmed := strings.TrimSuffix(parsed.FullPath, "/")
		if trimmed != "" {
			object.Path = trimmed + "/"
		} else {
			object.Path = ""
		}
		object.ContentType = ""
	} else {
		object.Path = strings.TrimSuffix(parsed.FullPath, "/")
	}
	// Normalize root marker
	normalizedPath := strings.TrimSpace(object.Path)
	normalizedName := strings.TrimSpace(object.Name)
	if (normalizedPath == "" || normalizedPath == "/") && normalizedName == "" {
		object.Path = ""
		object.Name = ""
		normalizedPath = ""
		normalizedName = ""
	}
	return normalizedPath, normalizedName
}

// buildRepositoryObject creates a DB repository object from engine object and context
func (m *Manager) buildRepositoryObject(
	object *irminmodels.Object,
	ref string,
	repositoryID uint,
	parentID *uint,
) *db.RepositoryObject {
	return &db.RepositoryObject{
		Name:                  object.Name,
		Path:                  object.Path,
		Type:                  object.Type,
		ContentType:           object.ContentType,
		PhysicalAddress:       object.PhysicalAddress,
		PhysicalAddressExpiry: object.PhysicalAddressExpiry,
		SizeBytes:             object.SizeBytes,
		LastModified:          object.LastModified,
		Metadata:              object.Metadata,
		RepositoryRef:         ref,
		RepositoryID:          repositoryID,
		ParentID:              parentID,
	}
}

// findExistingObject searches in flat objects by path and sets ID/ParentID when found
func (m *Manager) findExistingObject(
	flatObjects []db.RepositoryObject,
	path string,
	repositoryObject *db.RepositoryObject,
) bool {
	for _, flatObject := range flatObjects {
		if flatObject.Path == path {
			repositoryObject.ID = flatObject.ID
			// Preserve existing parent if not provided by caller
			if repositoryObject.ParentID == nil {
				repositoryObject.ParentID = flatObject.ParentID
			}
			return true
		}
	}
	return false
}

// isRootObject determines if path/name indicate root
func (m *Manager) isRootObject(normalizedPath, normalizedName string) bool {
	return (normalizedPath == "" || normalizedPath == "/") && normalizedName == ""
}

// saveOrUpdateRepositoryObject persists object and updates flat snapshot when needed
func (m *Manager) saveOrUpdateRepositoryObject(
	repositoryObject *db.RepositoryObject,
	existingObjectFound bool,
	shouldUpdateParent bool,
	flatObjects *[]db.RepositoryObject,
) error {
	if !existingObjectFound || repositoryObject.ID == 0 {
		if err := m.db.Save(repositoryObject).Error; err != nil {
			return fmt.Errorf("error saving object to database: %w", err)
		}
		newFlat := db.RepositoryObject{
			Model:    repositoryObject.Model,
			Path:     repositoryObject.Path,
			ParentID: repositoryObject.ParentID,
		}
		*flatObjects = append(*flatObjects, newFlat)
		return nil
	}
	// Object exists, update mutable fields
	updates := map[string]any{
		"physical_address":        repositoryObject.PhysicalAddress,
		"physical_address_expiry": repositoryObject.PhysicalAddressExpiry,
		"size_bytes":              repositoryObject.SizeBytes,
		"last_modified":           repositoryObject.LastModified,
		"metadata":                repositoryObject.Metadata,
	}
	if shouldUpdateParent {
		updates["parent_id"] = repositoryObject.ParentID
	}
	if err := m.db.Model(repositoryObject).Updates(updates).Error; err != nil {
		return fmt.Errorf("error updating object in database: %w", err)
	}
	return nil
}

// processObjectChildren processes child objects and returns their DB representations
func (m *Manager) processObjectChildren(
	object *irminmodels.Object,
	flatObjects []db.RepositoryObject,
	ref string,
	repositoryID uint,
	parentRepoObject *db.RepositoryObject,
) ([]db.RepositoryObject, error) {
	if len(object.Children) > 0 {
		m.syncCacheWithDataEngine(object.Children, flatObjects, repositoryID, ref, parentRepoObject.Path)
	}
	children := make([]db.RepositoryObject, len(object.Children))
	for i, child := range object.Children {
		childObject, err := m.ProcessEngineObject(
			&child,
			flatObjects,
			ref,
			repositoryID,
			&parentRepoObject.Path,
			&parentRepoObject.ID,
		)
		if err != nil {
			return nil, fmt.Errorf("error processing child object: %w", err)
		}
		children[i] = *childObject
	}
	return children, nil
}
