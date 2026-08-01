package lib_test

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/utils"
	"log/slog"
	"os"
	"testing"
	"time"

	irminsqids "github.com/IrminData/irmin-platform/sdks/go/sqids"
	"github.com/zeebo/assert"
)

// InviteNotificationTestCleanupData holds references to test data that needs cleanup.
type InviteNotificationTestCleanupData struct {
	Users      []*db.User
	Workspaces []*db.Workspace
	Invites    []*db.Invite
}

// cleanupAllTestData removes all test data from the database.
func cleanupAllTestData(t *testing.T, ts *lib.TestSuite, cleanup *InviteNotificationTestCleanupData) {
	// Clean up invites first (they depend on users and workspaces)
	cleanupInvites(t, ts, cleanup.Invites)
	// Clean up users
	cleanupUsers(t, ts, cleanup.Users)
	// Clean up workspaces
	cleanupWorkspaces(t, ts, cleanup.Workspaces)
}

// cleanupInvites removes invite records from the database.
func cleanupInvites(t *testing.T, ts *lib.TestSuite, invites []*db.Invite) {
	for _, invite := range invites {
		if invite != nil && invite.ID != 0 {
			if err := ts.DB.Delete(invite).Error; err != nil {
				t.Logf("Warning: Failed to cleanup test invite ID %d: %v", invite.ID, err)
			}
		}
	}
}

// cleanupUsers removes user records from the database.
func cleanupUsers(t *testing.T, ts *lib.TestSuite, users []*db.User) {
	for _, user := range users {
		if user != nil && user.ID != 0 {
			if err := ts.DB.Delete(user).Error; err != nil {
				t.Logf("Warning: Failed to cleanup test user ID %d: %v", user.ID, err)
			}
		}
	}
}

// cleanupWorkspaces removes workspace records from the database.
func cleanupWorkspaces(t *testing.T, ts *lib.TestSuite, workspaces []*db.Workspace) {
	for _, workspace := range workspaces {
		if workspace != nil && workspace.ID != 0 {
			if err := ts.DB.Delete(workspace).Error; err != nil {
				t.Logf("Warning: Failed to cleanup test workspace ID %d: %v", workspace.ID, err)
			}
		}
	}
}

// createTestUser creates a test user for invitation testing and returns it.
func createTestUser(t *testing.T, ts *lib.TestSuite, email string) *db.User {
	user := &db.User{
		ClerkID:   fmt.Sprintf("test-clerk-%d", time.Now().UnixNano()),
		Email:     email,
		FirstName: "Test",
		LastName:  "User",
	}

	err := ts.DB.Create(user).Error
	if err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	return user
}

// createTestUserWithNovuID creates a test user with a Novu subscriber ID.
func createTestUserWithNovuID(t *testing.T, ts *lib.TestSuite, email string) *db.User {
	user := &db.User{
		ClerkID:          fmt.Sprintf("test-clerk-%d", time.Now().UnixNano()),
		NovuSubscriberID: fmt.Sprintf("novu-subscriber-%d", time.Now().UnixNano()),
		Email:            email,
		FirstName:        "Test",
		LastName:         "User",
	}

	err := ts.DB.Create(user).Error
	if err != nil {
		t.Fatalf("Failed to create test user with Novu ID: %v", err)
	}

	return user
}

// createTestWorkspace creates a test workspace and returns it.
func createTestWorkspace(t *testing.T, ts *lib.TestSuite, slug string, ownerID uint) *db.Workspace {
	workspace := &db.Workspace{
		Name:    "Test Workspace for Invitations",
		Slug:    slug,
		OwnerID: ownerID,
	}

	err := ts.DB.Create(workspace).Error
	if err != nil {
		t.Fatalf("Failed to create test workspace: %v", err)
	}

	return workspace
}

// createTestInvite creates a test invitation and returns it.
func createTestInvite(
	t *testing.T,
	ts *lib.TestSuite,
	email string,
	workspaceID uint,
	inviterID uint,
	roleID uint,
) *db.Invite {
	invite := &db.Invite{
		Email:       email,
		WorkspaceID: workspaceID,
		InvitedByID: inviterID,
		RoleID:      roleID,
		ExpiresAt:   time.Now().Add(7 * 24 * time.Hour),
	}

	err := ts.DB.Create(invite).Error
	if err != nil {
		t.Fatalf("Failed to create test invite: %v", err)
	}

	return invite
}

// getTestRole gets a test role (viewer role) from the database.
func getTestRole(t *testing.T, ts *lib.TestSuite) *db.Role {
	role, err := ts.DB.GetDefaultRole()
	if err != nil {
		t.Fatalf("Failed to get default role: %v", err)
	}
	return role
}

