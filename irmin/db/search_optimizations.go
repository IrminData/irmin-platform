package db

import (
	"context"
	"errors"
	"fmt"
	"reflect"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"gorm.io/gorm"
)

// CursorPagination represents cursor-based pagination parameters for better performance.
type CursorPagination struct {
	After  *string // Cursor for pagination (encoded ID + timestamp)
	Before *string // Cursor for reverse pagination
	First  *int    // Number of items to fetch forward
	Last   *int    // Number of items to fetch backward
}

// searchResult represents the result of a search operation.
type searchResult struct {
	results []SearchResult
	err     error
}

// SearchWithCursor performs search with cursor-based pagination for better performance on large datasets.
func (d *Database) SearchWithCursor(
	ctx context.Context,
	workspaceID uint,
	filters SearchFilters,
	pagination CursorPagination,
) ([]SearchResult, *string, *string, error) {
	// Apply timeout to context
	if filters.Limits == nil {
		filters.Limits = &SearchLimits{}
	}
	if filters.Limits.DatabaseTimeout == 0 {
		filters.Limits.DatabaseTimeout = time.Duration(DefaultCursorDatabaseTimeout) * time.Second
	}

	timeoutCtx, cancel := context.WithTimeout(ctx, filters.Limits.DatabaseTimeout)
	defer cancel()
	ctx = timeoutCtx

	// Validate pagination parameters
	if pagination.First != nil && pagination.Last != nil {
		return nil, nil, nil, errors.New("cannot specify both 'first' and 'last' parameters")
	}

	// Set default limit if none specified
	limit := 50
	if pagination.First != nil {
		limit = *pagination.First
	} else if pagination.Last != nil {
		limit = *pagination.Last
	}

	// Perform the search with cursor-based pagination
	results, err := d.performCursorBasedSearch(ctx, workspaceID, filters, pagination, limit)
	if err != nil {
		return nil, nil, nil, err
	}

	// Generate cursors for pagination
	var startCursor, endCursor *string
	if len(results) > 0 {
		start := d.generateCursor(results[0])
		end := d.generateCursor(results[len(results)-1])
		startCursor = &start
		endCursor = &end
	}

	return results, startCursor, endCursor, nil
}

// performCursorBasedSearch executes the actual search with cursor-based pagination.
func (d *Database) performCursorBasedSearch(
	ctx context.Context,
	workspaceID uint,
	filters SearchFilters,
	pagination CursorPagination,
	limit int,
) ([]SearchResult, error) {
	// Parse search query
	parsedQuery := ParseSearchQuery(filters.Query)

	// Execute search with cursor constraints
	results, err := d.performAllSearchesConcurrentWithCursor(
		ctx,
		workspaceID,
		filters.Query,
		filters,
		parsedQuery,
		pagination,
		limit,
	)
	if err != nil {
		return nil, err
	}

	// Apply relevance calculations and sorting
	sorter := &SearchResultSorter{}
	results = sorter.CalculateEnhancedRelevance(results, parsedQuery)
	results = sorter.BoostRelevanceForExactMatches(results, filters.Query)
	results = sorter.FilterByMinimumRelevance(results, MinRelevanceThreshold)
	results = sorter.SortByRelevance(results)

	return results, nil
}

// performAllSearchesConcurrentWithCursor executes all search types concurrently with cursor constraints.
func (d *Database) performAllSearchesConcurrentWithCursor(
	ctx context.Context,
	workspaceID uint,
	searchQuery string,
	filters SearchFilters,
	parsedQuery *SearchQuery,
	pagination CursorPagination,
	limit int,
) ([]SearchResult, error) {
	// Create channels for enabled search types
	channels := d.createSearchChannels(filters.Types)
	if len(channels) == 0 {
		return []SearchResult{}, nil
	}

	// Start concurrent searches
	var wg sync.WaitGroup
	d.startConcurrentSearches(ctx, &wg, channels, workspaceID, searchQuery, filters, parsedQuery, pagination, limit)

	// Collect and return results
	return d.collectSearchResults(ctx, channels)
}

