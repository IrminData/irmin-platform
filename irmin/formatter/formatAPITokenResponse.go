package formatter

import (
	"irmin-api/db"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	irminsqids "github.com/IrminData/irmin-platform/sdks/go/sqids"
)

// FormatAPITokenResponse formats an API token for the response.
func FormatAPITokenResponse(token *db.APIToken, sqidManager *irminsqids.SQIDManager) (*irminmodels.APIToken, error) {
	// Convert the API token to an API token response.
	sqid, sqidErr := sqidManager.Encode("api_tokens", uint64(token.ID))
	if sqidErr != nil {
		return nil, sqidErr
	}
	apiTokenResponse := irminmodels.APIToken{
		ID:        sqid,
		CreatedAt: token.CreatedAt,
		UpdatedAt: token.UpdatedAt,
		Name:      token.Name,
		Token:     &token.Token,
		ExpiresAt: token.ExpiresAt,
	}
	// Return the API token response.
	return &apiTokenResponse, nil
}
