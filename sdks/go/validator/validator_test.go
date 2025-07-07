package irminsdkvalidator_test

import (
	"testing"
	"time"

	coreapi "github.com/IrminData/irmin-sdk-go/core-api"
	models "github.com/IrminData/irmin-sdk-go/models"
	sqids "github.com/IrminData/irmin-sdk-go/sqids"
	validator "github.com/IrminData/irmin-sdk-go/validator"
)

func TestValidator_ValidateUser(t *testing.T) {
	sqidManager := sqids.NewSQIDManager("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890")
	validator := validator.NewValidator(sqidManager)

	t.Run("valid user", func(t *testing.T) {
		userID, _ := sqidManager.Encode("users", 123)
		roleID, _ := sqidManager.Encode("roles", 123)
		user := models.User{
			ID:             userID,
			FirstName:      "John",
			LastName:       "Doe",
			Email:          "john.doe@example.com",
			Phone:          "+1234567890",
			Company:        "Example Inc.",
			ProfilePicture: "https://example.com/profile.jpg",
			Roles: []models.Role{
				{ID: roleID, Role: "admin"},
			},
		}

		err := validator.Validate(user)
		if err != nil {
			t.Errorf("Expected valid user, got error: %v", err)
		}
	})

	t.Run("invalid user", func(t *testing.T) {
		user := models.User{
			ID:        "", // Missing required field
			FirstName: "", // Too short
			Email:     "invalid-email",
			Roles:     []models.Role{}, // Required but empty
		}

		err := validator.Validate(user)
		if err == nil {
			t.Error("Expected validation error for invalid user")
		}
	})
}

func TestValidator_ValidateAPIToken(t *testing.T) {
	sqidManager := sqids.NewSQIDManager("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890")
	validator := validator.NewValidator(sqidManager)

	t.Run("valid API token", func(t *testing.T) {
		tokenID, _ := sqidManager.Encode("api_tokens", 123)
		token := models.APIToken{
			ID:        tokenID,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
			Name:      "My Token",
			Token:     "cred_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
			ExpiresAt: time.Now().Add(24 * time.Hour),
		}

		err := validator.Validate(token)
		if err != nil {
			t.Errorf("Expected valid token, got error: %v", err)
		}
	})

	t.Run("invalid API token", func(t *testing.T) {
		token := models.APIToken{
			ID:        "token-123",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
			Name:      "My Token",
			Token:     "wrong_prefix_short", // Wrong prefix and too short
			ExpiresAt: time.Now().Add(24 * time.Hour),
		}

		err := validator.Validate(token)
		if err == nil {
			t.Error("Expected validation error for invalid token")
		}
	})
}

