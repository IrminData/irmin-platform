package formatter

import (
	"irmin-api/db"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminsqids "github.com/IrminData/irmin-sdk-go/sqids"
)

// FormatAIApplicationResponse formats an AI application response.
func FormatAIApplicationResponse(
	database *db.Database,
	aiApplication *db.AIApplication,
	sqidManager *irminsqids.SQIDManager,
) (*irminmodels.AIApplication, error) {
	// Encode the AI application ID
	aiApplicationSqid, err := sqidManager.Encode("ai_applications", uint64(aiApplication.ID))
	if err != nil {
		return nil, err
	}

	// Format owner using existing formatter
	ownerResponse, err := FormatUserResponse(&aiApplication.Owner, sqidManager)
	if err != nil {
		return nil, err
	}

	// Format tags using existing formatter
	var tagsResponse []irminmodels.Tag
	if len(aiApplication.Tags) > 0 {
		for _, tag := range aiApplication.Tags {
			tagResponse, tagErr := FormatTagResponse(&tag, sqidManager)
			if tagErr != nil {
				return nil, tagErr
			}
			tagsResponse = append(tagsResponse, *tagResponse)
		}
	}

	// Format data sources
	var dataSources []irminmodels.AIApplicationDataSource
	for _, ds := range aiApplication.DataSources {
		// Get repository slug
		repositorySlug := ds.Repository.Slug

		dataSources = append(dataSources, irminmodels.AIApplicationDataSource{
			Repository: repositorySlug,
			Branch:     ds.Branch,
			Path:       "/" + ds.Path,
		})
	}

	// Format API key as pointer (only include if non-empty for security)
	var apiKeyPtr *string
	if aiApplication.APIKey != "" {
		apiKeyPtr = &aiApplication.APIKey
	}

	// Format tools configuration
	var toolsResponse *irminmodels.AIApplicationToolConfig
	if aiApplication.Tools != nil {
		toolsResponse = &irminmodels.AIApplicationToolConfig{
			QueryEnabled:        aiApplication.Tools.QueryEnabled,
			SchemaEnabled:       aiApplication.Tools.SchemaEnabled,
			ListObjectsEnabled:  aiApplication.Tools.ListObjectsEnabled,
			GetContentEnabled:   aiApplication.Tools.GetContentEnabled,
			VectorSearchEnabled: aiApplication.Tools.VectorSearchEnabled,
			DocsEnabled:         aiApplication.Tools.DocsEnabled,
		}
	}

	// Build the response
	response := &irminmodels.AIApplication{
		ID:             aiApplicationSqid,
		Name:           aiApplication.Name,
		Description:    aiApplication.Description,
		Documentation:  aiApplication.Documentation,
		AllowedOrigins: aiApplication.AllowedOrigins,
		Tools:          toolsResponse,
		DataSources:    dataSources,
		APIKey:         apiKeyPtr,
		Owner:          *ownerResponse,
		Tags:           tagsResponse,
		CreatedAt:      aiApplication.CreatedAt,
		UpdatedAt:      aiApplication.UpdatedAt,
	}

	return response, nil
}
