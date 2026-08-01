package utils

import (
	"errors"
	"fmt"
	"strconv"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

// GarbageCollectionSettings represents the garbage collection configuration.
type GarbageCollectionSettings struct {
	DefaultRetentionDays       *int
	DefaultBranchRetentionDays *int
}

// ParseGarbageCollectionSettings parses garbage collection settings from form fields.
func ParseGarbageCollectionSettings(fields map[string]string) (*GarbageCollectionSettings, error) {
	var settings GarbageCollectionSettings

	if fields["garbage_default_retention_days"] != "" {
		days, err := strconv.Atoi(fields["garbage_default_retention_days"])
		if err != nil {
			return nil, fmt.Errorf("error parsing garbage_default_retention_days: %w", err)
		}
		settings.DefaultRetentionDays = &days
	}

	if fields["garbage_default_branch_retention_days"] != "" {
		days, err := strconv.Atoi(fields["garbage_default_branch_retention_days"])
		if err != nil {
			return nil, fmt.Errorf("error parsing garbage_default_branch_retention_days: %w", err)
		}
		settings.DefaultBranchRetentionDays = &days
	}

	return &settings, nil
}

// GetDefaultBranchRetentionDays gets the retention days for the default branch from existing rules.
func GetDefaultBranchRetentionDays(branchRules []irminmodels.BranchGarbageCollectionRules, defaultBranch string) *int {
	for _, rule := range branchRules {
		if rule.BranchID == defaultBranch {
			return &rule.RetentionDays
		}
	}
	return nil
}

// ValidateGarbageCollectionSettings validates the garbage collection settings.
func ValidateGarbageCollectionSettings(settings *GarbageCollectionSettings) error {
	if settings.DefaultRetentionDays != nil && *settings.DefaultRetentionDays < 0 {
		return errors.New("default retention days cannot be negative")
	}
	if settings.DefaultBranchRetentionDays != nil && *settings.DefaultBranchRetentionDays < 0 {
		return errors.New("default branch retention days cannot be negative")
	}
	return nil
}