func TestValidator_ValidateSchedule(t *testing.T) {
	sqidManager := sqids.NewSQIDManager("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890")
	validator := validator.NewValidator(sqidManager)

	// valid schedule with rrule
	t.Run("valid rrule time trigger", func(t *testing.T) {
		rrule := "FREQ=DAILY;COUNT=5"
		schedule := models.Schedule{
			Triggers: []models.ScheduleTrigger{
				{
					Type:  models.TimeTriggerType,
					RRule: &rrule,
				},
			},
			MaxRetries: 5,
		}
		err := validator.Validate(schedule)
		if err != nil {
			t.Errorf("Expected valid schedule, got error: %v", err)
		}
	})

	// valid schedule with cron
	t.Run("valid cron time trigger", func(t *testing.T) {
		cron := "0 0 * * *"
		schedule := models.Schedule{
			Triggers: []models.ScheduleTrigger{
				{
					Type: models.TimeTriggerType,
					Cron: &cron,
				},
			},
		}
		err := validator.Validate(schedule)
		if err != nil {
			t.Errorf("Expected valid schedule, got error: %v", err)
		}
	})

	// valid schedule with repository event
	t.Run("valid repository event trigger", func(t *testing.T) {
		repoEvent := models.PostMerge
		repoSlug := "my-repo"
		repoRef := "main"
		schedule := models.Schedule{
			Triggers: []models.ScheduleTrigger{
				{
					Type:            models.RepositoryTriggerType,
					RepositoryEvent: &repoEvent,
					Repository:      &repoSlug,
					RepositoryRef:   &repoRef,
				},
			},
		}
		err := validator.Validate(schedule)
		if err != nil {
			t.Errorf("Expected valid schedule, got error: %v", err)
		}
	})

	// valid schedule with workflow run event
	t.Run("valid workflow run event trigger", func(t *testing.T) {
		workflowEvent := models.PostWorkflowRun
		workflowSqid, _ := sqidManager.Encode("workflows", 1)
		schedule := models.Schedule{
			Triggers: []models.ScheduleTrigger{
				{
					Type:             models.WorkflowRunTriggerType,
					WorkflowRunEvent: &workflowEvent,
					WorkflowID:       &workflowSqid,
				},
			},
		}
		err := validator.Validate(schedule)
		if err != nil {
			t.Errorf("Expected valid schedule, got error: %v", err)
		}
	})

	// invalid time trigger - neither rrule nor cron
	t.Run("invalid time trigger - neither rrule nor cron", func(t *testing.T) {
		schedule := models.Schedule{
			Triggers: []models.ScheduleTrigger{
				{
					Type: models.TimeTriggerType,
				},
			},
		}
		err := validator.Validate(schedule)
		if err == nil {
			t.Error("Expected validation error for time trigger with no rrule or cron")
		}
	})

	// invalid repository event - missing repository
	t.Run("invalid repository event - missing repository", func(t *testing.T) {
		repoEvent := models.PostMerge
		repoRef := "main"
		schedule := models.Schedule{
			Triggers: []models.ScheduleTrigger{
				{
					Type:            models.RepositoryTriggerType,
					RepositoryEvent: &repoEvent,
					RepositoryRef:   &repoRef,
					// Missing Repository
				},
			},
		}
		err := validator.Validate(schedule)
		if err == nil {
			t.Error("Expected validation error for repository event with missing repository")
		}
	})

	// invalid repository event - missing repository ref
	t.Run("invalid repository event - missing repository ref", func(t *testing.T) {
		repoEvent := models.PostMerge
		repoSlug := "my-repo"
		schedule := models.Schedule{
			Triggers: []models.ScheduleTrigger{
				{
					Type:            models.RepositoryTriggerType,
					RepositoryEvent: &repoEvent,
					Repository:      &repoSlug,
					// Missing RepositoryRef
				},
			},
		}
		err := validator.Validate(schedule)
		if err == nil {
			t.Error("Expected validation error for repository event with missing repository ref")
		}
	})

	// invalid workflow run event - missing workflow id
	t.Run("invalid workflow run event - missing workflow id", func(t *testing.T) {
		workflowEvent := models.PostWorkflowRun
		schedule := models.Schedule{
			Triggers: []models.ScheduleTrigger{
				{
					Type:             models.WorkflowRunTriggerType,
					WorkflowRunEvent: &workflowEvent,
					// Missing WorkflowID
				},
			},
		}
		err := validator.Validate(schedule)
		if err == nil {
			t.Error("Expected validation error for workflow run event with missing workflow id")
		}
	})

	// invalid schedule - maxretries too high
	t.Run("invalid schedule - maxretries too high", func(t *testing.T) {
		cron := "0 0 * * *"
		schedule := models.Schedule{
			Triggers: []models.ScheduleTrigger{
				{
					Type: models.TimeTriggerType,
					Cron: &cron,
				},
			},
			MaxRetries: 11,
		}
		err := validator.Validate(schedule)
		if err == nil {
			t.Error("Expected validation error for max retries > 10")
		}
	})

	// invalid trigger type
	t.Run("invalid trigger type", func(t *testing.T) {
		cron := "0 0 * * *"
		schedule := models.Schedule{
			Triggers: []models.ScheduleTrigger{
				{
					Type: "invalid-trigger-type",
					Cron: &cron,
				},
			},
		}
		err := validator.Validate(schedule)
		if err == nil {
			t.Error("Expected validation error for invalid trigger type")
		}
	})
}

