package lib

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/utils"
)

// DecodeSqidBasedOnResourceType decodes a SQID based on the resource type.
func DecodeSqidBasedOnResourceType(
	sqid string,
	resource db.PolicyResource,
	sqidManager *utils.SQIDManager,
) (*uint, error) {
	var id uint64
	var err error

	switch resource {
	case db.PolicyResourceWorkspace:
		id, err = sqidManager.Decode("workspaces", sqid)
	case db.PolicyResourceWorkspaceOwnership:
		id, err = sqidManager.Decode("workspace_ownerships", sqid)
	case db.PolicyResourceWorkflow:
		id, err = sqidManager.Decode("workflows", sqid)
	case db.PolicyResourceConnection:
		id, err = sqidManager.Decode("connections", sqid)
	case db.PolicyResourceRepository:
		id, err = sqidManager.Decode("repositories", sqid)
	case db.PolicyResourceRepositoryObject:
		id, err = sqidManager.Decode("repository_objects", sqid)
	case db.PolicyResourceUser:
		id, err = sqidManager.Decode("users", sqid)
	case db.PolicyResourcePolicy:
		id, err = sqidManager.Decode("policies", sqid)
	case db.PolicyResourceInvite:
		id, err = sqidManager.Decode("invites", sqid)
	case db.PolicyResourceAuditLog:
		id, err = sqidManager.Decode("logs", sqid)
	case db.PolicyResourceEditorScript:
	case db.PolicyResourceDocumentation:
	case db.PolicyResourceBilling:
	default:
		return nil, fmt.Errorf("invalid resource type: %s", resource)
	}

	idUint := uint(id)
	return &idUint, err
}