// createSearchChannels creates channels for each enabled search type.
func (d *Database) createSearchChannels(searchTypes []string) map[string]chan searchResult {
	channels := make(map[string]chan searchResult)
	allSearchTypes := []string{
		"workflows",
		"repositories",
		"connections",
		"queries",
		"users",
		"repository_objects",
		"invites",
	}

	for _, searchType := range allSearchTypes {
		if shouldSearchType(irminmodels.WorkspaceSearchResultType(searchType), searchTypes) {
			channels[searchType] = make(chan searchResult, 1)
		}
	}

	return channels
}

// startConcurrentSearches launches goroutines for each search type.
func (d *Database) startConcurrentSearches(
	ctx context.Context,
	wg *sync.WaitGroup,
	channels map[string]chan searchResult,
	workspaceID uint,
	searchQuery string,
	filters SearchFilters,
	parsedQuery *SearchQuery,
	pagination CursorPagination,
	limit int,
) {
	for searchType, ch := range channels {
		wg.Add(1)
		go func(st string, c chan searchResult) {
			defer wg.Done()
			defer close(c)

			results, err := d.executeSearchByType(
				ctx, st, workspaceID, searchQuery, filters, parsedQuery, pagination, limit,
			)

			select {
			case c <- searchResult{results: results, err: err}:
			case <-ctx.Done():
				return
			}
		}(searchType, ch)
	}
}

// executeSearchByType performs search for a specific entity type.
func (d *Database) executeSearchByType(
	ctx context.Context,
	searchType string,
	workspaceID uint,
	searchQuery string,
	filters SearchFilters,
	parsedQuery *SearchQuery,
	pagination CursorPagination,
	limit int,
) ([]SearchResult, error) {
	switch searchType {
	case "workflows":
		return d.searchWorkflowsWithCursor(ctx, workspaceID, searchQuery, filters, parsedQuery, pagination, limit)
	case "repositories":
		return d.searchRepositoriesWithCursor(ctx, workspaceID, searchQuery, filters, parsedQuery, pagination, limit)
	case "connections":
		return d.searchConnectionsWithCursor(ctx, workspaceID, searchQuery, filters, parsedQuery, pagination, limit)
	case "queries":
		return d.searchStoredQueriesWithCursor(ctx, workspaceID, searchQuery, filters, parsedQuery, pagination, limit)
	case "users":
		return d.searchUsersWithCursor(ctx, workspaceID, searchQuery, filters, parsedQuery, pagination, limit)
	case "repository_objects":
		return d.searchRepositoryObjectsWithCursor(
			ctx,
			workspaceID,
			searchQuery,
			filters,
			parsedQuery,
			pagination,
			limit,
		)
	case "invites":
		return d.searchInvitesWithCursor(ctx, workspaceID, searchQuery, filters, parsedQuery, pagination, limit)
	default:
		return nil, fmt.Errorf("unknown search type: %s", searchType)
	}
}

