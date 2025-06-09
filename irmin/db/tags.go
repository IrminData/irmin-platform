package db

import (
	"gorm.io/gorm"
)

// Tag represents a tag/label that can be attached to various entities.
type Tag struct {
	gorm.Model
	Name        string    `json:"name"`
	Color       string    `json:"color"` // Hex color code
	Description string    `json:"description"`
	WorkspaceID uint      `json:"workspace_id" gorm:"index"`
	Workspace   Workspace `json:"workspace"    gorm:"foreignKey:WorkspaceID"`
}

// Junction tables for many-to-many relationships

type QueryTag struct {
	StoredQueryID uint        `json:"stored_query_id" gorm:"primaryKey"`
	StoredQuery   StoredQuery `json:"stored_query"    gorm:"foreignKey:StoredQueryID"`
	TagID         uint        `json:"tag_id"          gorm:"primaryKey"`
	Tag           Tag         `json:"tag"             gorm:"foreignKey:TagID"`
}

type RepositoryTag struct {
	RepositoryID uint       `json:"repository_id" gorm:"primaryKey"`
	Repository   Repository `json:"repository"    gorm:"foreignKey:RepositoryID"`
	TagID        uint       `json:"tag_id"        gorm:"primaryKey"`
	Tag          Tag        `json:"tag"           gorm:"foreignKey:TagID"`
}

type WorkflowTag struct {
	WorkflowID uint     `json:"workflow_id" gorm:"primaryKey"`
	Workflow   Workflow `json:"workflow"    gorm:"foreignKey:WorkflowID"`
	TagID      uint     `json:"tag_id"      gorm:"primaryKey"`
	Tag        Tag      `json:"tag"         gorm:"foreignKey:TagID"`
}

type ConnectionTag struct {
	ConnectionID uint       `json:"connection_id" gorm:"primaryKey"`
	Connection   Connection `json:"connection"    gorm:"foreignKey:ConnectionID"`
	TagID        uint       `json:"tag_id"        gorm:"primaryKey"`
	Tag          Tag        `json:"tag"           gorm:"foreignKey:TagID"`
}

type RepositoryObjectTag struct {
	RepositoryObjectID uint             `json:"repository_object_id" gorm:"primaryKey"`
	RepositoryObject   RepositoryObject `json:"repository_object"    gorm:"foreignKey:RepositoryObjectID"`
	TagID              uint             `json:"tag_id"               gorm:"primaryKey"`
	Tag                Tag              `json:"tag"                  gorm:"foreignKey:TagID"`
}

// TaggedAssets represents all assets associated with a specific tag.
type TaggedAssets struct {
	Queries           []StoredQuery      `json:"queries"`
	Repositories      []Repository       `json:"repositories"`
	Workflows         []Workflow         `json:"workflows"`
	Connections       []Connection       `json:"connections"`
	RepositoryObjects []RepositoryObject `json:"repository_objects"`
}

// TagWithAssets represents a tag along with all its associated assets.
type TagWithAssets struct {
	Tag    Tag            `json:"tag"`
	Assets TaggedAssets   `json:"assets"`
	Counts map[string]int `json:"counts"`
}

// DeleteTag deletes a tag and removes all its associations.
func (d *Database) DeleteTag(id uint) error {
	return d.Transaction(func(tx *gorm.DB) error {
		// Delete all associations first
		if err := tx.Where("tag_id = ?", id).Delete(&QueryTag{}).Error; err != nil {
			return err
		}
		if err := tx.Where("tag_id = ?", id).Delete(&RepositoryTag{}).Error; err != nil {
			return err
		}
		if err := tx.Where("tag_id = ?", id).Delete(&WorkflowTag{}).Error; err != nil {
			return err
		}
		if err := tx.Where("tag_id = ?", id).Delete(&ConnectionTag{}).Error; err != nil {
			return err
		}
		if err := tx.Where("tag_id = ?", id).Delete(&RepositoryObjectTag{}).Error; err != nil {
			return err
		}
		// Then delete the tag itself
		return tx.Delete(&Tag{}, id).Error
	})
}