func TestValidator_ValidateVar(t *testing.T) {
	sqidManager := sqids.NewSQIDManager("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890")
	validator := validator.NewValidator(sqidManager)

	tests := []struct {
		name    string
		value   any
		tag     string
		wantErr bool
	}{
		{"valid email", "test@example.com", "email", false},
		{"invalid email", "not-an-email", "email", true},
		{"valid required string", "hello", "required", false},
		{"invalid required string", "", "required", true},
		{"valid min length", "hello", "min=3", false},
		{"invalid min length", "hi", "min=3", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidateVar(tt.value, tt.tag)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateVar() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestStartsWithValidation(t *testing.T) {
	sqidManager := sqids.NewSQIDManager("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890")
	validator := validator.NewValidator(sqidManager)

	tests := []struct {
		name    string
		value   string
		tag     string
		wantErr bool
	}{
		{"valid prefix", "cred_abc123", "startswith=cred_", false},
		{"invalid prefix", "wrong_abc123", "startswith=cred_", true},
		{"empty string", "", "startswith=cred_", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidateVar(tt.value, tt.tag)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateVar() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestClientValidator_RequestValidation(t *testing.T) {
	// Test client-side validator (no SQID manager)
	clientValidator := validator.NewClientValidator()

	t.Run("CreateConnectionRequest - Valid", func(t *testing.T) {
		req := coreapi.CreateConnectionRequest{
			Name:        "My Database Connection",
			Connector:   "postgres",
			Description: "Connection to production database",
			Details: map[string]any{
				"host":     "localhost",
				"port":     5432,
				"database": "myapp",
			},
			Settings: map[string]any{
				"ssl_mode": "require",
			},
		}

		err := clientValidator.Validate(req)
		if err != nil {
			t.Errorf("Expected valid connection request, got error: %v", err)
		}
	})

	t.Run("CreateConnectionRequest - Invalid (missing required fields)", func(t *testing.T) {
		req := coreapi.CreateConnectionRequest{
			// Missing required Name and Connector fields
			Description: "This request is missing required fields",
		}

		err := clientValidator.Validate(req)
		if err == nil {
			t.Error("Expected validation error for missing required fields")
		}
	})

	t.Run("CreateWorkspaceRequest - Valid", func(t *testing.T) {
		req := coreapi.CreateWorkspaceRequest{
			Name:        "My New Workspace",
			Description: "A workspace for data analysis",
		}

		err := clientValidator.Validate(req)
		if err != nil {
			t.Errorf("Expected valid workspace request, got error: %v", err)
		}
	})

	t.Run("CreateWorkspaceRequest - Invalid (missing required name)", func(t *testing.T) {
		req := coreapi.CreateWorkspaceRequest{
			// Missing required Name field
			Description: "A workspace without a name",
		}

		err := clientValidator.Validate(req)
		if err == nil {
			t.Error("Expected validation error for missing required name")
		}
	})

	t.Run("TransferConnectionOwnershipRequest - Valid", func(t *testing.T) {
		req := coreapi.TransferConnectionOwnershipRequest{
			NewOwnerID: "user_123", // SQID validation will be skipped on client-side
		}

		err := clientValidator.Validate(req)
		if err != nil {
			t.Errorf("Expected valid transfer request, got error: %v", err)
		}
	})

	t.Run("TransferConnectionOwnershipRequest - Invalid (missing required field)", func(t *testing.T) {
		req := coreapi.TransferConnectionOwnershipRequest{
			// Missing required NewOwnerID field
		}

		err := clientValidator.Validate(req)
		if err == nil {
			t.Error("Expected validation error for missing required NewOwnerID")
		}
	})
}

func TestServerValidator_RequestValidation(t *testing.T) {
	// Test server-side validator (with SQID manager)
	sqidManager := sqids.NewSQIDManager("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890")
	serverValidator := validator.NewValidator(sqidManager)

	t.Run("User model with valid SQID", func(t *testing.T) {
		// Generate a valid user SQID
		userSQID, _ := sqidManager.Encode("users", 123)

		user := models.User{
			ID:             userSQID, // Valid SQID
			FirstName:      "John",
			LastName:       "Doe",
			Email:          "john@example.com",
			Phone:          "+1234567890", // Valid E164 format
			Company:        "Example Inc",
			ProfilePicture: "https://example.com/profile.jpg", // Valid URL
			Roles:          []models.Role{},                   // Empty roles slice
		}

		err := serverValidator.Validate(user)
		if err != nil {
			t.Errorf("Expected valid user with valid SQID, got error: %v", err)
		}
	})

	t.Run("User model with invalid SQID", func(t *testing.T) {
		user := models.User{
			ID:             "invalid_user_sqid", // Invalid SQID
			FirstName:      "John",
			LastName:       "Doe",
			Email:          "john@example.com",
			Phone:          "+1234567890", // Valid E164 format
			Company:        "Example Inc",
			ProfilePicture: "https://example.com/profile.jpg", // Valid URL
			Roles:          []models.Role{},                   // Empty roles slice
		}

		err := serverValidator.Validate(user)
		if err == nil {
			t.Error("Expected validation error for invalid SQID on server-side")
		}
	})

	t.Run("TransferConnectionOwnershipRequest - No SQID validation in core-api", func(t *testing.T) {
		// Core-api request structs don't have SQID validation tags
		req := coreapi.TransferConnectionOwnershipRequest{
			NewOwnerID: "invalid_user_sqid", // This won't trigger SQID validation
		}

		err := serverValidator.Validate(req)
		if err != nil {
			t.Errorf("Core-api requests don't have SQID validation tags, got error: %v", err)
		}
	})
}

func TestClientVsServerValidator_SQIDHandling(t *testing.T) {
	// Setup both validators
	sqidManager := sqids.NewSQIDManager("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890")
	clientValidator := validator.NewClientValidator()
	serverValidator := validator.NewValidator(sqidManager)

	// Create a user model with an invalid SQID (models have SQID validation tags)
	user := models.User{
		ID:             "definitely_not_a_valid_sqid",
		FirstName:      "John",
		LastName:       "Doe",
		Email:          "john@example.com",
		Phone:          "+1234567890", // Valid E164 format
		Company:        "Example Inc",
		ProfilePicture: "https://example.com/profile.jpg", // Valid URL
		Roles:          []models.Role{},                   // Empty roles slice
	}

	t.Run("Client validator skips SQID validation", func(t *testing.T) {
		err := clientValidator.Validate(user)
		if err != nil {
			t.Errorf("Client validator should skip SQID validation, got error: %v", err)
		}
	})

	t.Run("Server validator enforces SQID validation", func(t *testing.T) {
		err := serverValidator.Validate(user)
		if err == nil {
			t.Error("Server validator should enforce SQID validation and fail")
		}
	})
}

func TestCoreAPIRequestStructs_ComprehensiveValidation(t *testing.T) {
	clientValidator := validator.NewClientValidator()

	tests := []struct {
		name    string
		request any
		wantErr bool
	}{
		{
			name: "CreateCredentialRequest - Valid",
			request: coreapi.CreateCredentialRequest{
				Name:   "My API Token",
				Expiry: 3600, // Required field: seconds until expiry
			},
			wantErr: false,
		},
		{
			name:    "CreateCredentialRequest - Invalid (missing required fields)",
			request: coreapi.CreateCredentialRequest{
				// Missing required Name and Expiry fields
			},
			wantErr: true,
		},
		{
			name: "SendInviteRequest - Valid",
			request: coreapi.SendInviteRequest{
				Email: "user@example.com",
				Role:  "viewer",
			},
			wantErr: false,
		},
		{
			name:    "SendInviteRequest - Invalid (missing required fields)",
			request: coreapi.SendInviteRequest{
				// Missing required Email and Role fields
			},
			wantErr: true,
		},
		{
			name: "CreateRepositoryRequest - Valid",
			request: coreapi.CreateRepositoryRequest{
				Name:          "my-repo",
				DefaultBranch: "main",
				Description:   "My data repository",
			},
			wantErr: false,
		},
		{
			name: "CreateRepositoryRequest - Invalid (missing required fields)",
			request: coreapi.CreateRepositoryRequest{
				// Missing required Name field
				Description: "Repository without required fields",
			},
			wantErr: true,
		},
		{
			name: "CreateQueryRequest - Valid",
			request: coreapi.CreateQueryRequest{
				Name:        "My Query",
				SQL:         "SELECT * FROM table",
				Description: "A simple query",
			},
			wantErr: false,
		},
		{
			name: "CreateQueryRequest - Invalid (missing required fields)",
			request: coreapi.CreateQueryRequest{
				// All fields are optional in CreateQueryRequest
				Description: "Query with optional fields only",
			},
			wantErr: false, // Changed to false since all fields are optional
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := clientValidator.Validate(tt.request)
			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
