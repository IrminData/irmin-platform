package formatter

import (
	"errors"
	"fmt"
	"irmin-api/db"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// formatQueries formats a slice of database queries into model queries.
func formatQueries(queries []db.StoredQuery, sqidManager *utils.SQIDManager) ([]irminmodels.StoredQuery, error) {
	var formattedQueries []irminmodels.StoredQuery
	for _, query := range queries {
		formattedQuery, err := FormatStoredQueryResponse(&query, sqidManager)
		if err != nil {
			return nil, fmt.Errorf("error formatting query: %w", err)
		}
		formattedQueries = append(formattedQueries, *formattedQuery)
	}
	if len(formattedQueries) == 0 {
		formattedQueries = make([]irminmodels.StoredQuery, 0)
	}
	return formattedQueries, nil
}

// formatRepositories formats a slice of database repositories into model repositories.
func formatRepositories(
	repositories []db.Repository,
	sqidManager *utils.SQIDManager,
) ([]irminmodels.Repository, error) {
	var formattedRepositories []irminmodels.Repository
	for _, repository := range repositories {
		formattedRepository, err := FormatRepositoryResponse(&repository, sqidManager)
		if err != nil {
			return nil, fmt.Errorf("error formatting repository: %w", err)
		}
		formattedRepositories = append(formattedRepositories, *formattedRepository)
	}
	if len(formattedRepositories) == 0 {
		formattedRepositories = make([]irminmodels.Repository, 0)
	}
	return formattedRepositories, nil
}

// formatWorkflows formats a slice of database workflows into model workflows.
func formatWorkflows(
	workflows []db.Workflow,
	sqidManager *utils.SQIDManager,
	d *db.Database,
) ([]irminmodels.Workflow, error) {
	var formattedWorkflows []irminmodels.Workflow
	for _, workflow := range workflows {
		formattedWorkflow, err := FormatWorkflowResponse(d, &workflow, sqidManager)
		if err != nil {
			return nil, fmt.Errorf("error formatting workflow: %w", err)
		}
		formattedWorkflows = append(formattedWorkflows, *formattedWorkflow)
	}
	if len(formattedWorkflows) == 0 {
		formattedWorkflows = make([]irminmodels.Workflow, 0)
	}
	return formattedWorkflows, nil
}

// formatConnections formats a slice of database connections into model connections.
func formatConnections(connections []db.Connection, sqidManager *utils.SQIDManager) ([]irminmodels.Connection, error) {
	var formattedConnections []irminmodels.Connection
	for _, connection := range connections {
		formattedConnection, err := FormatConnectionResponse(&connection, sqidManager)
		if err != nil {
			return nil, fmt.Errorf("error formatting connection: %w", err)
		}
		formattedConnections = append(formattedConnections, *formattedConnection)
	}
	if len(formattedConnections) == 0 {
		formattedConnections = make([]irminmodels.Connection, 0)
	}
	return formattedConnections, nil
}

// formatRepositoryObjects formats a slice of database repository objects into model objects.
func formatRepositoryObjects(
	repositoryObjects []db.RepositoryObject,
	sqidManager *utils.SQIDManager,
) ([]irminmodels.Object, error) {
	var formattedRepositoryObjects []irminmodels.Object
	for _, repositoryObject := range repositoryObjects {
		formattedRepositoryObject, err := FormatRepositoryObjectResponse(&repositoryObject, sqidManager)
		if err != nil {
			return nil, fmt.Errorf("error formatting repository object: %w", err)
		}
		formattedRepositoryObjects = append(formattedRepositoryObjects, *formattedRepositoryObject)
	}
	if len(formattedRepositoryObjects) == 0 {
		formattedRepositoryObjects = make([]irminmodels.Object, 0)
	}
	return formattedRepositoryObjects, nil
}

// FormatTagWithAssetsResponse creates a tag response object from a database tag object.
func FormatTagWithAssetsResponse(
	tag *db.TagWithAssets,
	sqidManager *utils.SQIDManager,
	d *db.Database,
) (*irminmodels.TagWithAssets, error) {
	if tag == nil {
		return nil, errors.New("tag is nil")
	}

	// Format the tag
	tagResponse, err := FormatTagResponse(&tag.Tag, sqidManager)
	if err != nil {
		return nil, fmt.Errorf("error formatting tag: %w", err)
	}

	// Format all asset types
	queries, err := formatQueries(tag.Assets.Queries, sqidManager)
	if err != nil {
		return nil, err
	}

	repositories, err := formatRepositories(tag.Assets.Repositories, sqidManager)
	if err != nil {
		return nil, err
	}

	workflows, err := formatWorkflows(tag.Assets.Workflows, sqidManager, d)
	if err != nil {
		return nil, err
	}

	connections, err := formatConnections(tag.Assets.Connections, sqidManager)
	if err != nil {
		return nil, err
	}

	repositoryObjects, err := formatRepositoryObjects(tag.Assets.RepositoryObjects, sqidManager)
	if err != nil {
		return nil, err
	}

	// Construct the tag object
	tagWithAssetsResponse := irminmodels.TagWithAssets{
		Tag: *tagResponse,
		Assets: irminmodels.TaggedAssets{
			Queries:           queries,
			Repositories:      repositories,
			Workflows:         workflows,
			Connections:       connections,
			RepositoryObjects: repositoryObjects,
		},
		Counts: tag.Counts,
	}

	return &tagWithAssetsResponse, nil
}

// FormatTagResponse creates a tag response object from a database tag object.
func FormatTagResponse(tag *db.Tag, sqidManager *utils.SQIDManager) (*irminmodels.Tag, error) {
	if tag == nil {
		return nil, errors.New("tag is nil")
	}

	// Construct the tag sqid
	tagSqid, err := sqidManager.Encode("tags", uint64(tag.ID))
	if err != nil {
		return nil, fmt.Errorf("error encoding tag sqid: %w", err)
	}

	// Construct the tag object
	tagResponse := irminmodels.Tag{
		ID:          tagSqid,
		Name:        tag.Name,
		Color:       tag.Color,
		Description: tag.Description,
	}

	return &tagResponse, nil
}

// FormatTagsResponse creates a slice of tag response objects from database tag objects.
func FormatTagsResponse(tags []db.Tag, sqidManager *utils.SQIDManager) ([]irminmodels.Tag, error) {
	var formattedTags []irminmodels.Tag

	for _, tag := range tags {
		formattedTag, err := FormatTagResponse(&tag, sqidManager)
		if err != nil {
			return nil, fmt.Errorf("error formatting tag: %w", err)
		}
		formattedTags = append(formattedTags, *formattedTag)
	}

	if len(formattedTags) == 0 {
		return []irminmodels.Tag{}, nil
	}

	return formattedTags, nil
}
