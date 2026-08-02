package db

import (
	"fmt"
	"strings"
	"time"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	"gorm.io/gorm"
)

type RepositoryObject struct {
	gorm.Model

	Name                  string                 `json:"name"`
	Path                  string                 `json:"path"                              gorm:"index"`
	Type                  irminmodels.ObjectType `json:"type"`
	ContentType           string                 `json:"content_type,omitempty"`
	PhysicalAddress       string                 `json:"physical_address,omitempty"`
	PhysicalAddressExpiry *int64                 `json:"physical_address_expiry,omitempty"`
	SizeBytes             int64                  `json:"size_bytes,omitempty"`
	LastModified          string                 `json:"last_modified,omitempty"`
	Metadata              map[string]string      `json:"metadata,omitempty"                gorm:"type:jsonb;serializer:json"`
	S3PathSelector        string                 `json:"s3_path_selector,omitempty"        gorm:"-"` // This field is not stored in the database, since it's just a computed value.
	SQLSelector           string                 `json:"sql_selector,omitempty"            gorm:"-"` // This field is not stored in the database, since it's just a computed value.

	ParentID *uint              `json:"parent_id,omitempty" gorm:"index"`
	Parent   *RepositoryObject  `json:"parent,omitempty"    gorm:"foreignKey:ParentID;references:ID"`
	Children []RepositoryObject `json:"children,omitempty"  gorm:"foreignKey:ParentID;references:ID"`

	RepositoryRef string      `json:"repository_ref,omitempty" gorm:"index"`
	Repository    *Repository `json:"repository,omitempty"     gorm:"foreignKey:RepositoryID;references:ID"`
	RepositoryID  uint        `json:"repository_id,omitempty"  gorm:"index"`
	Tags          []Tag       `json:"tags,omitempty"           gorm:"many2many:repository_object_tags;"`

	// Pointer fields - cached from pointer file content for fast lookups
	IsPointer               bool   `json:"is_pointer,omitempty"`
	PointerTargetWorkspace  string `json:"pointer_target_workspace,omitempty"`  // Empty = same workspace (future cross-workspace support)
	PointerTargetRepository string `json:"pointer_target_repository,omitempty"` // Target repository slug
	PointerTargetPath       string `json:"pointer_target_path,omitempty"`       // Target object path
	PointerTargetRef        string `json:"pointer_target_ref,omitempty"`        // Target branch or commit
}

func (d *Database) FindObject(path *string, repositoryID *uint, ref *string) (*RepositoryObject, error) {
	var object RepositoryObject
	query := d.Preload("Repository").
		Preload("Parent").
		Preload("Children.Repository").
		Preload("Children.Tags").
		Preload("Tags")

	conditions := make([]string, 0)
	args := make([]any, 0)

	if path != nil {
		// Support canonical lookup of group paths with or without trailing slash
		input := *path
		if input == "" {
			conditions = append(conditions, "path = ?")
			args = append(args, input)
		} else {
			alt := strings.TrimSuffix(input, "/")
			withSlash := alt + "/"
			// Build IN clause with distinct values
			switch input {
			case withSlash:
				// Already has trailing slash; also include without
				conditions = append(conditions, "path IN (?, ?)")
				args = append(args, input, alt)
				// Prefer exact input (with slash) first using parameterized ORDER BY
				query = query.Order(gorm.Expr("CASE WHEN path = ? THEN 0 WHEN path = ? THEN 1 ELSE 2 END", input, alt))
			case alt:
				// No trailing slash; include with
				conditions = append(conditions, "path IN (?, ?)")
				args = append(args, input, withSlash)
				// Prefer canonical group path (with trailing slash) when both exist using parameterized ORDER BY
				query = query.Order(gorm.Expr("CASE WHEN path = ? THEN 0 WHEN path = ? THEN 1 ELSE 2 END", withSlash, input))
			default:
				// Fallback exact match
				conditions = append(conditions, "path = ?")
				args = append(args, input)
			}
		}
	}

	if repositoryID != nil {
		conditions = append(conditions, "repository_id = ?")
		args = append(args, *repositoryID)
	}

	if ref != nil {
		conditions = append(conditions, "repository_ref = ?")
		args = append(args, *ref)
	}

	if len(conditions) > 0 {
		query = query.Where(strings.Join(conditions, " AND "), args...)
	}

	if err := query.First(&object).Error; err != nil {
		return nil, err
	}

	return &object, nil
}

// FindChildObjects returns the direct children of the given parent object.
// Use this instead of relying on preloaded Children when traversing nested directories,
// since GORM's Preload only loads one level of depth.
func (d *Database) FindChildObjects(parentID uint) ([]RepositoryObject, error) {
	var children []RepositoryObject
	if err := d.Where("parent_id = ?", parentID).Find(&children).Error; err != nil {
		return nil, fmt.Errorf("failed to find child objects for parent %d: %w", parentID, err)
	}
	return children, nil
}

