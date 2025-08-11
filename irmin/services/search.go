package services

import (
	"context"
	"fmt"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

const (
	// SearchDefaultLimit is the default number of results to return.
	SearchDefaultLimit = 20
	// SearchDefaultOffset is the default offset to start from.
	SearchDefaultOffset = 0
)

func (api *APIServices) SearchWorkspace(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	filters db.SearchFilters,
) (*irminmodels.SearchResponse, error) {
	// Perform the search
	results, totalCount, err := api.DB.SearchWorkspace(workspace.ID, filters)
	if err != nil {
		api.Logger.ErrorContext(c, "Failed to search workspace", "error", err, "workspace_id", workspace.ID)
		return nil, err
	}

	// Filter the results based on permissions
	var filteredResults []db.SearchResult
	var accessibleTotalCount int
	if user.ID == workspace.OwnerID {
		// If the user is the workspace owner, return all results
		filteredResults = results
		accessibleTotalCount = totalCount
	} else {
		// If the user is not the workspace owner, filter the results based on permissions
		filteredResults = api.filterSearchResultsBasedOnPermissions(c, results, user, workspace)

		// For non-owners, we need to calculate the accessible count efficiently
		accessibleTotalCount = api.calculateAccessibleSearchResultsCount(c, workspace.ID, user, workspace, filters, totalCount, len(filteredResults))
	}

	// Convert database results to API response format
	searchResults := make([]irminmodels.SearchResult, 0, len(filteredResults))
	for _, result := range filteredResults {
		searchResult, convertErr := api.convertToSearchResult(result)
		if convertErr != nil {
			api.Logger.ErrorContext(
				c,
				"Failed to convert search result",
				"error",
				convertErr,
				"result_type",
				result.Type,
			)
			continue // Skip this result but continue with others
		}
		searchResults = append(searchResults, searchResult)
	}

	response := irminmodels.SearchResponse{
		Results: searchResults,
		Total:   accessibleTotalCount,
		Query:   filters.Query,
		Filters: irminmodels.SearchFilters{
			Query:    filters.Query,
			Types:    filters.Types,
			Tags:     api.convertTagIDsToStrings(c, filters.Tags),
			OwnerID:  api.convertOwnerIDToString(c, filters.OwnerID),
			DateFrom: filters.DateFrom,
			DateTo:   filters.DateTo,
			Limit:    filters.Limit,
			Offset:   filters.Offset,
		},
	}

	return &response, nil
}

// filterSearchResultsBasedOnPermissions filters the search results based on user permissions.
func (api *APIServices) filterSearchResultsBasedOnPermissions(
	c context.Context,
	results []db.SearchResult,
	user *db.User,
	workspace *db.Workspace,
) []db.SearchResult {
	if len(results) == 0 {
		return results
	}

	// Create async permission checks for all results
	permissionFutures := make([]utils.FutureResult[bool], len(results))
	for i, result := range results {
		// Capture the result value to avoid closure issues
		capturedResult := result
		permissionFutures[i] = utils.Async(func() (bool, error) {
			return api.hasPermissionForSearchResult(capturedResult, user, workspace), nil
		})
	}

	// Collect results that the user has permission to access
	filteredResults := make([]db.SearchResult, 0, len(results))
	for i, future := range permissionFutures {
		hasPermission, err := future.Await()
		if err != nil {
			// Log error but continue with other results
			api.Logger.ErrorContext(c, "Failed to check permission", "error", err, "result_index", i)
			continue
		}
		if hasPermission {
			filteredResults = append(filteredResults, results[i])
		}
	}

	return filteredResults
}

// hasPermissionForSearchResult checks if the user has permission to access the given search result.
func (api *APIServices) hasPermissionForSearchResult(
	result db.SearchResult,
	user *db.User,
	workspace *db.Workspace,
) bool {
	entityID, policyResource := api.getSearchResultEntityIDAndPolicyResource(result)
	if entityID == nil || policyResource == "" {
		return false
	}

	allowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		policyResource,
		entityID,
		db.PolicyActionRead,
	)
	return err == nil && allowed
}

