package formatter

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// formatQueryResourceOptions formats the queries into PolicyResourceOptions.
func formatQueryResourceOptions(
	queries []db.StoredQuery,
	sqidManager *utils.SQIDManager,
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
	sqidManager *utils.SQIDManager,
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
	sqidManager *utils.SQIDManager,
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
	sqidManager *utils.SQIDManager,
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
	sqidManager *utils.SQIDManager,
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

func FormatPolicyResourceOptionsResponse(
	queries []db.StoredQuery,
	workflows []db.Workflow,
	connections []db.Connection,
	repositories []db.Repository,
	users []db.WorkspaceUser,
	sqidManager *utils.SQIDManager,
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
		Users:        formattedUsers,
	}, nil
}