func (d *Database) GetFlatDBObjects(repositoryID uint, ref string) ([]RepositoryObject, error) {
	objects := []RepositoryObject{}
	if err := d.Select("id, path, parent_id").Where(&RepositoryObject{RepositoryID: repositoryID, RepositoryRef: ref}).Find(&objects).Error; err != nil {
		return objects, err
	}
	return objects, nil
}

func (d *Database) DeleteObjects(tx *gorm.DB, path *string, repositoryID *uint, ref *string) error {
	objects, err := d.findObjectsToDelete(tx, path, repositoryID, ref)
	if err != nil {
		return err
	}

	return d.deleteObjectsAndChildren(tx, objects)
}

// findObjectsToDelete builds the query conditions and finds matching objects.
func (d *Database) findObjectsToDelete(
	tx *gorm.DB,
	path *string,
	repositoryID *uint,
	ref *string,
) ([]RepositoryObject, error) {
	conditions, args := d.buildDeleteConditions(path, repositoryID, ref)
	if len(conditions) == 0 {
		return []RepositoryObject{}, nil
	}

	var objects []RepositoryObject
	err := tx.Where(strings.Join(conditions, " AND "), args...).Find(&objects).Error
	return objects, err
}

// buildDeleteConditions creates the WHERE clause conditions and arguments.
func (d *Database) buildDeleteConditions(path *string, repositoryID *uint, ref *string) ([]string, []any) {
	conditions := make([]string, 0)
	args := make([]any, 0)

	if path != nil {
		conditions = append(conditions, "path = ?")
		args = append(args, *path)
	}

	if repositoryID != nil {
		conditions = append(conditions, "repository_id = ?")
		args = append(args, *repositoryID)
	}

	if ref != nil {
		conditions = append(conditions, "repository_ref = ?")
		args = append(args, *ref)
	}

	return conditions, args
}

// deleteObjectsAndChildren handles the deletion of objects and their children.
func (d *Database) deleteObjectsAndChildren(tx *gorm.DB, objects []RepositoryObject) error {
	for _, object := range objects {
		if err := d.deleteSingleObjectAndChildren(tx, object); err != nil {
			return err
		}
	}
	return nil
}

// deleteSingleObjectAndChildren deletes a single object and all its children.
func (d *Database) deleteSingleObjectAndChildren(tx *gorm.DB, object RepositoryObject) error {
	// Recursively delete all children
	if err := deleteChildrenRecursively(tx, object.ID); err != nil {
		return err
	}

	// Remove tag associations
	if err := tx.Where(&RepositoryObjectTag{RepositoryObjectID: object.ID}).Delete(&RepositoryObjectTag{}).Error; err != nil {
		return err
	}

	// Delete the object itself
	return tx.Delete(&object).Error
}

// MarkObjectCacheStale marks the root object entry for a repository+ref as stale
// by setting updated_at far enough in the past to force ShouldRefreshCache to return true.
// This should be called after any write operation that creates, modifies, or deletes objects.
func (d *Database) MarkObjectCacheStale(repositoryID uint, ref string) error {
	staleTime := time.Now().Add(-2 * time.Hour)
	return d.Model(&RepositoryObject{}).
		Where("repository_id = ? AND repository_ref = ? AND path = ?", repositoryID, ref, "").
		Update("updated_at", staleTime).Error
}

// MarkObjectCacheStaleBySlug marks the root object entry as stale using workspace and repository slugs.
// This is a convenience method for callers that don't have the repository ID available (e.g., orchestrator).
func (d *Database) MarkObjectCacheStaleBySlug(workspaceSlug, repositorySlug, ref string) error {
	var repo Repository
	if err := d.Joins("JOIN workspaces ON workspaces.id = repositories.workspace_id").
		Where("repositories.slug = ? AND workspaces.slug = ?", repositorySlug, workspaceSlug).
		First(&repo).Error; err != nil {
		return err
	}
	return d.MarkObjectCacheStale(repo.ID, ref)
}

// deleteChildrenRecursively deletes all children of an object recursively.
func deleteChildrenRecursively(tx *gorm.DB, parentID uint) error {
	var children []RepositoryObject
	if err := tx.Where(&RepositoryObject{ParentID: &parentID}).Find(&children).Error; err != nil {
		return err
	}

	// Recursively delete children of each child
	for _, child := range children {
		if err := deleteChildrenRecursively(tx, child.ID); err != nil {
			return err
		}
	}

	// Remove tag associations for all direct children using a subquery (compatible with Postgres DELETE)
	subQuery := tx.Model(&RepositoryObject{}).Select("id").Where(&RepositoryObject{ParentID: &parentID})
	if err := tx.Where("repository_object_id IN (?)", subQuery).Delete(&RepositoryObjectTag{}).Error; err != nil {
		return err
	}

	// Delete all direct children
	return tx.Where(&RepositoryObject{ParentID: &parentID}).Delete(&RepositoryObject{}).Error
}
