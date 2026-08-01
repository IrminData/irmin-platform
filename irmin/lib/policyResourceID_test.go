package lib_test

import (
	"irmin-api/db"
	"irmin-api/lib"
	"testing"

	irminsqids "github.com/IrminData/irmin-platform/sdks/go/sqids"
	"github.com/zeebo/assert"
)

func TestDecodePolicyResourceID(t *testing.T) {
	ts := lib.GetTestSuite()
	sqidManager := irminsqids.NewSQIDManager(ts.Env.SqidAlphabet)

	testCases := []struct {
		name         string
		resourceType db.PolicyResource
		expectedID   uint
		shouldError  bool
		invalidSQID  bool
		resourceName string
	}{
		{"workspace", db.PolicyResourceWorkspace, 0, true, false, ""},
		{"query", db.PolicyResourceQuery, 1, false, false, "queries"},
		{"workflow", db.PolicyResourceWorkflow, 1, false, false, "workflows"},
		{"workflow run", db.PolicyResourceWorkflowRun, 1, false, false, "workflows"},
		{"connection", db.PolicyResourceConnection, 1, false, false, "connections"},
		{"repository", db.PolicyResourceRepository, 1, false, false, "repositories"},
		{"repository branch", db.PolicyResourceRepositoryBranch, 1, false, false, "repositories"},
		{"repository tag", db.PolicyResourceRepositoryTag, 1, false, false, "repositories"},
		{"repository commit", db.PolicyResourceRepositoryCommit, 1, false, false, "repositories"},
		{"repository object", db.PolicyResourceRepositoryObject, 1, false, false, "repositories"},
		{"script", db.PolicyResourceScript, 1, false, false, "scripts"},
		{"user", db.PolicyResourceUser, 1, false, false, "users"},
		{"policy", db.PolicyResourcePolicy, 1, true, false, ""},
		{"invite", db.PolicyResourceInvite, 1, true, false, ""},
		{"audit log", db.PolicyResourceAuditLog, 1, true, false, ""},
		{"invalid sqid", db.PolicyResourceWorkspace, 0, true, true, ""},
		{"documentation", db.PolicyResourceDocumentation, 0, true, false, ""},
		{"billing", db.PolicyResourceBilling, 0, true, false, ""},
		{"ai application", db.PolicyResourceAIApplication, 0, true, false, ""},
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

func TestEncodePolicyResourceID(t *testing.T) {
	ts := lib.GetTestSuite()
	sqidManager := irminsqids.NewSQIDManager(ts.Env.SqidAlphabet)

	testCases := []struct {
		name         string
		resourceType db.PolicyResource
		id           uint
		shouldError  bool
		resourceName string
	}{
		{"workspace", db.PolicyResourceWorkspace, 0, true, ""},
		{"query", db.PolicyResourceQuery, 1, false, "queries"},
		{"workflow", db.PolicyResourceWorkflow, 1, false, "workflows"},
		{"workflow run", db.PolicyResourceWorkflowRun, 1, false, "workflows"},
		{"connection", db.PolicyResourceConnection, 1, false, "connections"},
		{"repository", db.PolicyResourceRepository, 1, false, "repositories"},
		{"repository branch", db.PolicyResourceRepositoryBranch, 1, false, "repositories"},
		{"repository tag", db.PolicyResourceRepositoryTag, 1, false, "repositories"},
		{"repository commit", db.PolicyResourceRepositoryCommit, 1, false, "repositories"},
		{"repository object", db.PolicyResourceRepositoryObject, 1, false, "repositories"},
		{"user", db.PolicyResourceUser, 1, false, "users"},
		{"policy", db.PolicyResourcePolicy, 1, true, ""},
		{"invite", db.PolicyResourceInvite, 1, true, ""},
		{"audit log", db.PolicyResourceAuditLog, 1, true, ""},
		{"script", db.PolicyResourceScript, 1, false, "scripts"},
		{"documentation", db.PolicyResourceDocumentation, 1, true, ""},
		{"billing", db.PolicyResourceBilling, 1, true, ""},
		{"ai application", db.PolicyResourceAIApplication, 1, false, "ai_applications"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			sqid, err := lib.EncodePolicyResourceID(tc.id, tc.resourceType, sqidManager)

			if tc.shouldError {
				assert.Error(t, err)
				assert.Equal(t, "", sqid)
			} else {
				assert.NoError(t, err)
				assert.NotEqual(t, "", sqid)

				// Verify that decoding the encoded SQID gives us back the original ID
				decodedID, decodeErr := lib.DecodePolicyResourceID(sqid, tc.resourceType, sqidManager)
				assert.NoError(t, decodeErr)
				assert.Equal(t, tc.id, *decodedID)

				// Verify that the SQID was encoded with the correct resource name
				expectedSQID, encodeErr := sqidManager.Encode(tc.resourceName, uint64(tc.id))
				assert.NoError(t, encodeErr)
				assert.Equal(t, expectedSQID, sqid)
			}
		})
	}
}

// TestEncodeDecodeRoundTrip tests that encoding and decoding work correctly together.
func TestEncodeDecodeRoundTrip(t *testing.T) {
	ts := lib.GetTestSuite()
	sqidManager := irminsqids.NewSQIDManager(ts.Env.SqidAlphabet)

	// Test resources that should support encoding/decoding
	validResources := []db.PolicyResource{
		db.PolicyResourceQuery,
		db.PolicyResourceWorkflow,
		db.PolicyResourceWorkflowRun,
		db.PolicyResourceConnection,
		db.PolicyResourceRepository,
		db.PolicyResourceRepositoryObject,
		db.PolicyResourceRepositoryBranch,
		db.PolicyResourceRepositoryTag,
		db.PolicyResourceRepositoryCommit,
		db.PolicyResourceUser,
		db.PolicyResourceAIApplication,
	}

	for _, resource := range validResources {
		t.Run(string(resource), func(t *testing.T) {
			originalID := uint(123)

			// Encode
			sqid, err := lib.EncodePolicyResourceID(originalID, resource, sqidManager)
			assert.NoError(t, err)
			assert.NotEqual(t, "", sqid)

			// Decode
			decodedID, err := lib.DecodePolicyResourceID(sqid, resource, sqidManager)
			assert.NoError(t, err)
			assert.Equal(t, originalID, *decodedID)
		})
	}
}
