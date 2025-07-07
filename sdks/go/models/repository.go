package irminmodels

import "time"

// BranchGarbageCollectionRules represents the garbage collection rules for a branch.
type BranchGarbageCollectionRules struct {
	BranchID      string `json:"branch_id"      validate:"required,validslug"`
	RetentionDays int    `json:"retention_days" validate:"required,min=1,max=3650"`
}

// GarbageCollectionRules represents the garbage collection rules for a repository.
type GarbageCollectionRules struct {
	DefaultRetentionDays int                            `json:"default_retention_days,omitempty" validate:"min=1,max=3650"`
	Branches             []BranchGarbageCollectionRules `json:"branches,omitempty"               validate:"dive"`
}

type Repository struct {
	ID                     string                  `json:"id"                                 validate:"required,validsqid=repositories"`
	Name                   string                  `json:"name"                               validate:"required,min=1,max=100"`
	Slug                   string                  `json:"slug"                               validate:"required,validslug"`
	Description            string                  `json:"description"                        validate:"max=500"`
	Documentation          string                  `json:"documentation"`
	IsImmutable            bool                    `json:"is_immutable"`
	DefaultBranch          string                  `json:"default_branch"                     validate:"required,validslug"`
	Owner                  User                    `json:"owner"                              validate:"required"`
	Tags                   []Tag                   `json:"tags,omitempty"                     validate:"dive"`
	GarbageCollectionRules *GarbageCollectionRules `json:"garbage_collection_rules,omitempty"`
	CreatedAt              time.Time               `json:"created_at"                         validate:"required"`
	UpdatedAt              time.Time               `json:"updated_at"                         validate:"required"`
}
