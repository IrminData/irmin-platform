package lib

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/utils"
)

// DecodePolicyResourceID decodes a SQID based on the resource type for policy resources.
func DecodePolicyResourceID(
	sqid string,
	resource db.PolicyResource,
	sqidManager *utils.SQIDManager,
) (*uint, error) {
	var id uint64
	var err error

	switch resource {
	case db.PolicyResourceWorkspace:
		id, err = sqidManager.Decode("workspaces", sqid)
	case db.PolicyResourceQuery:
		id, err = sqidManager.Decode("queries", sqid)
	case db.PolicyResourceWorkflow:
		id, err = sqidManager.Decode("workflows", sqid)
	case db.PolicyResourceWorkflowRun:
		id, err = sqidManager.Decode("workflows", sqid) // Workflow run policies point to a workflow
	case db.PolicyResourceConnection:
		id, err = sqidManager.Decode("connections", sqid)
	case db.PolicyResourceRepository:
		id, err = sqidManager.Decode("repositories", sqid)
	case db.PolicyResourceRepositoryObject:
		id, err = sqidManager.Decode("repository_objects", sqid)
	case db.PolicyResourceRepositoryBranch:
		id, err = sqidManager.Decode("repositories", sqid) // Branch policies point to a repository
	case db.PolicyResourceRepositoryTag:
		id, err = sqidManager.Decode("repositories", sqid) // Tag policies point to a repository
	case db.PolicyResourceRepositoryCommit:
		id, err = sqidManager.Decode("repositories", sqid) // Commit policies point to a repository
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
