package formatter

import (
	"irmin-api/db"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// FormatPolicyResponse formats a single policy into an API response.
func FormatPolicyResponse(policy *db.Policy, sqidManager *utils.SQIDManager) (*irminmodels.Policy, error) {
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
		resourceID, encodeResourceIDErr := sqidManager.Encode("resources", uint64(*policy.ResourceID))
		if encodeResourceIDErr != nil {
			return nil, encodeResourceIDErr
		}
		response.ResourceID = &resourceID
	}
	if policy.RoleID != nil {
		roleID, encodeRoleIDErr := sqidManager.Encode("roles", uint64(*policy.RoleID))
		if encodeRoleIDErr != nil {
			return nil, encodeRoleIDErr
		}
		response.RoleID = &roleID
	}
	if policy.WorkspaceUserID != nil {
		userID, encodeUserIDErr := sqidManager.Encode("users", uint64(*policy.WorkspaceUserID))
		if encodeUserIDErr != nil {
			return nil, encodeUserIDErr
		}
		response.WorkspaceUserID = &userID
	}
	if policy.WorkspaceID != nil {
		workspaceID, encodeWorkspaceIDErr := sqidManager.Encode("workspaces", uint64(*policy.WorkspaceID))
		if encodeWorkspaceIDErr != nil {
			return nil, encodeWorkspaceIDErr
		}
		response.WorkspaceID = &workspaceID
	}

	return response, nil
}
