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
	tagsResponse := []irminmodels.Tag{}
	for _, tag := range aiApplication.Tags {
		tagResponse, tagErr := FormatTagResponse(&tag, sqidManager)
		if tagErr != nil {
			return nil, tagErr
		}
		tagsResponse = append(tagsResponse, *tagResponse)
	}

	// Format data sources
	dataSources := []irminmodels.AIApplicationDataSource{}
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

	// Format custom tools
	customToolsResponse := []irminmodels.AIApplicationCustomTool{}
	for _, ct := range aiApplication.CustomTools {
		customToolResponse, ctErr := formatCustomToolResponse(&ct, sqidManager)
		if ctErr != nil {
			return nil, ctErr
		}
		customToolsResponse = append(customToolsResponse, *customToolResponse)
	}

	// Build the response
	response := &irminmodels.AIApplication{
		ID:             aiApplicationSqid,
		Name:           aiApplication.Name,
		Description:    aiApplication.Description,
		Documentation:  aiApplication.Documentation,
		AllowedOrigins: aiApplication.AllowedOrigins,
		Tools:          toolsResponse,
		CustomTools:    customToolsResponse,
		DataSources:    dataSources,
		APIKey:         apiKeyPtr,
		Owner:          *ownerResponse,
		Tags:           tagsResponse,
		CreatedAt:      aiApplication.CreatedAt,
		UpdatedAt:      aiApplication.UpdatedAt,
	}

	return response, nil
}

// formatCustomToolResponse formats a custom tool response.
func formatCustomToolResponse(
	tool *db.AIApplicationCustomTool,
	sqidManager *irminsqids.SQIDManager,
) (*irminmodels.AIApplicationCustomTool, error) {
	// Encode the custom tool ID
	toolSqid, err := sqidManager.Encode("ai_application_custom_tools", uint64(tool.ID))
	if err != nil {
		return nil, err
	}

	// Encode stored query ID if present
	var storedQueryIDPtr *string
	var storedQuerySqid string
	if tool.StoredQueryID != nil {
		var sqErr error
		storedQuerySqid, sqErr = sqidManager.Encode("queries", uint64(*tool.StoredQueryID))
		if sqErr != nil {
			return nil, sqErr
		}
		storedQueryIDPtr = &storedQuerySqid
	}

	// Encode workflow ID if present
	var workflowIDPtr *string
	var workflowSqid string
	if tool.WorkflowID != nil {
		var wfErr error
		workflowSqid, wfErr = sqidManager.Encode("workflows", uint64(*tool.WorkflowID))
		if wfErr != nil {
			return nil, wfErr
		}
		workflowIDPtr = &workflowSqid
	}

	return &irminmodels.AIApplicationCustomTool{
		ID:              toolSqid,
		Name:            tool.Name,
		Description:     tool.Description,
		Type:            irminmodels.CustomToolType(tool.Type),
		Enabled:         tool.Enabled,
		StoredQueryID:   storedQueryIDPtr,
		WorkflowID:      workflowIDPtr,
		EmbeddingPath:   tool.EmbeddingPath,
		EmbeddingTopK:   tool.EmbeddingTopK,
		EmbeddingFilter: tool.EmbeddingFilter,
		CreatedAt:       tool.CreatedAt,
		UpdatedAt:       tool.UpdatedAt,
	}, nil
}