// createSelfContainedInviteNotificationParams creates test parameters with all required test data.
func createSelfContainedInviteNotificationParams(
	t *testing.T,
	ts *lib.TestSuite,
	inviteeEmail string,
) (lib.InviteNotificationParams, *InviteNotificationTestCleanupData) {
	cleanup := &InviteNotificationTestCleanupData{}

	// Create test user (the one sending the invite)
	testUser := createTestUser(t, ts, fmt.Sprintf("test-inviter-%d@example.com", time.Now().UnixNano()))
	cleanup.Users = append(cleanup.Users, testUser)

	// Create test workspace
	testWorkspace := createTestWorkspace(t, ts, fmt.Sprintf("test-workspace-%d", time.Now().UnixNano()), testUser.ID)
	cleanup.Workspaces = append(cleanup.Workspaces, testWorkspace)

	// Get test role
	testRole := getTestRole(t, ts)

	// Create test invite with proper foreign keys
	testInvite := createTestInvite(t, ts, inviteeEmail, testWorkspace.ID, testUser.ID, testRole.ID)
	cleanup.Invites = append(cleanup.Invites, testInvite)

	params := lib.InviteNotificationParams{
		Invite:              testInvite,
		Workspace:           testWorkspace,
		InvitedBy:           testUser,
		Role:                testRole,
		InviteAcceptanceURL: "https://console.irmin.dev/invite/test123",
		Locale:              "en",
	}

	return params, cleanup
}

// createInviteNotificationParams creates test parameters using existing test environment data.
func createInviteNotificationParams(
	t *testing.T,
	ts *lib.TestSuite,
	inviteeEmail string,
) (lib.InviteNotificationParams, *InviteNotificationTestCleanupData) {
	cleanup := &InviteNotificationTestCleanupData{}

	// Try to use existing test environment data, fall back to self-contained if not available
	if ts.Env.TestUserEmail == "" || ts.Env.TestWorkspace == "" {
		t.Logf("Test environment not fully configured, creating self-contained test data")
		return createSelfContainedInviteNotificationParams(t, ts, inviteeEmail)
	}

	// Get test user (the one sending the invite)
	testUser, err := ts.DB.GetUserByEmail(ts.Env.TestUserEmail)
	if err != nil {
		t.Logf("Failed to get test user from environment, creating self-contained test data: %v", err)
		return createSelfContainedInviteNotificationParams(t, ts, inviteeEmail)
	}

	// Get test workspace
	testWorkspace, err := ts.DB.GetWorkspaceBySlug(ts.Env.TestWorkspace)
	if err != nil {
		t.Logf("Failed to get test workspace from environment, creating self-contained test data: %v", err)
		return createSelfContainedInviteNotificationParams(t, ts, inviteeEmail)
	}

	// Get test role
	testRole := getTestRole(t, ts)

	// Create test invite with proper foreign keys
	testInvite := createTestInvite(t, ts, inviteeEmail, testWorkspace.ID, testUser.ID, testRole.ID)
	cleanup.Invites = append(cleanup.Invites, testInvite)

	params := lib.InviteNotificationParams{
		Invite:              testInvite,
		Workspace:           testWorkspace,
		InvitedBy:           testUser,
		Role:                testRole,
		InviteAcceptanceURL: "https://console.irmin.dev/invite/test123",
		Locale:              "en",
	}

	return params, cleanup
}

func TestInviteNotificationResult_Struct(t *testing.T) {
	result := &lib.InviteNotificationResult{
		Success:        true,
		Method:         "novu",
		Message:        "Notification sent via Novu",
		NotificationID: "test-notification-123",
		Error:          "",
	}

	assert.Equal(t, result.Success, true)
	assert.Equal(t, result.Method, "novu")
	assert.Equal(t, result.Message, "Notification sent via Novu")
	assert.Equal(t, result.NotificationID, "test-notification-123")
	assert.Equal(t, result.Error, "")
}

func TestSendNovuInviteNotification_UserNotFound(t *testing.T) {
	ts := lib.GetTestSuite()
	if ts == nil {
		t.Skip("Test suite not initialized")
	}

	ctx := t.Context()

	// Use an email that definitely doesn't exist in the test database
	nonExistentEmail := "definitely-not-existing-user-12345@example.com"

	// Create self-contained test data
	params, cleanup := createSelfContainedInviteNotificationParams(t, ts, nonExistentEmail)
	defer cleanupAllTestData(t, ts, cleanup)

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelError,
	}))

	// Create SQID manager
	sqidManager := &irminsqids.SQIDManager{}

	result, err := lib.SendNovuInviteNotification(ctx, ts.DB, sqidManager, ts.Env, logger, params)

	assert.Equal(t, err, nil) // Should handle gracefully
	assert.NotEqual(t, result, nil)
	assert.Equal(t, result.Success, false)
	assert.Equal(t, result.Method, "novu")
	assert.Equal(t, result.Message, "User not found in system for Novu notification")
}