// GetTagByID retrieves a tag by its ID.
func (d *Database) GetTagByID(id uint) (*Tag, error) {
	var tag Tag
	if err := d.First(&tag, id).Error; err != nil {
		return nil, err
	}
	return &tag, nil
}

// Query tag methods

// AddTagToQuery adds a tag to a query.
func (d *Database) AddTagToQuery(queryID, tagID uint) error {
	queryTag := QueryTag{
		StoredQueryID: queryID,
		TagID:         tagID,
	}
	return d.Create(&queryTag).Error
}

// RemoveTagFromQuery removes a tag from a query.
func (d *Database) RemoveTagFromQuery(queryID, tagID uint) error {
	return d.Where("stored_query_id = ? AND tag_id = ?", queryID, tagID).Delete(&QueryTag{}).Error
}

// GetQueryTags retrieves all tags for a query.
func (d *Database) GetQueryTags(queryID uint) ([]Tag, error) {
	var tags []Tag
	if err := d.Joins("JOIN query_tags ON query_tags.tag_id = tags.id").
		Where("query_tags.stored_query_id = ?", queryID).
		Order("tags.name asc").
		Find(&tags).Error; err != nil {
		return nil, err
	}
	return tags, nil
}

// GetQueriesByTag retrieves all queries that have a specific tag.
func (d *Database) GetQueriesByTag(tagID uint) ([]StoredQuery, error) {
	var queries []StoredQuery
	if err := d.Joins("JOIN query_tags ON query_tags.stored_query_id = stored_queries.id").
		Where("query_tags.tag_id = ?", tagID).
		Preload("Owner").
		Preload("Workspace").
		Order("stored_queries.created_at desc").
		Find(&queries).Error; err != nil {
		return nil, err
	}
	return queries, nil
}

// Repository tag methods

// AddTagToRepository adds a tag to a repository.
func (d *Database) AddTagToRepository(repositoryID, tagID uint) error {
	repositoryTag := RepositoryTag{
		RepositoryID: repositoryID,
		TagID:        tagID,
	}
	return d.Create(&repositoryTag).Error
}

// RemoveTagFromRepository removes a tag from a repository.
func (d *Database) RemoveTagFromRepository(repositoryID, tagID uint) error {
	return d.Where("repository_id = ? AND tag_id = ?", repositoryID, tagID).Delete(&RepositoryTag{}).Error
}

// GetRepositoryTags retrieves all tags for a repository.
func (d *Database) GetRepositoryTags(repositoryID uint) ([]Tag, error) {
	var tags []Tag
	if err := d.Joins("JOIN repository_tags ON repository_tags.tag_id = tags.id").
		Where("repository_tags.repository_id = ?", repositoryID).
		Order("tags.name asc").
		Find(&tags).Error; err != nil {
		return nil, err
	}
	return tags, nil
}

// GetRepositoriesByTag retrieves all repositories that have a specific tag.
func (d *Database) GetRepositoriesByTag(tagID uint) ([]Repository, error) {
	var repositories []Repository
	if err := d.Joins("JOIN repository_tags ON repository_tags.repository_id = repositories.id").
		Where("repository_tags.tag_id = ?", tagID).
		Preload("Owner").
		Preload("Workspace").
		Order("repositories.created_at desc").
		Find(&repositories).Error; err != nil {
		return nil, err
	}
	return repositories, nil
}

// Workflow tag methods

// AddTagToWorkflow adds a tag to a workflow.
func (d *Database) AddTagToWorkflow(workflowID, tagID uint) error {
	workflowTag := WorkflowTag{
		WorkflowID: workflowID,
		TagID:      tagID,
	}
	return d.Create(&workflowTag).Error
}

// RemoveTagFromWorkflow removes a tag from a workflow.
func (d *Database) RemoveTagFromWorkflow(workflowID, tagID uint) error {
	return d.Where("workflow_id = ? AND tag_id = ?", workflowID, tagID).Delete(&WorkflowTag{}).Error
}

