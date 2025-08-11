package services

import (
	"context"
	"fmt"
	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/utils"
	"time"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
)

func (api *APIServices) ListAPITokens(c context.Context, user *db.User) ([]db.APIToken, error) {
	// No permissions check needed for this route, since it's user-specific

	// Get the API tokens for the user.
	tokens, getAPITokensByUserIDErr := api.DB.GetAPITokensByUserID(user.ID)
	if getAPITokensByUserIDErr != nil {
		api.Logger.ErrorContext(c, "Error retrieving API tokens", "error", getAPITokensByUserIDErr)
		return nil, getAPITokensByUserIDErr
	}

	return tokens, nil
}

func (api *APIServices) CreateAPIToken(
	c context.Context,
	user *db.User,
	req irmincore.CreateCredentialRequest,
) (*db.APIToken, error) {
	// No permissions check needed for this route, since it's user-specific

	// Generate a random 64-character token.
	token, generateRandomStringErr := utils.GenerateRandomString()
	if generateRandomStringErr != nil {
		api.Logger.ErrorContext(c, "Error generating random string", "error", generateRandomStringErr)
		return nil, generateRandomStringErr
	}

	// Expiry is seconds until expiry, so add it to the current time.
	expiresAt := time.Now().Add(time.Duration(req.Expiry) * time.Second).UTC()

	// Create the API token.
	apiToken := &db.APIToken{
		Name:      req.Name,
		Token:     fmt.Sprintf("cred_%s", token),
		ExpiresAt: expiresAt,
		UserID:    user.ID,
		Hidden:    false,
	}
	if createAPITokenErr := api.DB.Create(&apiToken).Error; createAPITokenErr != nil {
		api.Logger.ErrorContext(c, "Error creating API token", "error", createAPITokenErr)
		return nil, createAPITokenErr
	}

	// Log the event.
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeCreate,
		Description: fmt.Sprintf("API token %s created for the user", apiToken.Name),
		UserID:      &user.ID,
	})

	return apiToken, nil
}

func (api *APIServices) DeleteAPIToken(c context.Context, user *db.User, tokenID uint) error {
	// No permissions check needed for this route, since it's user-specific

	// Get the API token to ensure it exists and belongs to the user.
	apiToken, getAPITokenErr := api.DB.GetAPIToken(tokenID)
	if getAPITokenErr != nil {
		api.Logger.ErrorContext(c, "Error retrieving API token", "error", getAPITokenErr)
		return getAPITokenErr
	}
	if apiToken.UserID != user.ID {
		api.Logger.ErrorContext(c, "API token does not belong to user")
		return ErrAPITokenNotBelongToUser
	}
	if apiToken.Hidden {
		api.Logger.ErrorContext(c, "API token is hidden")
		return ErrAPITokenIsHidden
	}

	// Delete the API token.
	if deleteAPITokenErr := api.DB.DeleteAPIToken(tokenID); deleteAPITokenErr != nil {
		api.Logger.ErrorContext(c, "Error deleting API token", "error", deleteAPITokenErr)
		return deleteAPITokenErr
	}

	// Log the event.
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeDelete,
		Description: fmt.Sprintf("API token %s deleted", apiToken.Name),
		UserID:      &user.ID,
	})

	return nil
}
