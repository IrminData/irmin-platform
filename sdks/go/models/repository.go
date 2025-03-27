package irminModels

import "time"

// BranchGarbageCollectionRules represents the garbage collection rules for a branch.
type BranchGarbageCollectionRules struct {
	BranchID      string `json:"branch_id"`
	RetentionDays int    `json:"retention_days"`
}

// GarbageCollectionRules represents the garbage collection rules for a repository.
type GarbageCollectionRules struct {
	DefaultRetentionDays int                            `json:"default_retention_days,omitempty"`
	Branches             []BranchGarbageCollectionRules `json:"branches,omitempty"`
}

type Repository struct {
	ID                     string                  `json:"id"`
	Name                   string                  `json:"name"`
	Slug                   string                  `json:"slug"`
	Description            string                  `json:"description"`
	Documentation          string                  `json:"documentation"`
	IsImmutable            bool                    `json:"is_immutable"`
	DefaultBranch          string                  `json:"default_branch"`
	Owner                  User                    `json:"owner"`
	GarbageCollectionRules *GarbageCollectionRules `json:"garbage_collection_rules,omitempty"`
	CreatedAt              time.Time               `json:"created_at"`
	UpdatedAt              time.Time               `json:"updated_at"`
}
