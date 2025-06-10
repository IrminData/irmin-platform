package db

import (
	"sort"
	"strings"
	"sync"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// Search-related constants.
const (
	// Minimum relevance threshold for filtering search results.
	MinRelevanceThreshold = 0.1

	// Entity type priorities (lower = higher priority).
	WorkflowPriority         = 1
	RepositoryPriority       = 2
	ConnectionPriority       = 3
	QueryPriority            = 4
	RepositoryObjectPriority = 5
	UserPriority             = 6
	InvitePriority           = 7
	DefaultPriority          = 999
)

type SearchResult struct {
	Type      irminmodels.WorkspaceSearchResultType
	Relevance float64
	Entity    any
}

type SearchFilters struct {
	Query    string
	Types    []string
	Tags     []uint
	OwnerID  *uint
	DateFrom *string
	DateTo   *string
	Limit    int
	Offset   int
}

// SearchWorkspace performs a full-text search across all entities in a workspace.
func (d *Database) SearchWorkspace(
	workspaceID uint,
	filters SearchFilters,
) ([]SearchResult, int, error) {
	searchQuery := strings.TrimSpace(filters.Query)

	// Perform all searches concurrently for better performance
	results, err := d.performAllSearchesConcurrent(workspaceID, searchQuery, filters)
	if err != nil {
		return nil, 0, err
	}

	// Apply relevance boosting for exact matches
	sorter := &SearchResultSorter{}
	results = sorter.BoostRelevanceForExactMatches(results, searchQuery)

	// Sort results by relevance
	results = sorter.SortByRelevance(results)

	// Filter out low-relevance results if query is provided
	if searchQuery != "" {
		results = sorter.FilterByMinimumRelevance(results, MinRelevanceThreshold)
	}

	// Calculate total count
	totalCount := len(results)

	// Apply pagination using switch statement
	results = d.applyPagination(results, filters.Offset, filters.Limit)

	return results, totalCount, nil
}

// performAllSearchesConcurrent executes searches for all requested entity types concurrently.
func (d *Database) performAllSearchesConcurrent(
	workspaceID uint,
	searchQuery string,
	filters SearchFilters,
) ([]SearchResult, error) {
	// Define search operations
	searchOperations := []struct {
		entityType irminmodels.WorkspaceSearchResultType
		searchFunc func(uint, string, SearchFilters) ([]SearchResult, error)
	}{
		{irminmodels.WorkspaceSearchResultTypeWorkflow, d.searchWorkflows},
		{irminmodels.WorkspaceSearchResultTypeRepository, d.searchRepositories},
		{irminmodels.WorkspaceSearchResultTypeConnection, d.searchConnections},
		{irminmodels.WorkspaceSearchResultTypeQuery, d.searchStoredQueries},
		{irminmodels.WorkspaceSearchResultTypeUser, d.searchUsers},
		{irminmodels.WorkspaceSearchResultTypeRepositoryObject, d.searchRepositoryObjects},
		{irminmodels.WorkspaceSearchResultTypeInvite, d.searchInvites},
	}

	var results []SearchResult
	var mu sync.Mutex
	var wg sync.WaitGroup
	var searchErrors []error

	// Execute searches for requested types concurrently
	for _, op := range searchOperations {
		if shouldSearchType(op.entityType, filters.Types) {
			wg.Add(1)
			go func(operation struct {
				entityType irminmodels.WorkspaceSearchResultType
				searchFunc func(uint, string, SearchFilters) ([]SearchResult, error)
			}) {
				defer wg.Done()
				searchResults, err := operation.searchFunc(workspaceID, searchQuery, filters)
				mu.Lock()
				if err != nil {
					searchErrors = append(searchErrors, err)
				} else {
					results = append(results, searchResults...)
				}
				mu.Unlock()
			}(op)
		}
	}

	wg.Wait()

	// Check for any errors
	if len(searchErrors) > 0 {
		return nil, searchErrors[0] // Return the first error
	}

	return results, nil
}

// applyPagination applies pagination to search results using a switch statement.
func (d *Database) applyPagination(results []SearchResult, offset, limit int) []SearchResult {
	start := offset
	end := start + limit

	switch {
	case start >= len(results):
		return []SearchResult{}
	case end > len(results):
		return results[start:]
	default:
		return results[start:end]
	}
}

// createSearchResult creates a search result with proper relevance calculation.
func createSearchResult(
	entityType irminmodels.WorkspaceSearchResultType,
	query string,
	entity interface{},
	relevanceScore float64,
) SearchResult {
	// Use the actual relevance score from the database if available
	relevance := relevanceScore
	if query != "" && relevanceScore == 0 {
		relevance = 0.5 // Fallback relevance
	}

	result := SearchResult{
		Type:      entityType,
		Relevance: relevance,
	}

	// Set the appropriate entity field based on type
	switch entityType {
	case irminmodels.WorkspaceSearchResultTypeWorkflow:
		if w, ok := entity.(*Workflow); ok {
			result.Entity = w
		}
	case irminmodels.WorkspaceSearchResultTypeRepository:
		if r, ok := entity.(*Repository); ok {
			result.Entity = r
		}
	case irminmodels.WorkspaceSearchResultTypeConnection:
		if c, ok := entity.(*Connection); ok {
			result.Entity = c
		}
	case irminmodels.WorkspaceSearchResultTypeQuery:
		if q, ok := entity.(*StoredQuery); ok {
			result.Entity = q
		}
	case irminmodels.WorkspaceSearchResultTypeUser:
		if u, ok := entity.(*User); ok {
			result.Entity = u
		}
	case irminmodels.WorkspaceSearchResultTypeRepositoryObject:
		if ro, ok := entity.(*RepositoryObject); ok {
			result.Entity = ro
		}
	case irminmodels.WorkspaceSearchResultTypeInvite:
		if i, ok := entity.(*Invite); ok {
			result.Entity = i
		}
	}

	return result
}

// searchWorkflows searches workflows using PostgreSQL full-text search with proper relevance scoring.
//
//nolint:dupl // This is not a duplicate, but a similar function to other search handlers.
func (d *Database) searchWorkflows(
	workspaceID uint,
	query string,
	filters SearchFilters,
) ([]SearchResult, error) {
	var workflows []struct {
		Workflow
		RelevanceScore float64 `json:"relevance_score"`
	}
	var results []SearchResult

	// Build the query with relevance scoring
	db := d.Model(&Workflow{}).Where("workspace_id = ? AND workflows.deleted_at IS NULL", workspaceID)

	// Add search condition with relevance scoring if query is provided
	if query != "" {
		db = db.Where(
			"to_tsvector('english', name || ' ' || description || ' ' || COALESCE(documentation, '')) @@ plainto_tsquery('english', ?)",
			query,
		).Select("workflows.*, ts_rank(to_tsvector('english', name || ' ' || description || ' ' || COALESCE(documentation, '')), plainto_tsquery('english', ?)) as relevance_score", query)
	} else {
		db = db.Select("workflows.*, 1.0 as relevance_score")
	}

	// Add filters
	if filters.OwnerID != nil {
		db = db.Where("owner_id = ?", *filters.OwnerID)
	}
	if filters.DateFrom != nil {
		db = db.Where("created_at >= ?", *filters.DateFrom)
	}
	if filters.DateTo != nil {
		db = db.Where("created_at <= ?", *filters.DateTo)
	}

	db = db.Preload("Owner")

	// Add tag filtering
	if len(filters.Tags) > 0 {
		db = db.Joins("JOIN workflow_tags ON workflows.id = workflow_tags.workflow_id").
			Where("workflow_tags.tag_id IN ?", filters.Tags)
	}

	err := db.Order("relevance_score DESC, created_at DESC").Find(&workflows).Error
	if err != nil {
		return nil, err
	}

	// Load tags separately for each workflow to avoid junction table issues
	for i := range workflows {
		tags, getErr := d.GetWorkflowTags(workflows[i].ID)
		if getErr != nil {
			return nil, getErr
		}
		workflows[i].Tags = tags
	}

	// Convert to search results
	for _, workflow := range workflows {
		result := createSearchResult(
			irminmodels.WorkspaceSearchResultTypeWorkflow,
			query,
			&workflow.Workflow,
			workflow.RelevanceScore,
		)
		results = append(results, result)
	}

	return results, nil
}

// searchRepositories searches repositories using PostgreSQL full-text search with proper relevance scoring.
//
//nolint:dupl // This is not a duplicate, but a similar function to other search handlers.
func (d *Database) searchRepositories(
	workspaceID uint,
	query string,
	filters SearchFilters,
) ([]SearchResult, error) {
	var repositories []struct {
		Repository
		RelevanceScore float64 `json:"relevance_score"`
	}
	var results []SearchResult

	// Build the query with relevance scoring
	db := d.Model(&Repository{}).Where("workspace_id = ? AND repositories.deleted_at IS NULL", workspaceID)

	// Add search condition with relevance scoring if query is provided
	if query != "" {
		db = db.Where(
			"to_tsvector('english', name || ' ' || description || ' ' || COALESCE(documentation, '')) @@ plainto_tsquery('english', ?)",
			query,
		).Select("repositories.*, ts_rank(to_tsvector('english', name || ' ' || description || ' ' || COALESCE(documentation, '')), plainto_tsquery('english', ?)) as relevance_score", query)
	} else {
		db = db.Select("repositories.*, 1.0 as relevance_score")
	}

	// Add filters
	if filters.OwnerID != nil {
		db = db.Where("owner_id = ?", *filters.OwnerID)
	}
	if filters.DateFrom != nil {
		db = db.Where("created_at >= ?", *filters.DateFrom)
	}
	if filters.DateTo != nil {
		db = db.Where("created_at <= ?", *filters.DateTo)
	}

	db = db.Preload("Owner")

	// Add tag filtering
	if len(filters.Tags) > 0 {
		db = db.Joins("JOIN repository_tags ON repositories.id = repository_tags.repository_id").
			Where("repository_tags.tag_id IN ?", filters.Tags)
	}

	err := db.Order("relevance_score DESC, created_at DESC").Find(&repositories).Error
	if err != nil {
		return nil, err
	}

	// Load tags separately for each repository to avoid junction table issues
	for i := range repositories {
		tags, getErr := d.GetRepositoryTags(repositories[i].ID)
		if getErr != nil {
			return nil, getErr
		}
		repositories[i].Tags = tags
	}

	// Convert to search results
	for _, repository := range repositories {
		result := createSearchResult(
			irminmodels.WorkspaceSearchResultTypeRepository,
			query,
			&repository.Repository,
			repository.RelevanceScore,
		)
		results = append(results, result)
	}

	return results, nil
}

// searchConnections searches connections using PostgreSQL full-text search with proper relevance scoring.
//

func (d *Database) searchConnections(
	workspaceID uint,
	query string,
	filters SearchFilters,
) ([]SearchResult, error) {
	var connections []struct {
		Connection
		RelevanceScore float64 `json:"relevance_score"`
	}
	var results []SearchResult

	// Build the query with relevance scoring
	db := d.Model(&Connection{}).Where("workspace_id = ? AND connections.deleted_at IS NULL", workspaceID).
		Preload("Owner").Preload("Connector")

	// Add search condition with relevance scoring if query is provided
	if query != "" {
		db = db.Where(
			"to_tsvector('english', name || ' ' || description) @@ plainto_tsquery('english', ?)",
			query,
		).Select("connections.*, ts_rank(to_tsvector('english', name || ' ' || description), plainto_tsquery('english', ?)) as relevance_score", query)
	} else {
		db = db.Select("connections.*, 1.0 as relevance_score")
	}

	// Add filters
	if filters.OwnerID != nil {
		db = db.Where("owner_id = ?", *filters.OwnerID)
	}
	if filters.DateFrom != nil {
		db = db.Where("created_at >= ?", *filters.DateFrom)
	}
	if filters.DateTo != nil {
		db = db.Where("created_at <= ?", *filters.DateTo)
	}

	// Add tag filtering
	if len(filters.Tags) > 0 {
		db = db.Joins("JOIN connection_tags ON connections.id = connection_tags.connection_id").
			Where("connection_tags.tag_id IN ?", filters.Tags)
	}

	err := db.Order("relevance_score DESC, created_at DESC").Find(&connections).Error
	if err != nil {
		return nil, err
	}

	// Load tags separately for each connection to avoid junction table issues
	for i := range connections {
		tags, getErr := d.GetConnectionTags(connections[i].ID)
		if getErr != nil {
			return nil, getErr
		}
		connections[i].Tags = tags
	}

	// Convert to search results
	for _, connection := range connections {
		result := createSearchResult(
			irminmodels.WorkspaceSearchResultTypeConnection,
			query,
			&connection.Connection,
			connection.RelevanceScore,
		)
		results = append(results, result)
	}

	return results, nil
}

// searchStoredQueries searches stored queries using PostgreSQL full-text search with proper relevance scoring.
//
//nolint:dupl // This is not a duplicate, but a similar function to other search handlers.
func (d *Database) searchStoredQueries(
	workspaceID uint,
	query string,
	filters SearchFilters,
) ([]SearchResult, error) {
	var storedQueries []struct {
		StoredQuery
		RelevanceScore float64 `json:"relevance_score"`
	}
	var results []SearchResult

	// Build the query with relevance scoring
	db := d.Model(&StoredQuery{}).Where("workspace_id = ? AND stored_queries.deleted_at IS NULL", workspaceID)

	// Add search condition with relevance scoring if query is provided
	if query != "" {
		db = db.Where(
			"to_tsvector('english', name || ' ' || description || ' ' || COALESCE(sql, '')) @@ plainto_tsquery('english', ?)",
			query,
		).Select("stored_queries.*, ts_rank(to_tsvector('english', name || ' ' || description || ' ' || COALESCE(sql, '')), plainto_tsquery('english', ?)) as relevance_score", query)
	} else {
		db = db.Select("stored_queries.*, 1.0 as relevance_score")
	}

	// Add filters
	if filters.OwnerID != nil {
		db = db.Where("owner_id = ?", *filters.OwnerID)
	}
	if filters.DateFrom != nil {
		db = db.Where("created_at >= ?", *filters.DateFrom)
	}
	if filters.DateTo != nil {
		db = db.Where("created_at <= ?", *filters.DateTo)
	}

	db = db.Preload("Owner")

	// Add tag filtering
	if len(filters.Tags) > 0 {
		db = db.Joins("JOIN query_tags ON stored_queries.id = query_tags.stored_query_id").
			Where("query_tags.tag_id IN ?", filters.Tags)
	}

	err := db.Order("relevance_score DESC, created_at DESC").Find(&storedQueries).Error
	if err != nil {
		return nil, err
	}

	// Load tags separately for each stored query to avoid junction table issues
	for i := range storedQueries {
		tags, getErr := d.GetQueryTags(storedQueries[i].ID)
		if getErr != nil {
			return nil, getErr
		}
		storedQueries[i].Tags = tags
	}

	// Convert to search results
	for _, storedQuery := range storedQueries {
		result := createSearchResult(
			irminmodels.WorkspaceSearchResultTypeQuery,
			query,
			&storedQuery.StoredQuery,
			storedQuery.RelevanceScore,
		)
		results = append(results, result)
	}

	return results, nil
}

// searchUsers searches users in a workspace with proper relevance scoring.
func (d *Database) searchUsers(
	workspaceID uint,
	query string,
	filters SearchFilters,
) ([]SearchResult, error) {
	var users []struct {
		User
		RelevanceScore float64 `json:"relevance_score"`
	}
	var results []SearchResult

	// Build the query with relevance scoring
	db := d.Model(&User{}).Joins("JOIN workspace_users ON users.id = workspace_users.user_id").
		Where("workspace_users.workspace_id = ? AND users.deleted_at IS NULL", workspaceID)

	// Add search condition with relevance scoring if query is provided
	if query != "" {
		db = db.Where(
			"to_tsvector('english', first_name || ' ' || last_name || ' ' || email || ' ' || COALESCE(company, '')) @@ plainto_tsquery('english', ?)",
			query,
		).Select("users.*, ts_rank(to_tsvector('english', first_name || ' ' || last_name || ' ' || email || ' ' || COALESCE(company, '')), plainto_tsquery('english', ?)) as relevance_score", query)
	} else {
		db = db.Select("users.*, 1.0 as relevance_score")
	}

	// Add date filters if provided
	if filters.DateFrom != nil {
		db = db.Where("users.created_at >= ?", *filters.DateFrom)
	}
	if filters.DateTo != nil {
		db = db.Where("users.created_at <= ?", *filters.DateTo)
	}

	err := db.Order("relevance_score DESC, users.created_at DESC").Find(&users).Error
	if err != nil {
		return nil, err
	}

	// Convert to search results
	for _, user := range users {
		result := createSearchResult(irminmodels.WorkspaceSearchResultTypeUser, query, &user.User, user.RelevanceScore)
		results = append(results, result)
	}

	return results, nil
}

// searchRepositoryObjects searches repository objects using PostgreSQL full-text search with proper relevance scoring.
func (d *Database) searchRepositoryObjects(
	workspaceID uint,
	query string,
	filters SearchFilters,
) ([]SearchResult, error) {
	var repositoryObjects []struct {
		RepositoryObject
		RelevanceScore float64 `json:"relevance_score"`
	}
	var results []SearchResult

	// Build the query with relevance scoring
	db := d.Model(&RepositoryObject{}).Preload("Repository").Preload("Parent").
		Joins("JOIN repositories ON repository_objects.repository_id = repositories.id").
		Where("repositories.workspace_id = ? AND repository_objects.deleted_at IS NULL", workspaceID)

	// Add search condition with relevance scoring if query is provided
	if query != "" {
		db = db.Where(
			"to_tsvector('english', repository_objects.name || ' ' || repository_objects.path || ' ' || COALESCE(repository_objects.content_type, '')) @@ plainto_tsquery('english', ?)",
			query,
		).Select("repository_objects.*, ts_rank(to_tsvector('english', repository_objects.name || ' ' || repository_objects.path || ' ' || COALESCE(repository_objects.content_type, '')), plainto_tsquery('english', ?)) as relevance_score", query)
	} else {
		db = db.Select("repository_objects.*, 1.0 as relevance_score")
	}

	// Add filters
	if filters.DateFrom != nil {
		db = db.Where("repository_objects.created_at >= ?", *filters.DateFrom)
	}
	if filters.DateTo != nil {
		db = db.Where("repository_objects.created_at <= ?", *filters.DateTo)
	}

	// Add tag filtering
	if len(filters.Tags) > 0 {
		db = db.Joins("JOIN repository_object_tags ON repository_objects.id = repository_object_tags.repository_object_id").
			Where("repository_object_tags.tag_id IN ?", filters.Tags)
	}

	err := db.Order("relevance_score DESC, repository_objects.created_at DESC").Find(&repositoryObjects).Error
	if err != nil {
		return nil, err
	}

	// Load tags separately for each repository object to avoid junction table issues
	for i := range repositoryObjects {
		tags, getErr := d.GetRepositoryObjectTags(repositoryObjects[i].ID)
		if getErr != nil {
			return nil, getErr
		}
		repositoryObjects[i].Tags = tags
	}

	// Convert to search results
	for _, repositoryObject := range repositoryObjects {
		result := createSearchResult(
			irminmodels.WorkspaceSearchResultTypeRepositoryObject,
			query,
			&repositoryObject.RepositoryObject,
			repositoryObject.RelevanceScore,
		)
		results = append(results, result)
	}

	return results, nil
}

// searchInvites searches invites using PostgreSQL full-text search with proper relevance scoring.
//

func (d *Database) searchInvites(
	workspaceID uint,
	query string,
	filters SearchFilters,
) ([]SearchResult, error) {
	var invites []struct {
		Invite
		RelevanceScore float64 `json:"relevance_score"`
	}
	var results []SearchResult

	// Build the query with relevance scoring
	db := d.Model(&Invite{}).Preload("InvitedBy").Preload("Workspace").Preload("Role").
		Where("workspace_id = ? AND invites.deleted_at IS NULL", workspaceID)

	// Add search condition with relevance scoring if query is provided
	if query != "" {
		// For invites, use a simpler search approach since the searchable fields are limited
		queryLower := strings.ToLower(query)
		db = db.Where(
			"(LOWER(email) LIKE ? OR LOWER(COALESCE(clerk_id, '')) LIKE ?)",
			"%"+queryLower+"%",
			"%"+queryLower+"%",
		).Select("invites.*, CASE WHEN LOWER(email) = ? THEN 1.0 WHEN LOWER(email) LIKE ? THEN 0.8 ELSE 0.5 END as relevance_score",
			queryLower, queryLower+"%")
	} else {
		db = db.Select("invites.*, 1.0 as relevance_score")
	}

	// Add date filters if provided
	if filters.DateFrom != nil {
		db = db.Where("created_at >= ?", *filters.DateFrom)
	}
	if filters.DateTo != nil {
		db = db.Where("created_at <= ?", *filters.DateTo)
	}

	err := db.Order("relevance_score DESC, created_at DESC").Find(&invites).Error
	if err != nil {
		return nil, err
	}

	// Convert to search results
	for _, invite := range invites {
		result := createSearchResult(
			irminmodels.WorkspaceSearchResultTypeInvite,
			query,
			&invite.Invite,
			invite.RelevanceScore,
		)
		results = append(results, result)
	}

	return results, nil
}

// Helper function

func shouldSearchType(entityType irminmodels.WorkspaceSearchResultType, types []string) bool {
	if len(types) == 0 {
		return true // Search all types if none specified
	}
	for _, t := range types {
		if strings.TrimSpace(t) == string(entityType) {
			return true
		}
	}
	return false
}

// SearchResultSorter provides methods for sorting and merging search results.
type SearchResultSorter struct{}

// SortByRelevance sorts search results by relevance score in descending order.
func (s *SearchResultSorter) SortByRelevance(results []SearchResult) []SearchResult {
	sorted := make([]SearchResult, len(results))
	copy(sorted, results)

	sort.Slice(sorted, func(i, j int) bool {
		// Primary sort by relevance score
		if sorted[i].Relevance != sorted[j].Relevance {
			return sorted[i].Relevance > sorted[j].Relevance
		}

		// Secondary sort by entity type priority
		priorityI := s.getEntityTypePriority(sorted[i].Type)
		priorityJ := s.getEntityTypePriority(sorted[j].Type)
		if priorityI != priorityJ {
			return priorityI < priorityJ
		}

		// Tertiary sort by creation date (newer first)
		return s.getEntityCreatedAt(sorted[i]) > s.getEntityCreatedAt(sorted[j])
	})

	return sorted
}

// getEntityTypePriority returns a priority number for entity types (lower = higher priority).
func (s *SearchResultSorter) getEntityTypePriority(entityType irminmodels.WorkspaceSearchResultType) int {
	switch entityType {
	case irminmodels.WorkspaceSearchResultTypeWorkflow:
		return WorkflowPriority
	case irminmodels.WorkspaceSearchResultTypeRepository:
		return RepositoryPriority
	case irminmodels.WorkspaceSearchResultTypeConnection:
		return ConnectionPriority
	case irminmodels.WorkspaceSearchResultTypeQuery:
		return QueryPriority
	case irminmodels.WorkspaceSearchResultTypeRepositoryObject:
		return RepositoryObjectPriority
	case irminmodels.WorkspaceSearchResultTypeUser:
		return UserPriority
	case irminmodels.WorkspaceSearchResultTypeInvite:
		return InvitePriority
	default:
		return DefaultPriority
	}
}

// getEntityCreatedAt extracts the creation timestamp from an entity.
func (s *SearchResultSorter) getEntityCreatedAt(result SearchResult) int64 {
	switch entity := result.Entity.(type) {
	case *Workflow:
		return entity.CreatedAt.Unix()
	case *Repository:
		return entity.CreatedAt.Unix()
	case *Connection:
		return entity.CreatedAt.Unix()
	case *StoredQuery:
		return entity.CreatedAt.Unix()
	case *User:
		return entity.CreatedAt.Unix()
	case *RepositoryObject:
		return entity.CreatedAt.Unix()
	case *Invite:
		return entity.CreatedAt.Unix()
	default:
		return 0
	}
}

// MergeAndDeduplicate merges search results from multiple sources and removes duplicates.
func (s *SearchResultSorter) MergeAndDeduplicate(resultsList ...[]SearchResult) []SearchResult {
	seen := make(map[string]bool)
	var merged []SearchResult

	for _, results := range resultsList {
		for _, result := range results {
			key := s.generateEntityKey(result)
			if !seen[key] {
				seen[key] = true
				merged = append(merged, result)
			}
		}
	}

	return merged
}

// generateEntityKey creates a unique key for an entity to identify duplicates.
func (s *SearchResultSorter) generateEntityKey(result SearchResult) string {
	switch entity := result.Entity.(type) {
	case *Workflow:
		return "workflow:" + string(result.Type) + ":" + string(rune(entity.ID))
	case *Repository:
		return "repository:" + string(result.Type) + ":" + string(rune(entity.ID))
	case *Connection:
		return "connection:" + string(result.Type) + ":" + string(rune(entity.ID))
	case *StoredQuery:
		return "query:" + string(result.Type) + ":" + string(rune(entity.ID))
	case *User:
		return "user:" + string(result.Type) + ":" + string(rune(entity.ID))
	case *RepositoryObject:
		return "repo_object:" + string(result.Type) + ":" + string(rune(entity.ID))
	case *Invite:
		return "invite:" + string(result.Type) + ":" + string(rune(entity.ID))
	default:
		return "unknown:" + string(result.Type)
	}
}

// BoostRelevanceForExactMatches boosts relevance scores for exact matches.
func (s *SearchResultSorter) BoostRelevanceForExactMatches(results []SearchResult, query string) []SearchResult {
	if query == "" {
		return results
	}

	queryLower := strings.ToLower(query)
	boosted := make([]SearchResult, len(results))

	for i, result := range results {
		boosted[i] = result

		// Check for exact matches in entity names
		if s.hasExactMatch(result, queryLower) {
			boosted[i].Relevance *= 1.5 // Boost by 50%
		}

		// Check for prefix matches
		if s.hasPrefixMatch(result, queryLower) {
			boosted[i].Relevance *= 1.2 // Boost by 20%
		}
	}

	return boosted
}

// hasExactMatch checks if an entity has an exact match with the query.
func (s *SearchResultSorter) hasExactMatch(result SearchResult, queryLower string) bool {
	switch entity := result.Entity.(type) {
	case *Workflow:
		return strings.ToLower(entity.Name) == queryLower
	case *Repository:
		return strings.ToLower(entity.Name) == queryLower
	case *Connection:
		return strings.ToLower(entity.Name) == queryLower
	case *StoredQuery:
		return strings.ToLower(entity.Name) == queryLower
	case *User:
		return strings.ToLower(entity.Email) == queryLower ||
			strings.ToLower(entity.FirstName+" "+entity.LastName) == queryLower
	case *RepositoryObject:
		return strings.ToLower(entity.Name) == queryLower
	case *Invite:
		return strings.ToLower(entity.Email) == queryLower
	default:
		return false
	}
}

// hasPrefixMatch checks if an entity name starts with the query.
func (s *SearchResultSorter) hasPrefixMatch(result SearchResult, queryLower string) bool {
	switch entity := result.Entity.(type) {
	case *Workflow:
		return strings.HasPrefix(strings.ToLower(entity.Name), queryLower)
	case *Repository:
		return strings.HasPrefix(strings.ToLower(entity.Name), queryLower)
	case *Connection:
		return strings.HasPrefix(strings.ToLower(entity.Name), queryLower)
	case *StoredQuery:
		return strings.HasPrefix(strings.ToLower(entity.Name), queryLower)
	case *User:
		return strings.HasPrefix(strings.ToLower(entity.FirstName), queryLower) ||
			strings.HasPrefix(strings.ToLower(entity.LastName), queryLower) ||
			strings.HasPrefix(strings.ToLower(entity.Email), queryLower)
	case *RepositoryObject:
		return strings.HasPrefix(strings.ToLower(entity.Name), queryLower)
	case *Invite:
		return strings.HasPrefix(strings.ToLower(entity.Email), queryLower)
	default:
		return false
	}
}

// FilterByMinimumRelevance filters out results below a minimum relevance threshold.
func (s *SearchResultSorter) FilterByMinimumRelevance(results []SearchResult, minRelevance float64) []SearchResult {
	var filtered []SearchResult
	for _, result := range results {
		if result.Relevance >= minRelevance {
			filtered = append(filtered, result)
		}
	}
	return filtered
}
