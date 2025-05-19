package formatter

import (
	"irmin-api/db"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// FormatAPITokenResponse formats an API token for the response.
func FormatAPITokenResponse(token *db.APIToken, sqidManager *utils.SQIDManager) (*irminmodels.APIToken, error) {
	// Conver the API token to an API token response.
	sqid, sqidErr := sqidManager.Encode("api_tokens", uint64(token.ID))
	if sqidErr != nil {
		return nil, sqidErr
	}
	apiTokenResponse := irminmodels.APIToken{
		ID:        sqid,
		CreatedAt: token.CreatedAt,
		UpdatedAt: token.UpdatedAt,
		Name:      token.Name,
		Token:     token.Token,
		ExpiresAt: token.ExpiresAt,
	}
	// Return the API token response.
	return &apiTokenResponse, nil
}