// collectSearchResults gathers results from all search channels.
func (d *Database) collectSearchResults(
	ctx context.Context,
	channels map[string]chan searchResult,
) ([]SearchResult, error) {
	var mu sync.Mutex
	var allResults []SearchResult
	var searchError error

	for _, ch := range channels {
		select {
		case result, ok := <-ch:
			if !ok {
				continue
			}
			mu.Lock()
			if result.err != nil && searchError == nil {
				searchError = result.err
			} else if result.err == nil {
				allResults = append(allResults, result.results...)
			}
			mu.Unlock()
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	}

	if searchError != nil {
		return nil, searchError
	}

	return allResults, nil
}

// generateCursor creates a cursor string for pagination.
func (d *Database) generateCursor(result SearchResult) string {
	switch entity := result.Entity.(type) {
	case *Workflow:
		return fmt.Sprintf("%d_%d", entity.ID, entity.CreatedAt.Unix())
	case *Repository:
		return fmt.Sprintf("%d_%d", entity.ID, entity.CreatedAt.Unix())
	case *Connection:
		return fmt.Sprintf("%d_%d", entity.ID, entity.CreatedAt.Unix())
	case *StoredQuery:
		return fmt.Sprintf("%d_%d", entity.ID, entity.CreatedAt.Unix())
	case *User:
		return fmt.Sprintf("%d_%d", entity.ID, entity.CreatedAt.Unix())
	case *RepositoryObject:
		return fmt.Sprintf("%d_%d", entity.ID, entity.CreatedAt.Unix())
	case *Invite:
		return fmt.Sprintf("%d_%d", entity.ID, entity.CreatedAt.Unix())
	default:
		return ""
	}
}

// validateTableName validates that a table name contains only safe characters to prevent SQL injection.
func validateTableName(tableName string) bool {
	// Allow only alphanumeric characters, underscores, and dots (for schema.table)
	matched, _ := regexp.MatchString(`^[a-zA-Z0-9_.]+$`, tableName)
	return matched
}

// parseCursor parses a cursor string and returns the ID and timestamp as proper types.
func parseCursor(cursor string) (uint, time.Time, error) {
	parts := strings.Split(cursor, "_")
	if len(parts) != CursorPartsCount {
		return 0, time.Time{}, errors.New("invalid cursor format")
	}

	// Parse ID (first part)
	id, err := strconv.ParseUint(parts[0], 10, 32)
	if err != nil {
		return 0, time.Time{}, fmt.Errorf("invalid cursor ID: %w", err)
	}

	// Parse timestamp (second part)
	timestamp, err := strconv.ParseInt(parts[1], 10, 64)
	if err != nil {
		return 0, time.Time{}, fmt.Errorf("invalid cursor timestamp: %w", err)
	}

	return uint(id), time.Unix(timestamp, 0), nil
}

// applyCursorConstraints applies cursor-based pagination constraints to a query.
func (d *Database) applyCursorConstraints(
	db *gorm.DB,
	tableName string,
	pagination CursorPagination,
	limit int,
) *gorm.DB {
	// Validate table name to prevent SQL injection
	if !validateTableName(tableName) {
		// If table name is invalid, return the db without applying constraints
		// In a production system, you might want to log this security issue
		return db.Limit(limit)
	}

	if pagination.After != nil {
		// Parse cursor to get ID and timestamp with proper type conversion
		id, createdAt, err := parseCursor(*pagination.After)
		if err == nil {
			db = db.Where(fmt.Sprintf("(%s.id > ? OR (%s.id = ? AND %s.created_at > ?))",
				tableName, tableName, tableName), id, id, createdAt)
		}
		// If cursor parsing fails, we continue without the constraint rather than failing
		// This provides graceful degradation
	}

	if pagination.Before != nil {
		// Parse cursor to get ID and timestamp with proper type conversion
		id, createdAt, err := parseCursor(*pagination.Before)
		if err == nil {
			db = db.Where(fmt.Sprintf("(%s.id < ? OR (%s.id = ? AND %s.created_at < ?))",
				tableName, tableName, tableName), id, id, createdAt)
		}
		// If cursor parsing fails, we continue without the constraint rather than failing
		// This provides graceful degradation
	}

	// Apply limit
	db = db.Limit(limit)

	// Apply ordering for cursor-based pagination
	if pagination.Last != nil {
		db = db.Order(fmt.Sprintf("%s.created_at DESC, %s.id DESC", tableName, tableName))
	} else {
		db = db.Order(fmt.Sprintf("%s.created_at ASC, %s.id ASC", tableName, tableName))
	}

	return db
}

// Cursor-based search methods for each entity type.
func (d *Database) searchWorkflowsWithCursor(
	ctx context.Context,
	workspaceID uint,
	query string,
	filters SearchFilters,
	parsedQuery *SearchQuery,
	pagination CursorPagination,
	limit int,
) ([]SearchResult, error) {
	// Use the existing search logic but add cursor constraints
	config := SearchConfig{
		EntityType: irminmodels.WorkspaceSearchResultTypeWorkflow,
		Model:      &Workflow{},
		TableName:  "workflows",
		FieldMappings: map[string]string{
			"name":          "name",
			"description":   "description",
			"documentation": "documentation",
		},
		FieldWeights: map[string]float64{
			"name":          FieldNameWeight,
			"description":   FieldDescriptionWeight,
			"documentation": FieldContentWeight,
		},
		JoinTable:       "",
		EntityIDField:   "",
		GetTagsFunc:     d.GetWorkflowTags,
		Preloads:        []string{"Owner"},
		AdditionalJoins: []string{},
	}

	return d.genericSearchWithCursor(ctx, workspaceID, query, filters, parsedQuery, config, pagination, limit)
}

func (d *Database) searchRepositoriesWithCursor(
	ctx context.Context,
	workspaceID uint,
	query string,
	filters SearchFilters,
	parsedQuery *SearchQuery,
	pagination CursorPagination,
	limit int,
) ([]SearchResult, error) {
	config := SearchConfig{
		EntityType: irminmodels.WorkspaceSearchResultTypeRepository,
		Model:      &Repository{},
		TableName:  "repositories",
		FieldMappings: map[string]string{
			"name":          "name",
			"description":   "description",
			"documentation": "documentation",
		},
		FieldWeights: map[string]float64{
			"name":          FieldNameWeight,
			"description":   FieldDescriptionWeight,
			"documentation": FieldContentWeight,
		},
		JoinTable:       "",
		EntityIDField:   "",
		GetTagsFunc:     d.GetRepositoryTags,
		Preloads:        []string{"Owner"},
		AdditionalJoins: []string{},
	}

	return d.genericSearchWithCursor(ctx, workspaceID, query, filters, parsedQuery, config, pagination, limit)
}

func (d *Database) searchConnectionsWithCursor(
	ctx context.Context,
	workspaceID uint,
	query string,
	filters SearchFilters,
	parsedQuery *SearchQuery,
	pagination CursorPagination,
	limit int,
) ([]SearchResult, error) {
	config := SearchConfig{
		EntityType:      irminmodels.WorkspaceSearchResultTypeConnection,
		Model:           &Connection{},
		TableName:       "connections",
		FieldMappings:   map[string]string{"name": "name", "description": "description"},
		FieldWeights:    map[string]float64{"name": FieldNameWeight, "description": FieldDescriptionWeight},
		JoinTable:       "",
		EntityIDField:   "",
		GetTagsFunc:     d.GetConnectionTags,
		Preloads:        []string{"Owner", "Connector"},
		AdditionalJoins: []string{},
	}

	return d.genericSearchWithCursor(ctx, workspaceID, query, filters, parsedQuery, config, pagination, limit)
}

func (d *Database) searchStoredQueriesWithCursor(
	ctx context.Context,
	workspaceID uint,
	query string,
	filters SearchFilters,
	parsedQuery *SearchQuery,
	pagination CursorPagination,
	limit int,
) ([]SearchResult, error) {
	config := SearchConfig{
		EntityType:    irminmodels.WorkspaceSearchResultTypeQuery,
		Model:         &StoredQuery{},
		TableName:     "stored_queries",
		FieldMappings: map[string]string{"name": "name", "description": "description", "sql": "sql"},
		FieldWeights: map[string]float64{
			"name":        FieldNameWeight,
			"description": FieldDescriptionWeight,
			"sql":         FieldContentWeight,
		},
		JoinTable:       "",
		EntityIDField:   "",
		GetTagsFunc:     d.GetQueryTags,
		Preloads:        []string{"Owner"},
		AdditionalJoins: []string{},
	}

	return d.genericSearchWithCursor(ctx, workspaceID, query, filters, parsedQuery, config, pagination, limit)
}

func (d *Database) searchUsersWithCursor(
	ctx context.Context,
	workspaceID uint,
	query string,
	filters SearchFilters,
	parsedQuery *SearchQuery,
	pagination CursorPagination,
	limit int,
) ([]SearchResult, error) {
	config := SearchConfig{
		EntityType: irminmodels.WorkspaceSearchResultTypeUser,
		Model:      &User{},
		TableName:  "users",
		FieldMappings: map[string]string{
			"first_name": "first_name",
			"last_name":  "last_name",
			"email":      "email",
			"company":    "company",
		},
		FieldWeights: map[string]float64{
			"first_name": FieldNameWeight,
			"last_name":  FieldNameWeight,
			"email":      FieldNameWeight,
			"company":    FieldContentWeight,
		},
		JoinTable:       "",
		EntityIDField:   "",
		GetTagsFunc:     nil,
		Preloads:        []string{"Workspaces"},
		AdditionalJoins: []string{"JOIN workspace_users ON users.id = workspace_users.user_id"},
	}

	return d.genericSearchWithCursor(ctx, workspaceID, query, filters, parsedQuery, config, pagination, limit)
}

func (d *Database) searchRepositoryObjectsWithCursor(
	ctx context.Context,
	workspaceID uint,
	query string,
	filters SearchFilters,
	parsedQuery *SearchQuery,
	pagination CursorPagination,
	limit int,
) ([]SearchResult, error) {
	config := SearchConfig{
		EntityType: irminmodels.WorkspaceSearchResultTypeRepositoryObject,
		Model:      &RepositoryObject{},
		TableName:  "repository_objects",
		FieldMappings: map[string]string{
			"name":            "repository_objects.name",
			"path":            "repository_objects.path",
			"content_type":    "repository_objects.content_type",
			"repository_name": "repositories.name",
			"repository_slug": "repositories.slug",
		},
		FieldWeights: map[string]float64{
			"name":            FieldNameWeight,
			"path":            FieldDescriptionWeight,
			"content_type":    FieldContentWeight,
			"repository_name": FieldDescriptionWeight,
			"repository_slug": FieldDescriptionWeight,
		},
		JoinTable:       "",
		EntityIDField:   "",
		GetTagsFunc:     d.GetRepositoryObjectTags,
		Preloads:        []string{"Repository", "Parent"},
		AdditionalJoins: []string{"JOIN repositories ON repository_objects.repository_id = repositories.id"},
	}

	return d.genericSearchWithCursor(ctx, workspaceID, query, filters, parsedQuery, config, pagination, limit)
}

func (d *Database) searchInvitesWithCursor(
	ctx context.Context,
	workspaceID uint,
	query string,
	filters SearchFilters,
	parsedQuery *SearchQuery,
	pagination CursorPagination,
	limit int,
) ([]SearchResult, error) {
	config := SearchConfig{
		EntityType:      irminmodels.WorkspaceSearchResultTypeInvite,
		Model:           &Invite{},
		TableName:       "invites",
		FieldMappings:   map[string]string{"email": "email", "clerk_id": "clerk_id"},
		FieldWeights:    map[string]float64{"email": FieldNameWeight, "clerk_id": FieldContentWeight},
		JoinTable:       "",
		EntityIDField:   "",
		GetTagsFunc:     nil,
		Preloads:        []string{"InvitedBy", "Workspace", "Role"},
		AdditionalJoins: []string{},
	}

	return d.genericSearchWithCursor(ctx, workspaceID, query, filters, parsedQuery, config, pagination, limit)
}

// genericSearchWithCursor performs a generic search with cursor-based pagination.
func (d *Database) genericSearchWithCursor(
	ctx context.Context,
	workspaceID uint,
	query string,
	filters SearchFilters,
	parsedQuery *SearchQuery,
	config SearchConfig,
	pagination CursorPagination,
	limit int,
) ([]SearchResult, error) {
	// Build the base query
	db := d.Model(config.Model).WithContext(ctx).
		Where(config.TableName+".workspace_id = ? AND "+config.TableName+".deleted_at IS NULL", workspaceID)

	// Add additional joins if specified
	for _, join := range config.AdditionalJoins {
		db = db.Joins(join)
	}

	// Apply cursor constraints for pagination
	db = d.applyCursorConstraints(db, config.TableName, pagination, limit)

	// Build search query if provided
	if query != "" && parsedQuery != nil {
		db = d.buildSearchQuery(
			db,
			config.TableName,
			query,
			parsedQuery,
			filters,
			config.FieldMappings,
			config.FieldWeights,
		)
	} else {
		db = d.buildQueryWithoutSearch(db, config.TableName, filters)
	}

	// Add tag filtering if specified
	if config.JoinTable != "" {
		db = d.applyTagFilter(db, filters, config.JoinTable, config.EntityIDField)
	}

	// Apply common filters
	db = d.applyCommonFilters(db, filters, config.TableName)

	// Apply preloads
	for _, preload := range config.Preloads {
		db = db.Preload(preload)
	}

	// Execute the query
	// Create a slice of the specific model type using reflection
	modelType := reflect.TypeOf(config.Model)
	if modelType.Kind() == reflect.Ptr {
		modelType = modelType.Elem()
	}

	// Create a slice of the model type
	sliceType := reflect.SliceOf(modelType)
	entitiesValue := reflect.New(sliceType)

	// Execute the query with the properly typed slice
	err := db.Find(entitiesValue.Interface()).Error
	if err != nil {
		return nil, err
	}

	// Convert to []SearchResult
	entitiesSlice := entitiesValue.Elem()
	var results []SearchResult
	for i := range entitiesSlice.Len() {
		entity := entitiesSlice.Index(i).Addr().Interface()
		result := createSearchResult(config.EntityType, query, entity, 1.0)
		results = append(results, result)
	}

	return results, nil
}