// getSearchResultEntityIDAndPolicyResource extracts the entity ID and policy resource from a search result.
func (api *APIServices) getSearchResultEntityIDAndPolicyResource(result db.SearchResult) (*uint, db.PolicyResource) {
	switch result.Type {
	case irminmodels.WorkspaceSearchResultTypeRepository:
		if entity, ok := result.Entity.(*db.Repository); ok {
			return &entity.ID, db.PolicyResourceRepository
		}
	case irminmodels.WorkspaceSearchResultTypeRepositoryObject:
		if entity, ok := result.Entity.(*db.RepositoryObject); ok {
			return &entity.ID, db.PolicyResourceRepositoryObject
		}
	case irminmodels.WorkspaceSearchResultTypeConnection:
		if entity, ok := result.Entity.(*db.Connection); ok {
			return &entity.ID, db.PolicyResourceConnection
		}
	case irminmodels.WorkspaceSearchResultTypeQuery:
		if entity, ok := result.Entity.(*db.StoredQuery); ok {
			return &entity.ID, db.PolicyResourceQuery
		}
	case irminmodels.WorkspaceSearchResultTypeUser:
		if entity, ok := result.Entity.(*db.User); ok {
			return &entity.ID, db.PolicyResourceUser
		}
	case irminmodels.WorkspaceSearchResultTypeInvite:
		if entity, ok := result.Entity.(*db.Invite); ok {
			return &entity.ID, db.PolicyResourceInvite
		}
	case irminmodels.WorkspaceSearchResultTypeWorkflow:
		if entity, ok := result.Entity.(*db.Workflow); ok {
			return &entity.ID, db.PolicyResourceWorkflow
		}
	}
	return nil, ""
}

// convertToSearchResult converts a database search result to API format using existing formatters.
func (api *APIServices) convertToSearchResult(result db.SearchResult) (irminmodels.SearchResult, error) {
	searchResult := irminmodels.SearchResult{
		Type:      result.Type,
		Relevance: result.Relevance,
	}

	converter, exists := api.getEntityConverter(result.Type)
	if !exists {
		return searchResult, nil
	}

	return converter(result, searchResult)
}

// entityConverter is a function type for converting database entities to search results.
type entityConverter func(result db.SearchResult, searchResult irminmodels.SearchResult) (irminmodels.SearchResult, error)

// getEntityConverter returns the appropriate converter function for the given result type.
func (api *APIServices) getEntityConverter(
	resultType irminmodels.WorkspaceSearchResultType,
) (entityConverter, bool) {
	converters := map[irminmodels.WorkspaceSearchResultType]entityConverter{
		irminmodels.WorkspaceSearchResultTypeWorkflow:         api.convertWorkflowEntity,
		irminmodels.WorkspaceSearchResultTypeRepository:       api.convertRepositoryEntity,
		irminmodels.WorkspaceSearchResultTypeConnection:       api.convertConnectionEntity,
		irminmodels.WorkspaceSearchResultTypeQuery:            api.convertQueryEntity,
		irminmodels.WorkspaceSearchResultTypeUser:             api.convertUserEntity,
		irminmodels.WorkspaceSearchResultTypeRepositoryObject: api.convertRepositoryObjectEntity,
		irminmodels.WorkspaceSearchResultTypeInvite:           api.convertInviteEntity,
	}

	converter, exists := converters[resultType]
	return converter, exists
}

