package tests

import (
	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

// HasCapability checks if a connector has a specific capability.
func HasCapability(capabilities []irminmodels.ConnectorCapability, capability string) bool {
	capabilityMap := map[string]irminmodels.ConnectorCapability{
		"pull":        irminmodels.ConnectorCapabilityPull,
		"push":        irminmodels.ConnectorCapabilityPush,
		"apply_patch": irminmodels.ConnectorCapabilityApplyPatch,
		"patch_event": irminmodels.ConnectorCapabilityPatchEvent,
	}

	targetCap, exists := capabilityMap[capability]
	if !exists {
		return false
	}

	for _, cap := range capabilities {
		if cap == targetCap {
			return true
		}
	}

	return false
}
