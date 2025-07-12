package formatter

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/lib"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminsqids "github.com/IrminData/irmin-sdk-go/sqids"
)

// FormatPolicyResponse formats a single policy into an API response.
func FormatPolicyResponse(policy *db.Policy, sqidManager *irminsqids.SQIDManager) (*irminmodels.Policy, error) {
	// Create the base policy response
	response := &irminmodels.Policy{
		Effect:    irminmodels.PolicyEffect(policy.Effect),
		Action:    irminmodels.PolicyAction(policy.Action),
		Resource:  irminmodels.PolicyResource(policy.Resource),
		Principal: irminmodels.PolicyPrincipal(policy.Principal),
	}

	// Encode the policy ID
	id, err := sqidManager.Encode("policies", uint64(policy.ID))
	if err != nil {
		return nil, err
	}
	response.ID = id

	if policy.ResourceID != nil {
		resourceID, encodeResourceIDErr := lib.EncodePolicyResourceID(
			*policy.ResourceID,
			policy.Resource,
			sqidManager,
		)
		if encodeResourceIDErr != nil {
			return nil, fmt.Errorf("error encoding resource ID: %w", encodeResourceIDErr)
		}
		response.ResourceID = &resourceID
	}
	if policy.Role != nil {
		role, formatRoleErr := FormatRoleResponse(policy.Role, sqidManager)
		if formatRoleErr != nil {
			return nil, formatRoleErr
		}
		response.Role = role
	}
	if policy.WorkspaceUser != nil {
		user, formatUserErr := FormatWorkspaceUserResponse(policy.WorkspaceUser, sqidManager)
		if formatUserErr != nil {
			return nil, formatUserErr
		}
		response.User = user
	}

	return response, nil
}