// convertWorkflowEntity converts a workflow entity to a search result.
func (api *APIServices) convertWorkflowEntity(
	result db.SearchResult,
	searchResult irminmodels.SearchResult,
) (irminmodels.SearchResult, error) {
	if result.Entity == nil {
		return searchResult, nil
	}

	workflow, ok := result.Entity.(*db.Workflow)
	if !ok {
		return searchResult, fmt.Errorf("expected *db.Workflow, got %T", result.Entity)
	}

	formattedWorkflow, err := formatter.FormatWorkflowResponse(api.DB, workflow, api.SQIDManager)
	if err != nil {
		return searchResult, err
	}
	searchResult.Workflow = formattedWorkflow
	return searchResult, nil
}

// convertRepositoryEntity converts a repository entity to a search result.
func (api *APIServices) convertRepositoryEntity(
	result db.SearchResult,
	searchResult irminmodels.SearchResult,
) (irminmodels.SearchResult, error) {
	if result.Entity == nil {
		return searchResult, nil
	}

	repository, ok := result.Entity.(*db.Repository)
	if !ok {
		return searchResult, fmt.Errorf("expected *db.Repository, got %T", result.Entity)
	}

	formattedRepository, err := formatter.FormatRepositoryResponse(repository, api.SQIDManager)
	if err != nil {
		return searchResult, err
	}
	searchResult.Repository = formattedRepository
	return searchResult, nil
}

// convertConnectionEntity converts a connection entity to a search result.
func (api *APIServices) convertConnectionEntity(
	result db.SearchResult,
	searchResult irminmodels.SearchResult,
) (irminmodels.SearchResult, error) {
	if result.Entity == nil {
		return searchResult, nil
	}

	connection, ok := result.Entity.(*db.Connection)
	if !ok {
		return searchResult, fmt.Errorf("expected *db.Connection, got %T", result.Entity)
	}

	formattedConnection, err := formatter.FormatConnectionResponse(connection, api.SQIDManager)
	if err != nil {
		return searchResult, err
	}
	searchResult.Connection = formattedConnection
	return searchResult, nil
}

// convertQueryEntity converts a query entity to a search result.
func (api *APIServices) convertQueryEntity(
	result db.SearchResult,
	searchResult irminmodels.SearchResult,
) (irminmodels.SearchResult, error) {
	if result.Entity == nil {
		return searchResult, nil
	}

	storedQuery, ok := result.Entity.(*db.StoredQuery)
	if !ok {
		return searchResult, fmt.Errorf("expected *db.StoredQuery, got %T", result.Entity)
	}

	formattedQuery, err := formatter.FormatStoredQueryResponse(storedQuery, api.SQIDManager)
	if err != nil {
		return searchResult, err
	}
	searchResult.Query = formattedQuery
	return searchResult, nil
}

// convertUserEntity converts a user entity to a search result.
func (api *APIServices) convertUserEntity(
	result db.SearchResult,
	searchResult irminmodels.SearchResult,
) (irminmodels.SearchResult, error) {
	if result.Entity == nil {
		return searchResult, nil
	}

	user, ok := result.Entity.(*db.User)
	if !ok {
		return searchResult, fmt.Errorf("expected *db.User, got %T", result.Entity)
	}

	formattedUser, err := formatter.FormatUserResponse(user, api.SQIDManager)
	if err != nil {
		return searchResult, err
	}
	searchResult.User = formattedUser
	return searchResult, nil
}

// convertRepositoryObjectEntity converts a repository object entity to a search result.
func (api *APIServices) convertRepositoryObjectEntity(
	result db.SearchResult,
	searchResult irminmodels.SearchResult,
) (irminmodels.SearchResult, error) {
	if result.Entity == nil {
		return searchResult, nil
	}

	repositoryObject, ok := result.Entity.(*db.RepositoryObject)
	if !ok {
		return searchResult, fmt.Errorf("expected *db.RepositoryObject, got %T", result.Entity)
	}

	formattedRepositoryObject, err := formatter.FormatRepositoryObjectResponse(
		repositoryObject,
		api.SQIDManager,
	)
	if err != nil {
		return searchResult, err
	}
	searchResult.RepositoryObject = formattedRepositoryObject
	return searchResult, nil
}

