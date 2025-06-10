package controllers

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/utils"
	"strconv"
	"strings"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

const (
	// defaultLimit is the default number of results to return.
	defaultLimit = 20
	// defaultOffset is the default offset to start from.
	defaultOffset = 0
)

// WorkspaceSearch handles workspace-wide search requests.
func (api *APIControllers) WorkspaceSearch(c fiber.Ctx) error {
	// Get workspace from context (set by middleware)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	user, userOk := c.Locals("user").(*db.User)
	if !workspaceOk || !userOk {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{"Workspace not found"},
		})
	}

	// Parse query parameters
	filters, err := api.parseSearchFilters(c)
	if err != nil {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{err.Error()},
		})
	}

	// Perform the search
	results, total, err := api.DB.SearchWorkspace(workspace.ID, filters)
	if err != nil {
		api.Logger.Error("Failed to search workspace", "error", err, "workspace_id", workspace.ID)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{"Search failed"},
		})
	}

	// Make sure the user has read access to the items being returned
	filteredResults := api.filterSearchResultsBasedOnPermissions(results, user, workspace)

	// Convert database results to API response format
	searchResults := make([]irminmodels.SearchResult, 0, len(filteredResults))
	for _, result := range filteredResults {
		searchResult, convertErr := api.convertToSearchResult(result)
		if convertErr != nil {
			api.Logger.Error("Failed to convert search result", "error", convertErr, "result_type", result.Type)
			continue // Skip this result but continue with others
		}
		searchResults = append(searchResults, searchResult)
	}

	response := irminmodels.SearchResponse{
		Results: searchResults,
		Total:   total,
		Query:   filters.Query,
		Filters: irminmodels.SearchFilters{
			Query:    filters.Query,
			Types:    filters.Types,
			Tags:     api.convertTagIDsToStrings(filters.Tags),
			OwnerID:  api.convertOwnerIDToString(filters.OwnerID),
			DateFrom: filters.DateFrom,
			DateTo:   filters.DateTo,
			Limit:    filters.Limit,
			Offset:   filters.Offset,
		},
	}

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: response,
	})
}

// filterSearchResultsBasedOnPermissions filters the search results based on user permissions.
func (api *APIControllers) filterSearchResultsBasedOnPermissions(
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
			return api.hasPermissionForResult(capturedResult, user, workspace), nil
		})
	}

	// Collect results that the user has permission to access
	filteredResults := make([]db.SearchResult, 0, len(results))
	for i, future := range permissionFutures {
		hasPermission, err := future.Await()
		if err != nil {
			// Log error but continue with other results
			api.Logger.Error("Failed to check permission", "error", err, "result_index", i)
			continue
		}
		if hasPermission {
			filteredResults = append(filteredResults, results[i])
		}
	}

	return filteredResults
}

// hasPermissionForResult checks if the user has permission to access the given search result.
func (api *APIControllers) hasPermissionForResult(
	result db.SearchResult,
	user *db.User,
	workspace *db.Workspace,
) bool {
	entityID, policyResource := api.getEntityIDAndPolicyResource(result)
	if entityID == nil || policyResource == "" {
		return false
	}

	allowed, err := api.permissionService.IsAllowed(
		user,
		workspace,
		policyResource,
		entityID,
		db.PolicyActionRead,
	)
	return err == nil && allowed
}

