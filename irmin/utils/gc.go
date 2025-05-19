package utils

import (
	"errors"
	"fmt"
	"strconv"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// GarbageCollectionSettings represents the garbage collection configuration.
type GarbageCollectionSettings struct {
	DefaultRetentionDays       int
	DefaultBranchRetentionDays int
}

// ParseGarbageCollectionSettings parses garbage collection settings from form fields.
func ParseGarbageCollectionSettings(fields map[string]string) (*GarbageCollectionSettings, error) {
	var settings GarbageCollectionSettings
	var err error

	if fields["garbage_default_retention_days"] != "" {
		settings.DefaultRetentionDays, err = strconv.Atoi(fields["garbage_default_retention_days"])
		if err != nil {
			return nil, fmt.Errorf("error parsing garbage_default_retention_days: %w", err)
		}
	}

	if fields["garbage_default_branch_retention_days"] != "" {
		settings.DefaultBranchRetentionDays, err = strconv.Atoi(fields["garbage_default_branch_retention_days"])
		if err != nil {
			return nil, fmt.Errorf("error parsing garbage_default_branch_retention_days: %w", err)
		}
	}

	return &settings, nil
}

// GetDefaultBranchRetentionDays gets the retention days for the default branch from existing rules.
func GetDefaultBranchRetentionDays(branchRules []irminmodels.BranchGarbageCollectionRules, defaultBranch string) int {
	for _, rule := range branchRules {
		if rule.BranchID == defaultBranch {
			return rule.RetentionDays
		}
	}
	return 0
}

// ValidateGarbageCollectionSettings validates the garbage collection settings.
func ValidateGarbageCollectionSettings(settings *GarbageCollectionSettings) error {
	if settings.DefaultRetentionDays < 0 {
		return errors.New("default retention days cannot be negative")
	}
	if settings.DefaultBranchRetentionDays < 0 {
		return errors.New("default branch retention days cannot be negative")
	}
	return nil
}