// GetWorkflowTags retrieves all tags for a workflow.
func (d *Database) GetWorkflowTags(workflowID uint) ([]Tag, error) {
	var tags []Tag
	if err := d.Joins("JOIN workflow_tags ON workflow_tags.tag_id = tags.id").
		Where("workflow_tags.workflow_id = ?", workflowID).
		Order("tags.name asc").
		Find(&tags).Error; err != nil {
		return nil, err
	}
	return tags, nil
}

// GetWorkflowsByTag retrieves all workflows that have a specific tag.
func (d *Database) GetWorkflowsByTag(tagID uint) ([]Workflow, error) {
	var workflows []Workflow
	if err := d.Joins("JOIN workflow_tags ON workflow_tags.workflow_id = workflows.id").
		Where("workflow_tags.tag_id = ?", tagID).
		Preload("Owner").
		Preload("Workspace").
		Order("workflows.created_at desc").
		Find(&workflows).Error; err != nil {
		return nil, err
	}
	return workflows, nil
}

// Connection tag methods

// AddTagToConnection adds a tag to a connection.
func (d *Database) AddTagToConnection(connectionID, tagID uint) error {
	connectionTag := ConnectionTag{
		ConnectionID: connectionID,
		TagID:        tagID,
	}
	return d.Create(&connectionTag).Error
}

// RemoveTagFromConnection removes a tag from a connection.
func (d *Database) RemoveTagFromConnection(connectionID, tagID uint) error {
	return d.Where("connection_id = ? AND tag_id = ?", connectionID, tagID).Delete(&ConnectionTag{}).Error
}

// GetConnectionTags retrieves all tags for a connection.
func (d *Database) GetConnectionTags(connectionID uint) ([]Tag, error) {
	var tags []Tag
	if err := d.Joins("JOIN connection_tags ON connection_tags.tag_id = tags.id").
		Where("connection_tags.connection_id = ?", connectionID).
		Order("tags.name asc").
		Find(&tags).Error; err != nil {
		return nil, err
	}
	return tags, nil
}

// GetConnectionsByTag retrieves all connections that have a specific tag.
func (d *Database) GetConnectionsByTag(tagID uint) ([]Connection, error) {
	var connections []Connection
	if err := d.Joins("JOIN connection_tags ON connection_tags.connection_id = connections.id").
		Where("connection_tags.tag_id = ?", tagID).
		Preload("Owner").
		Preload("Workspace").
		Preload("Connector").
		Order("connections.created_at desc").
		Find(&connections).Error; err != nil {
		return nil, err
	}
	return connections, nil
}

// RepositoryObject tag methods

// AddTagToRepositoryObject adds a tag to a repository object.
func (d *Database) AddTagToRepositoryObject(repositoryObjectID, tagID uint) error {
	repositoryObjectTag := RepositoryObjectTag{
		RepositoryObjectID: repositoryObjectID,
		TagID:              tagID,
	}
	return d.Create(&repositoryObjectTag).Error
}

// RemoveTagFromRepositoryObject removes a tag from a repository object.
func (d *Database) RemoveTagFromRepositoryObject(repositoryObjectID, tagID uint) error {
	return d.Where("repository_object_id = ? AND tag_id = ?", repositoryObjectID, tagID).
		Delete(&RepositoryObjectTag{}).
		Error
}

// GetRepositoryObjectTags retrieves all tags for a repository object.
func (d *Database) GetRepositoryObjectTags(repositoryObjectID uint) ([]Tag, error) {
	var tags []Tag
	if err := d.Joins("JOIN repository_object_tags ON repository_object_tags.tag_id = tags.id").
		Where("repository_object_tags.repository_object_id = ?", repositoryObjectID).
		Order("tags.name asc").
		Find(&tags).Error; err != nil {
		return nil, err
	}
	return tags, nil
}