// getEntityIDAndPolicyResource extracts the entity ID and policy resource from a search result.
func (api *APIControllers) getEntityIDAndPolicyResource(result db.SearchResult) (*uint, db.PolicyResource) {
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

// parseSearchFilters extracts and validates search parameters from the request.
func (api *APIControllers) parseSearchFilters(c fiber.Ctx) (db.SearchFilters, error) {
	filters := db.SearchFilters{
		Query:  strings.TrimSpace(c.Query("q", "")),
		Limit:  defaultLimit,
		Offset: defaultOffset,
	}

	if err := api.parseTypesFilter(c, &filters); err != nil {
		return filters, err
	}

	api.parseTagsFilter(c, &filters)
	api.parseOwnerFilter(c, &filters)
	api.parseDateFilters(c, &filters)
	api.parsePaginationFilters(c, &filters)

	return filters, nil
}

// parseTypesFilter parses and validates the types filter parameter.
func (api *APIControllers) parseTypesFilter(c fiber.Ctx, filters *db.SearchFilters) error {
	typesStr := c.Query("types")
	if typesStr == "" {
		return nil
	}

	filters.Types = strings.Split(typesStr, ",")

	validTypes := map[string]bool{
		"workflow":          true,
		"repository":        true,
		"connection":        true,
		"query":             true,
		"user":              true,
		"repository_object": true,
		"invite":            true,
	}

	for _, t := range filters.Types {
		if !validTypes[strings.TrimSpace(t)] {
			return fiber.NewError(fiber.StatusBadRequest, "Invalid type: "+t)
		}
	}

	return nil
}

// parseTagsFilter parses the tags filter parameter.
func (api *APIControllers) parseTagsFilter(c fiber.Ctx, filters *db.SearchFilters) {
	tagsStr := c.Query("tags")
	if tagsStr == "" {
		return
	}

	tagStrs := strings.Split(tagsStr, ",")
	filters.Tags = make([]uint, 0, len(tagStrs))

	for _, tagStr := range tagStrs {
		tagID, err := api.SQIDManager.Decode("tags", strings.TrimSpace(tagStr))
		if err != nil {
			continue
		}
		filters.Tags = append(filters.Tags, uint(tagID))
	}
}

// parseOwnerFilter parses the owner filter parameter.
func (api *APIControllers) parseOwnerFilter(c fiber.Ctx, filters *db.SearchFilters) {
	ownerStr := c.Query("owner")
	if ownerStr == "" {
		return
	}

	// Parse owner ID from sqid
	ownerID, err := api.SQIDManager.Decode("users", ownerStr)
	if err != nil {
		return
	}

	ownerIDUint := uint(ownerID)
	filters.OwnerID = &ownerIDUint
}

// parseDateFilters parses the date filter parameters.
func (api *APIControllers) parseDateFilters(c fiber.Ctx, filters *db.SearchFilters) {
	if dateFrom := c.Query("date_from"); dateFrom != "" {
		filters.DateFrom = &dateFrom
	}
	if dateTo := c.Query("date_to"); dateTo != "" {
		filters.DateTo = &dateTo
	}
}

// parsePaginationFilters parses the pagination filter parameters.
func (api *APIControllers) parsePaginationFilters(c fiber.Ctx, filters *db.SearchFilters) {
	if limitStr := c.Query("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 && limit <= 100 {
			filters.Limit = limit
		}
	}
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if offset, err := strconv.Atoi(offsetStr); err == nil && offset >= 0 {
			filters.Offset = offset
		}
	}
}

// convertToSearchResult converts a database search result to API format using existing formatters.
func (api *APIControllers) convertToSearchResult(result db.SearchResult) (irminmodels.SearchResult, error) {
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
func (api *APIControllers) getEntityConverter(
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
func (api *APIControllers) convertWorkflowEntity(
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
func (api *APIControllers) convertRepositoryEntity(
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
func (api *APIControllers) convertConnectionEntity(
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
func (api *APIControllers) convertQueryEntity(
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
func (api *APIControllers) convertUserEntity(
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
func (api *APIControllers) convertRepositoryObjectEntity(
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
func (api *APIControllers) convertInviteEntity(
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
func (api *APIControllers) convertTagIDsToStrings(tags []uint) []string {
	strTags := make([]string, 0, len(tags))
	for _, tagID := range tags {
		sqid, err := api.SQIDManager.Encode("tags", uint64(tagID))
		if err != nil {
			// Log error but continue with other tags
			api.Logger.Error("Failed to encode tag SQID", "error", err, "tag_id", tagID)
			continue
		}
		strTags = append(strTags, sqid)
	}
	return strTags
}

// convertOwnerIDToString converts *uint to *string using SQID encoding.
func (api *APIControllers) convertOwnerIDToString(ownerID *uint) *string {
	if ownerID == nil {
		return nil
	}
	sqid, err := api.SQIDManager.Encode("users", uint64(*ownerID))
	if err != nil {
		// Log error but return nil to indicate no owner
		api.Logger.Error("Failed to encode owner SQID", "error", err, "owner_id", *ownerID)
		return nil
	}
	return &sqid
}
