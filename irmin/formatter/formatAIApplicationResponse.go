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

	// Build the response
	response := &irminmodels.AIApplication{
		ID:             aiApplicationSqid,
		Name:           aiApplication.Name,
		Description:    aiApplication.Description,
		Documentation:  aiApplication.Documentation,
		AllowedOrigins: aiApplication.AllowedOrigins,
		DataSources:    dataSources,
		Owner:          *ownerResponse,
		Tags:           tagsResponse,
		CreatedAt:      aiApplication.CreatedAt,
		UpdatedAt:      aiApplication.UpdatedAt,
	}

	return response, nil
}
