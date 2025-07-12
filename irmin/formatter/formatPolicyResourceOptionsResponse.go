package formatter

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminsqids "github.com/IrminData/irmin-sdk-go/sqids"
)

// formatQueryResourceOptions formats the queries into PolicyResourceOptions.
func formatQueryResourceOptions(
	queries []db.StoredQuery,
	sqidManager *irminsqids.SQIDManager,
) ([]irminmodels.PolicyResourceOption, error) {
	formattedQueries := make([]irminmodels.PolicyResourceOption, len(queries))
	for i, query := range queries {
		sqid, err := sqidManager.Encode("queries", uint64(query.ID))
		if err != nil {
			return nil, fmt.Errorf("error encoding query sqid: %w", err)
		}
		formattedQueries[i] = irminmodels.PolicyResourceOption{
			ID:    sqid,
			Label: query.Name,
		}
	}
	return formattedQueries, nil
}

// formatWorkflowResourceOptions formats the workflows into PolicyResourceOptions.
func formatWorkflowResourceOptions(
	workflows []db.Workflow,
	sqidManager *irminsqids.SQIDManager,
) ([]irminmodels.PolicyResourceOption, error) {
	formattedWorkflows := make([]irminmodels.PolicyResourceOption, len(workflows))
	for i, workflow := range workflows {
		sqid, err := sqidManager.Encode("workflows", uint64(workflow.ID))
		if err != nil {
			return nil, fmt.Errorf("error encoding workflow sqid: %w", err)
		}
		formattedWorkflows[i] = irminmodels.PolicyResourceOption{
			ID:    sqid,
			Label: workflow.Name,
		}
	}
	return formattedWorkflows, nil
}

// formatConnectionResourceOptions formats the connections into PolicyResourceOptions.
func formatConnectionResourceOptions(
	connections []db.Connection,
	sqidManager *irminsqids.SQIDManager,
) ([]irminmodels.PolicyResourceOption, error) {
	formattedConnections := make([]irminmodels.PolicyResourceOption, len(connections))
	for i, connection := range connections {
		sqid, err := sqidManager.Encode("connections", uint64(connection.ID))
		if err != nil {
			return nil, fmt.Errorf("error encoding connection sqid: %w", err)
		}
		formattedConnections[i] = irminmodels.PolicyResourceOption{
			ID:    sqid,
			Label: connection.Name,
		}
	}
	return formattedConnections, nil
}

// formatRepositoryResourceOptions formats the repositories into PolicyResourceOptions.
func formatRepositoryResourceOptions(
	repositories []db.Repository,
	sqidManager *irminsqids.SQIDManager,
) ([]irminmodels.PolicyResourceOption, error) {
	formattedRepositories := make([]irminmodels.PolicyResourceOption, len(repositories))
	for i, repository := range repositories {
		sqid, err := sqidManager.Encode("repositories", uint64(repository.ID))
		if err != nil {
			return nil, fmt.Errorf("error encoding repository sqid: %w", err)
		}
		formattedRepositories[i] = irminmodels.PolicyResourceOption{
			ID:    sqid,
			Label: repository.Name,
		}
	}
	return formattedRepositories, nil
}

// formatUserResourceOptions formats the users into PolicyResourceOptions.
func formatUserResourceOptions(
	users []db.WorkspaceUser,
	sqidManager *irminsqids.SQIDManager,
) ([]irminmodels.PolicyResourceOption, error) {
	formattedUsers := make([]irminmodels.PolicyResourceOption, len(users))
	for i, user := range users {
		sqid, err := sqidManager.Encode("users", uint64(user.User.ID))
		if err != nil {
			return nil, fmt.Errorf("error encoding user sqid: %w", err)
		}
		formattedUsers[i] = irminmodels.PolicyResourceOption{
			ID:    sqid,
			Label: user.User.Email,
		}
	}
	return formattedUsers, nil
}

// formatTagResourceOptions formats the tags into PolicyResourceOptions.
func formatTagResourceOptions(
	tags []db.Tag,
	sqidManager *irminsqids.SQIDManager,
) ([]irminmodels.PolicyResourceOption, error) {
	formattedTags := make([]irminmodels.PolicyResourceOption, len(tags))
	for i, tag := range tags {
		sqid, err := sqidManager.Encode("tags", uint64(tag.ID))
		if err != nil {
			return nil, fmt.Errorf("error encoding tag sqid: %w", err)
		}
		formattedTags[i] = irminmodels.PolicyResourceOption{
			ID:    sqid,
			Label: tag.Name,
		}
	}
	return formattedTags, nil
}

func FormatPolicyResourceOptionsResponse(
	queries []db.StoredQuery,
	workflows []db.Workflow,
	connections []db.Connection,
	repositories []db.Repository,
	tags []db.Tag,
	users []db.WorkspaceUser,
	sqidManager *irminsqids.SQIDManager,
) (*irminmodels.PolicyResourceOptions, error) {
	// Run all formatting operations concurrently
	queriesFuture := utils.Async(func() ([]irminmodels.PolicyResourceOption, error) {
		return formatQueryResourceOptions(queries, sqidManager)
	})
	workflowsFuture := utils.Async(func() ([]irminmodels.PolicyResourceOption, error) {
		return formatWorkflowResourceOptions(workflows, sqidManager)
	})
	connectionsFuture := utils.Async(func() ([]irminmodels.PolicyResourceOption, error) {
		return formatConnectionResourceOptions(connections, sqidManager)
	})
	repositoriesFuture := utils.Async(func() ([]irminmodels.PolicyResourceOption, error) {
		return formatRepositoryResourceOptions(repositories, sqidManager)
	})
	tagsFuture := utils.Async(func() ([]irminmodels.PolicyResourceOption, error) {
		return formatTagResourceOptions(tags, sqidManager)
	})
	usersFuture := utils.Async(func() ([]irminmodels.PolicyResourceOption, error) {
		return formatUserResourceOptions(users, sqidManager)
	})

	// Collect results
	formattedQueries, queriesErr := queriesFuture.Await()
	if queriesErr != nil {
		return nil, queriesErr
	}

	formattedWorkflows, workflowsErr := workflowsFuture.Await()
	if workflowsErr != nil {
		return nil, workflowsErr
	}

	formattedConnections, connectionsErr := connectionsFuture.Await()
	if connectionsErr != nil {
		return nil, connectionsErr
	}

	formattedRepositories, repositoriesErr := repositoriesFuture.Await()
	if repositoriesErr != nil {
		return nil, repositoriesErr
	}

	formattedTags, tagsErr := tagsFuture.Await()
	if tagsErr != nil {
		return nil, tagsErr
	}

	formattedUsers, usersErr := usersFuture.Await()
	if usersErr != nil {
		return nil, usersErr
	}

	// Return the formatted response
	return &irminmodels.PolicyResourceOptions{
		Queries:      formattedQueries,
		Workflows:    formattedWorkflows,
		Connections:  formattedConnections,
		Repositories: formattedRepositories,
		Tags:         formattedTags,
		Users:        formattedUsers,
	}, nil
}