func TestSendNovuInviteNotification_ExistingUser(t *testing.T) {
	ts := lib.GetTestSuite()
	if ts == nil {
		t.Skip("Test suite not initialized")
	}

	// Skip if no Novu key is configured
	if ts.Env.NovuSecretKey == "" {
		t.Skip("Novu secret key not configured")
	}

	ctx := t.Context()

	// Create a test user in the database first
	testInviteeEmail := "test-invitee-novu@example.com"
	testInvitee := createTestUser(t, ts, testInviteeEmail)

	params, cleanup := createSelfContainedInviteNotificationParams(t, ts, testInviteeEmail)
	cleanup.Users = append(cleanup.Users, testInvitee) // Add the additional user to cleanup
	defer cleanupAllTestData(t, ts, cleanup)

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelError,
	}))

	// Create SQID manager
	sqidManager := &irminsqids.SQIDManager{}

	result, err := lib.SendNovuInviteNotification(ctx, ts.DB, sqidManager, ts.Env, logger, params)

	// This might fail if the user is not actually subscribed in Novu
	// but at least we can test that the user lookup worked
	assert.Equal(t, err, nil)
	assert.NotEqual(t, result, nil)
	assert.Equal(t, result.Method, "novu")

	// The result might be success or failure depending on Novu subscription status
	// but it should not be the "user not found" error
	if !result.Success {
		assert.NotEqual(t, result.Message, "User not found in system for Novu notification")
	}
}

func TestInviteNotificationParams_Validation(t *testing.T) {
	ts := lib.GetTestSuite()
	if ts == nil {
		t.Skip("Test suite not initialized")
	}

	inviteeEmail := "test-validation@example.com"
	params, cleanup := createInviteNotificationParams(t, ts, inviteeEmail)
	defer cleanupAllTestData(t, ts, cleanup)

	// Verify all required fields are present and valid
	assert.NotEqual(t, params.Invite, nil)
	assert.NotEqual(t, params.Workspace, nil)
	assert.NotEqual(t, params.InvitedBy, nil)
	assert.NotEqual(t, params.Role, nil)
	assert.NotEqual(t, params.InviteAcceptanceURL, "")
	assert.NotEqual(t, params.Locale, "")

	// Verify field values
	assert.Equal(t, params.Invite.Email, inviteeEmail)
	assert.NotEqual(t, params.Workspace.Slug, "")
	assert.NotEqual(t, params.InvitedBy.Email, "")
	assert.NotEqual(t, params.Role.Role, "")
	assert.Equal(t, params.InviteAcceptanceURL, "https://console.irmin.dev/invite/test123")
	assert.Equal(t, params.Locale, "en")
}

func TestInviteNotificationParams_DatabaseIntegrity(t *testing.T) {
	ts := lib.GetTestSuite()
	if ts == nil {
		t.Skip("Test suite not initialized")
	}

	inviteeEmail := "test-db-integrity@example.com"
	params, cleanup := createInviteNotificationParams(t, ts, inviteeEmail)
	defer cleanupAllTestData(t, ts, cleanup)

	// Verify that the created invite actually exists in the database
	var dbInvite db.Invite
	err := ts.DB.First(&dbInvite, params.Invite.ID).Error
	assert.Equal(t, err, nil)
	assert.Equal(t, dbInvite.Email, inviteeEmail)
	assert.Equal(t, dbInvite.WorkspaceID, params.Workspace.ID)

	// Verify workspace exists
	var dbWorkspace db.Workspace
	err = ts.DB.First(&dbWorkspace, params.Workspace.ID).Error
	assert.Equal(t, err, nil)
	assert.NotEqual(t, dbWorkspace.Slug, "")

	// Verify inviting user exists
	var dbUser db.User
	err = ts.DB.First(&dbUser, params.InvitedBy.ID).Error
	assert.Equal(t, err, nil)
	assert.NotEqual(t, dbUser.Email, "")

	// Verify role exists
	var dbRole db.Role
	err = ts.DB.First(&dbRole, params.Role.ID).Error
	assert.Equal(t, err, nil)
	assert.NotEqual(t, dbRole.Role, "")
}

