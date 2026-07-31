package irminmodels

import "time"

// BranchGarbageCollectionRules represents the garbage collection rules for a branch.
type BranchGarbageCollectionRules struct {
	BranchID      string `json:"branch_id"      validate:"required,validslug"      example:"main"`
	RetentionDays int    `json:"retention_days" validate:"required,gte=0,lte=3650" example:"30"`
}

// GarbageCollectionRules represents the garbage collection rules for a repository.
type GarbageCollectionRules struct {
	DefaultRetentionDays *int                           `json:"default_retention_days,omitempty" example:"90"`
	Branches             []BranchGarbageCollectionRules `json:"branches,omitempty"                            validate:"dive"`
}

type Repository struct {
	ID                     string                  `json:"id"                                 validate:"required,validsqid=repositories" example:"repo_8x2m9k4n7p5q"`
	Name                   string                  `json:"name"                               validate:"required,max=100"                example:"Customer Analytics"`
	Slug                   string                  `json:"slug"                               validate:"required,validslug"              example:"customer-analytics"`
	Description            string                  `json:"description"                        validate:"max=500"                         example:"Customer data analysis and reporting repository"`
	Documentation          string                  `json:"documentation"                      validate:"validdocumentation"              example:"# Customer Analytics Repository. ## This repository contains customer data for analysis..."`
	IsImmutable            bool                    `json:"is_immutable"                                                                  example:"false"`
	DefaultBranch          string                  `json:"default_branch"                     validate:"required,validslug"              example:"main"`
	Owner                  User                    `json:"owner"                              validate:"required"`
	Tags                   []Tag                   `json:"tags,omitempty"                     validate:"dive"`
	GarbageCollectionRules *GarbageCollectionRules `json:"garbage_collection_rules,omitempty"`
	CreatedAt              time.Time               `json:"created_at"                         validate:"required"                        example:"2025-01-15T10:30:00Z"`
	UpdatedAt              time.Time               `json:"updated_at"                         validate:"required"                        example:"2025-12-01T14:22:30Z"`
}