// GetRepositoryObjectsByTag retrieves all repository objects that have a specific tag.
func (d *Database) GetRepositoryObjectsByTag(tagID uint) ([]RepositoryObject, error) {
	var repositoryObjects []RepositoryObject
	if err := d.Joins("JOIN repository_object_tags ON repository_object_tags.repository_object_id = repository_objects.id").
		Where("repository_object_tags.tag_id = ?", tagID).
		Preload("Repository").
		Preload("Parent").
		Preload("Children").
		Order("repository_objects.created_at desc").
		Find(&repositoryObjects).Error; err != nil {
		return nil, err
	}
	return repositoryObjects, nil
}

// GetAllAssetsByTag retrieves all assets associated with a specific tag.
func (d *Database) GetAllAssetsByTag(tagID uint) (*TaggedAssets, error) {
	assets := &TaggedAssets{}

	// Get queries with this tag
	queries, err := d.GetQueriesByTag(tagID)
	if err != nil {
		return nil, err
	}
	assets.Queries = queries

	// Get repositories with this tag
	repositories, err := d.GetRepositoriesByTag(tagID)
	if err != nil {
		return nil, err
	}
	assets.Repositories = repositories

	// Get workflows with this tag
	workflows, err := d.GetWorkflowsByTag(tagID)
	if err != nil {
		return nil, err
	}
	assets.Workflows = workflows

	// Get connections with this tag
	connections, err := d.GetConnectionsByTag(tagID)
	if err != nil {
		return nil, err
	}
	assets.Connections = connections

	// Get repository objects with this tag
	repositoryObjects, err := d.GetRepositoryObjectsByTag(tagID)
	if err != nil {
		return nil, err
	}
	assets.RepositoryObjects = repositoryObjects

	return assets, nil
}

// GetTaggedAssetsCount returns the count of all assets associated with a specific tag.
func (d *Database) GetTaggedAssetsCount(tagID uint) (map[string]int, error) {
	counts := make(map[string]int)

	// Count queries
	var queryCount int64
	if err := d.Model(&QueryTag{}).Where("tag_id = ?", tagID).Count(&queryCount).Error; err != nil {
		return nil, err
	}
	counts["queries"] = int(queryCount)

	// Count repositories
	var repositoryCount int64
	if err := d.Model(&RepositoryTag{}).Where("tag_id = ?", tagID).Count(&repositoryCount).Error; err != nil {
		return nil, err
	}
	counts["repositories"] = int(repositoryCount)

	// Count workflows
	var workflowCount int64
	if err := d.Model(&WorkflowTag{}).Where("tag_id = ?", tagID).Count(&workflowCount).Error; err != nil {
		return nil, err
	}
	counts["workflows"] = int(workflowCount)

	// Count connections
	var connectionCount int64
	if err := d.Model(&ConnectionTag{}).Where("tag_id = ?", tagID).Count(&connectionCount).Error; err != nil {
		return nil, err
	}
	counts["connections"] = int(connectionCount)

	// Count repository objects
	var repositoryObjectCount int64
	if err := d.Model(&RepositoryObjectTag{}).Where("tag_id = ?", tagID).Count(&repositoryObjectCount).Error; err != nil {
		return nil, err
	}
	counts["repository_objects"] = int(repositoryObjectCount)

	return counts, nil
}

// GetTagWithAssets retrieves a tag along with all its associated assets and counts.
func (d *Database) GetTagWithAssets(tagID uint) (*TagWithAssets, error) {
	// Get the tag
	tag, err := d.GetTagByID(tagID)
	if err != nil {
		return nil, err
	}

	// Get all associated assets
	assets, err := d.GetAllAssetsByTag(tagID)
	if err != nil {
		return nil, err
	}

	// Get asset counts
	counts, err := d.GetTaggedAssetsCount(tagID)
	if err != nil {
		return nil, err
	}

	return &TagWithAssets{
		Tag:    *tag,
		Assets: *assets,
		Counts: counts,
	}, nil
}

// GetTagsByWorkspace retrieves all tags for a specific workspace.
func (d *Database) GetTagsByWorkspace(workspaceID uint) ([]Tag, error) {
	var tags []Tag
	if err := d.Where("workspace_id = ?", workspaceID).Order("name asc").Find(&tags).Error; err != nil {
		return nil, err
	}
	return tags, nil
}
