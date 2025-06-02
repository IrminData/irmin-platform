package lib_test

import (
	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/tests"
	"irmin-api/utils"
	"testing"

	"github.com/zeebo/assert"
)

func TestDecodePolicyResourceID(t *testing.T) {
	// Initialise the test environment
	env, _, initTestEnvErr := tests.InitTestEnv()
	if initTestEnvErr != nil {
		t.Fatalf("Failed to initialise test environment: %v", initTestEnvErr)
	}

	sqidManager := utils.NewSQIDManager(env)

	testCases := []struct {
		name         string
		resourceType db.PolicyResource
		expectedID   uint
		shouldError  bool
		invalidSQID  bool
		resourceName string
	}{
		{"workspace", db.PolicyResourceWorkspace, 1, false, false, "workspaces"},
		{"query", db.PolicyResourceQuery, 1, false, false, "queries"},
		{"workflow", db.PolicyResourceWorkflow, 1, false, false, "workflows"},
		{"workflow run", db.PolicyResourceWorkflowRun, 1, false, false, "workflows"},
		{"connection", db.PolicyResourceConnection, 1, false, false, "connections"},
		{"repository", db.PolicyResourceRepository, 1, false, false, "repositories"},
		{"repository branch", db.PolicyResourceRepositoryBranch, 1, false, false, "repositories"},
		{"repository tag", db.PolicyResourceRepositoryTag, 1, false, false, "repositories"},
		{"repository commit", db.PolicyResourceRepositoryCommit, 1, false, false, "repositories"},
		{"repository object", db.PolicyResourceRepositoryObject, 1, false, false, "repository_objects"},
		{"user", db.PolicyResourceUser, 1, false, false, "users"},
		{"policy", db.PolicyResourcePolicy, 1, false, false, "policies"},
		{"invite", db.PolicyResourceInvite, 1, false, false, "invites"},
		{"audit log", db.PolicyResourceAuditLog, 1, false, false, "logs"},
		{"invalid sqid", db.PolicyResourceWorkspace, 0, true, true, ""},
		{"editor script", db.PolicyResourceEditorScript, 0, true, false, ""},
		{"documentation", db.PolicyResourceDocumentation, 0, true, false, ""},
		{"billing", db.PolicyResourceBilling, 0, true, false, ""},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			var sqid string
			var err error

			if !tc.invalidSQID {
				sqid, err = sqidManager.Encode(tc.resourceName, 1)
				if err != nil {
					t.Fatalf("Failed to encode SQID: %v", err)
				}
			} else {
				sqid = "invalid"
			}

			id, err := lib.DecodePolicyResourceID(sqid, tc.resourceType, sqidManager)

			if tc.shouldError {
				assert.Error(t, err)
				assert.Nil(t, id)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tc.expectedID, *id)
			}
		})
	}
}
