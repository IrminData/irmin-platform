package formatter

import (
	"fmt"
	"irmin-api/db"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminsqids "github.com/IrminData/irmin-sdk-go/sqids"
)

func FormatStoredScriptResponse(
	script *db.StoredScript,
	sqidManager *irminsqids.SQIDManager,
) (*irminmodels.StoredScript, error) {
	// Structure the owner response.
	ownerResponse, err := FormatUserResponse(&script.Owner, sqidManager)
	if err != nil {
		return nil, err
	}

	// Format the script tags
	tags, err := FormatTagsResponse(script.Tags, sqidManager)
	if err != nil {
		return nil, fmt.Errorf("error formatting script tags: %w", err)
	}

	// Construct the sqid of the script
	scriptSqid, err := sqidManager.Encode("scripts", uint64(script.ID))
	if err != nil {
		return nil, fmt.Errorf("error encoding script sqid: %w", err)
	}

	// Construct the script object
	var description *string
	if script.Description != "" {
		description = &script.Description
	}
	var content *string
	if script.Content != "" {
		content = &script.Content
	}
	var language *string
	if script.Language != "" {
		language = &script.Language
	}

	scriptResponse := irminmodels.StoredScript{
		ID:          scriptSqid,
		Name:        script.Name,
		Description: description,
		Content:     content,
		Language:    language,
		Owner:       *ownerResponse,
		Tags:        tags,
		CreatedAt:   script.CreatedAt,
		UpdatedAt:   script.UpdatedAt,
	}

	return &scriptResponse, nil
}