// Benchmark test for performance monitoring.
func BenchmarkCreateInviteNotificationParams(b *testing.B) {
	ts := lib.GetTestSuite()
	if ts == nil {
		b.Skip("Test suite not initialized")
	}

	b.ResetTimer()
	for i := range b.N {
		// Use a unique email for each iteration to avoid conflicts
		inviteeEmail := fmt.Sprintf("benchmark-%d@example.com", i)
		params, cleanup := createSelfContainedInviteNotificationParams(&testing.T{}, ts, inviteeEmail)

		// Clean up immediately to avoid accumulating test data
		cleanupAllTestData(&testing.T{}, ts, cleanup)
		_ = params // Use the params to avoid unused variable warning
	}
}

func TestSendNovuInviteNotification_NoSecretKey(t *testing.T) {
	ts := lib.GetTestSuite()
	if ts == nil {
		t.Skip("Test suite not initialized")
	}

	ctx := t.Context()

	// Create test data
	params, cleanup := createSelfContainedInviteNotificationParams(t, ts, "test-no-key@example.com")
	defer cleanupAllTestData(t, ts, cleanup)

	// Create environment without Novu secret key
	envWithoutNovuKey := &utils.CoreAPIEnv{
		NovuSecretKey: "", // Empty key
	}

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelError,
	}))

	sqidManager := &irminsqids.SQIDManager{}

	result, err := lib.SendNovuInviteNotification(ctx, ts.DB, sqidManager, envWithoutNovuKey, logger, params)

	// Should return error for missing secret key
	assert.NotEqual(t, err, nil)
	assert.NotEqual(t, result, nil)
	assert.Equal(t, result.Success, false)
	assert.Equal(t, result.Method, "novu")
	assert.Equal(t, result.Message, "Novu service not configured")
	assert.Equal(t, result.Error, "missing Novu secret key")
}

func TestSendNovuInviteNotification_UserWithNovuID(t *testing.T) {
	ts := lib.GetTestSuite()
	if ts == nil {
		t.Skip("Test suite not initialized")
	}

	// Skip if no Novu key is configured
	if ts.Env.NovuSecretKey == "" {
		t.Skip("Novu secret key not configured")
	}

	ctx := t.Context()

	// Create a test user WITH Novu subscriber ID
	testEmail := "test-with-novu-id@example.com"
	testUser := createTestUserWithNovuID(t, ts, testEmail)

	// Create self-contained test data
	params, cleanup := createSelfContainedInviteNotificationParams(t, ts, testEmail)
	cleanup.Users = append(cleanup.Users, testUser) // Add to cleanup
	defer cleanupAllTestData(t, ts, cleanup)

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelError,
	}))

	sqidManager := &irminsqids.SQIDManager{}

	result, err := lib.SendNovuInviteNotification(ctx, ts.DB, sqidManager, ts.Env, logger, params)

	// Result depends on whether the user actually exists in Novu
	// but at least we should get past the subscriber ID validation
	assert.NotEqual(t, result, nil)
	assert.Equal(t, result.Method, "novu")

	if !result.Success {
		// If it fails, it should be because subscriber not found in Novu, not because of missing ID
		assert.NotEqual(t, result.Message, "User not subscribed to notifications")
		assert.NotEqual(t, result.Error, "user has no Novu subscriber ID")
		// Error could be nil (expected failure) or non-nil (unexpected error)
		if err != nil {
			t.Logf("Novu call returned error: %v", err)
		}
	} else {
		// If successful, should not have an error
		assert.Equal(t, err, nil)
		// If successful, notification ID should be a real Novu transaction ID (non-empty)
		assert.NotEqual(t, result.NotificationID, "")
	}
}

func TestSendNovuEmailOnlyNotification_NoSecretKey(t *testing.T) {
	ctx := t.Context()

	params := lib.InviteNotificationParams{
		Invite:              &db.Invite{Email: "test@example.com", ExpiresAt: time.Now().Add(7 * 24 * time.Hour)},
		Workspace:           &db.Workspace{Name: "Test"},
		InvitedBy:           &db.User{Email: "inviter@example.com", FirstName: "Test", LastName: "User"},
		Role:                &db.Role{Role: "Member"},
		InviteAcceptanceURL: "https://example.com/invite/test",
		Locale:              "en",
	}

	envWithoutKey := &utils.CoreAPIEnv{
		NovuSecretKey: "",
	}

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelError,
	}))

	result, err := lib.SendNovuEmailOnlyNotification(ctx, envWithoutKey, logger, params)

	assert.NotEqual(t, err, nil)
	assert.NotEqual(t, result, nil)
	assert.Equal(t, result.Success, false)
	assert.Equal(t, result.Method, "novu")
	assert.Equal(t, result.Message, "Novu service not configured")
	assert.Equal(t, result.Error, "missing Novu secret key")
}
