package lib

import (
	"errors"
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
		return nil, errors.New("workspaces don't need ID specific policies, since policies are workspace scoped")
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
		id, err = sqidManager.Decode("repositories", sqid) // Object policies point to a repository
	case db.PolicyResourceRepositoryBranch:
		id, err = sqidManager.Decode("repositories", sqid) // Branch policies point to a repository
	case db.PolicyResourceRepositoryTag:
		id, err = sqidManager.Decode("repositories", sqid) // Tag policies point to a repository
	case db.PolicyResourceWorkspaceTag:
		id, err = sqidManager.Decode("tags", sqid)
	case db.PolicyResourceRepositoryCommit:
		id, err = sqidManager.Decode("repositories", sqid) // Commit policies point to a repository
	case db.PolicyResourceUser:
		id, err = sqidManager.Decode("users", sqid)
	case db.PolicyResourcePolicy:
		return nil, errors.New("policies don't need ID specific policies")
	case db.PolicyResourceInvite:
		return nil, errors.New("invites don't need ID specific policies")
	case db.PolicyResourceAuditLog:
		return nil, errors.New("audit logs don't need ID specific policies")
	case db.PolicyResourceEditorScript:
		return nil, errors.New("editor scripts don't need ID specific policies")
	case db.PolicyResourceDocumentation:
		return nil, errors.New("documentation doesn't need ID specific policies")
	case db.PolicyResourceBilling:
		return nil, errors.New("billing doesn't need ID specific policies")
	default:
		return nil, fmt.Errorf("invalid resource type: %s", resource)
	}

	if err != nil {
		return nil, err
	}

	idUint := uint(id)
	return &idUint, nil
}

// EncodePolicyResourceID encodes an ID into a SQID based on the resource type for policy resources.
func EncodePolicyResourceID(
	id uint,
	resource db.PolicyResource,
	sqidManager *utils.SQIDManager,
) (string, error) {
	switch resource {
	case db.PolicyResourceWorkspace:
		return "", errors.New("workspaces don't need ID specific policies, since policies are workspace scoped")
	case db.PolicyResourceQuery:
		return sqidManager.Encode("queries", uint64(id))
	case db.PolicyResourceWorkflow:
		return sqidManager.Encode("workflows", uint64(id))
	case db.PolicyResourceWorkflowRun:
		return sqidManager.Encode("workflows", uint64(id)) // Workflow run policies point to a workflow
	case db.PolicyResourceConnection:
		return sqidManager.Encode("connections", uint64(id))
	case db.PolicyResourceRepository:
		return sqidManager.Encode("repositories", uint64(id))
	case db.PolicyResourceRepositoryObject:
		return sqidManager.Encode("repositories", uint64(id)) // Object policies point to a repository
	case db.PolicyResourceRepositoryBranch:
		return sqidManager.Encode("repositories", uint64(id)) // Branch policies point to a repository
	case db.PolicyResourceRepositoryTag:
		return sqidManager.Encode("repositories", uint64(id)) // Tag policies point to a repository
	case db.PolicyResourceWorkspaceTag:
		return sqidManager.Encode("tags", uint64(id))
	case db.PolicyResourceRepositoryCommit:
		return sqidManager.Encode("repositories", uint64(id)) // Commit policies point to a repository
	case db.PolicyResourceUser:
		return sqidManager.Encode("users", uint64(id))
	case db.PolicyResourcePolicy:
		return "", errors.New("policies don't need ID specific policies")
	case db.PolicyResourceInvite:
		return "", errors.New("invites don't need ID specific policies")
	case db.PolicyResourceAuditLog:
		return "", errors.New("audit logs don't need ID specific policies")
	case db.PolicyResourceEditorScript:
		return "", errors.New("editor scripts don't need ID specific policies")
	case db.PolicyResourceDocumentation:
		return "", errors.New("documentation doesn't need ID specific policies")
	case db.PolicyResourceBilling:
		return "", errors.New("billing doesn't need ID specific policies")
	default:
		return "", fmt.Errorf("invalid resource type: %s", resource)
	}
}