// convertInviteEntity converts an invite entity to a search result.
func (api *APIServices) convertInviteEntity(
	result db.SearchResult,
	searchResult irminmodels.SearchResult,
) (irminmodels.SearchResult, error) {
	if result.Entity == nil {
		return searchResult, nil
	}

	invite, ok := result.Entity.(*db.Invite)
	if !ok {
		return searchResult, fmt.Errorf("expected *db.Invite, got %T", result.Entity)
	}

	formattedInvite, err := formatter.FormatInviteResponse(invite, api.SQIDManager)
	if err != nil {
		return searchResult, err
	}
	searchResult.Invite = formattedInvite
	return searchResult, nil
}

// convertTagIDsToStrings converts []uint to []string using SQID encoding.
func (api *APIServices) convertTagIDsToStrings(c context.Context, tags []uint) []string {
	strTags := make([]string, 0, len(tags))
	for _, tagID := range tags {
		sqid, err := api.SQIDManager.Encode("tags", uint64(tagID))
		if err != nil {
			// Log error but continue with other tags
			api.Logger.ErrorContext(c, "Failed to encode tag SQID", "error", err, "tag_id", tagID)
			continue
		}
		strTags = append(strTags, sqid)
	}
	return strTags
}

// convertOwnerIDToString converts *uint to *string using SQID encoding.
func (api *APIServices) convertOwnerIDToString(c context.Context, ownerID *uint) *string {
	if ownerID == nil {
		return nil
	}
	sqid, err := api.SQIDManager.Encode("users", uint64(*ownerID))
	if err != nil {
		// Log error but return nil to indicate no owner
		api.Logger.ErrorContext(c, "Failed to encode owner SQID", "error", err, "owner_id", *ownerID)
		return nil
	}
	return &sqid
}

// calculateAccessibleSearchResultsCount efficiently calculates the total count of accessible search results.
func (api *APIServices) calculateAccessibleSearchResultsCount(
	c context.Context,
	workspaceID uint,
	user *db.User,
	workspace *db.Workspace,
	filters db.SearchFilters,
	totalCount int,
	currentPageAccessibleCount int,
) int {
	// If we have a small result set, we can afford to get all results and filter them
	if totalCount <= SearchDefaultLimit {
		// Get all results without pagination
		allFilters := filters
		allFilters.Limit = totalCount
		allFilters.Offset = 0

		allResults, _, err := api.DB.SearchWorkspace(workspaceID, allFilters)
		if err != nil {
			api.Logger.ErrorContext(
				c,
				"Failed to get all search results for counting",
				"error",
				err,
				"workspace_id",
				workspaceID,
			)
			return currentPageAccessibleCount // Fallback to current page count
		}

		// Apply permission filtering
		accessibleResults := api.filterSearchResultsBasedOnPermissions(c, allResults, user, workspace)
		return len(accessibleResults)
	}

	// For larger result sets, use a more efficient approach
	// Calculate the permission ratio from the current page and apply it to the total
	if filters.Limit > 0 && currentPageAccessibleCount > 0 {
		permissionRatio := float64(currentPageAccessibleCount) / float64(filters.Limit)
		estimatedAccessibleCount := int(float64(totalCount) * permissionRatio)

		// Ensure the estimate is reasonable
		if estimatedAccessibleCount > totalCount {
			estimatedAccessibleCount = totalCount
		}
		if estimatedAccessibleCount < currentPageAccessibleCount {
			estimatedAccessibleCount = currentPageAccessibleCount
		}

		return estimatedAccessibleCount
	}

	// Fallback: if we can't calculate a ratio, use a conservative estimate
	// This assumes that if the user has access to some results, they likely have access to a reasonable portion
	if currentPageAccessibleCount > 0 {
		// Assume user has access to at least the current page worth of results
		return currentPageAccessibleCount
	}

	// If no accessible results on current page, assume no access to any
	return 0
}
