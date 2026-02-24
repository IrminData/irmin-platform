package db

import (
	"time"

	"gorm.io/gorm"
)

type Workspace struct {
	gorm.Model

	Name        string          `json:"name"`
	Slug        string          `json:"slug"        gorm:"uniqueIndex"`
	Description string          `json:"description"`
	Owner       User            `json:"owner"       gorm:"foreignKey:OwnerID"`
	OwnerID     uint            `json:"owner_id"    gorm:"index"`
	Users       []WorkspaceUser `json:"users"       gorm:"foreignKey:WorkspaceID"`
	Policies    []Policy        `json:"policies"    gorm:"foreignKey:WorkspaceID"`
}

// GetAllWorkspaces retrieves all workspaces from the database.
func (d *Database) GetAllWorkspaces() ([]Workspace, error) {
	var workspaces []Workspace
	if err := d.Find(&workspaces).Error; err != nil {
		return nil, err
	}
	return workspaces, nil
}

// GetWorkspaceBySlug retrieves a workspace by its slug.
func (d *Database) GetWorkspaceBySlug(slug string) (*Workspace, error) {
	var w Workspace
	if err := d.Preload("Owner").Preload("Users.User").Where(&Workspace{Slug: slug}).First(&w).Error; err != nil {
		return nil, err
	}
	return &w, nil
}

// DeleteWorkspace deletes a workspace and the related records.
func (d *Database) DeleteWorkspace(id uint, tx *gorm.DB) error {
	// Delete the workspace.
	if err := tx.Delete(&Workspace{}, id).Error; err != nil {
		return err
	}
	// Delete the workspace users.
	if err := tx.Delete(&WorkspaceUser{}, &WorkspaceUser{WorkspaceID: id}).Error; err != nil {
		return err
	}
	// Delete the workflows
	if err := tx.Delete(&Workflow{}, &Workflow{WorkspaceID: id}).Error; err != nil {
		return err
	}
	// Delete the connections
	if err := tx.Delete(&Connection{}, &Connection{WorkspaceID: id}).Error; err != nil {
		return err
	}
	// Delete the repositories
	if err := tx.Delete(&Repository{}, &Repository{WorkspaceID: id}).Error; err != nil {
		return err
	}
	return nil
}

// WorkspaceSummaryRow represents the raw result of the workspace summary query.
type WorkspaceSummaryRow struct {
	Workspace
	MemberCount     int        `json:"member_count"`
	RepositoryCount int        `json:"repository_count"`
	WorkflowCount   int        `json:"workflow_count"`
	ConnectionCount int        `json:"connection_count"`
	LastAccessedAt  *time.Time `json:"last_accessed_at"`
}

// GetWorkspaceSummaries retrieves lightweight workspace summaries with resource counts
// for a given user. Uses lateral joins for efficient per-workspace counting.
func (d *Database) GetWorkspaceSummaries(userID uint) ([]WorkspaceSummaryRow, error) {
	var summaries []WorkspaceSummaryRow

	err := d.Raw(`
		SELECT w.*,
			COALESCE(mc.cnt, 0) as member_count,
			COALESCE(rc.cnt, 0) as repository_count,
			COALESCE(wc.cnt, 0) as workflow_count,
			COALESCE(cc.cnt, 0) as connection_count,
			wu.last_accessed_at
		FROM workspaces w
		JOIN workspace_users wu ON wu.workspace_id = w.id AND wu.user_id = ? AND wu.deleted_at IS NULL
		LEFT JOIN LATERAL (
			SELECT COUNT(*) AS cnt FROM workspace_users WHERE workspace_id = w.id AND deleted_at IS NULL
		) mc ON true
		LEFT JOIN LATERAL (
			SELECT COUNT(*) AS cnt FROM repositories WHERE workspace_id = w.id AND deleted_at IS NULL
		) rc ON true
		LEFT JOIN LATERAL (
			SELECT COUNT(*) AS cnt FROM workflows WHERE workspace_id = w.id AND deleted_at IS NULL
		) wc ON true
		LEFT JOIN LATERAL (
			SELECT COUNT(*) AS cnt FROM connections WHERE workspace_id = w.id AND deleted_at IS NULL
		) cc ON true
		WHERE w.deleted_at IS NULL
		ORDER BY wu.last_accessed_at DESC NULLS LAST, w.created_at DESC
	`, userID).Scan(&summaries).Error

	if err != nil {
		return nil, err
	}

	// Preload Owner for each workspace via a single batched query
	ownerIDs := make([]uint, 0, len(summaries))
	for _, s := range summaries {
		ownerIDs = append(ownerIDs, s.OwnerID)
	}

	if len(ownerIDs) > 0 {
		var owners []User
		if ownerErr := d.Where("id IN ?", ownerIDs).Find(&owners).Error; ownerErr != nil {
			return nil, ownerErr
		}

		ownerMap := make(map[uint]User, len(owners))
		for _, owner := range owners {
			ownerMap[owner.ID] = owner
		}

		for i := range summaries {
			if owner, ok := ownerMap[summaries[i].OwnerID]; ok {
				summaries[i].Owner = owner
			}
		}
	}

	return summaries, nil
}
