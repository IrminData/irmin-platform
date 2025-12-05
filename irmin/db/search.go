package db

import (
	"context"
	"fmt"
	"math"
	"reflect"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"gorm.io/gorm"
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
	ScriptPriority           = 4
	RepositoryObjectPriority = 5
	UserPriority             = 6
	InvitePriority           = 7
	DefaultPriority          = 999

	// Search relevance weights.
	ExactMatchWeight       = 2.0
	PrefixMatchWeight      = 1.5
	PartialMatchWeight     = 1.0
	FuzzyMatchWeight       = 0.7
	FieldNameWeight        = 1.3
	FieldDescriptionWeight = 1.1
	FieldContentWeight     = 0.9

	// Fuzzy matching constants.
	MinTokenLengthForFuzzy   = 2
	FuzzySimilarityThreshold = 0.7
	// Batch loading constants.
	MaxBatchSize = 1000 // Maximum number of entities to load in a single batch

	// SQL condition constants.
	NeverMatchCondition = "1=0"
	NullFieldReference  = "NULL"

	// Field parsing constants.
	MaxFieldParts = 2

	// Query normalization constants.
	DefaultMinTokenLength = 2 // Default minimum length for search tokens

	// Search result limits and timeout constants.
	MaxSearchResults        = 10000 // Maximum total search results
	MaxResultsPerEntityType = 2000  // Maximum results per entity type
	DefaultSearchTimeout    = 30    // Default search timeout in seconds
	MaxSearchTimeout        = 120   // Maximum allowed search timeout in seconds
	DatabaseQueryTimeout    = 15    // Database query timeout in seconds

	// Fast search configuration constants.
	FastSearchMaxResults = 1000 // Fast search total results limit
	FastSearchMaxPerType = 200  // Fast search per-type results limit
	FastSearchTimeout    = 10   // Fast search timeout in seconds
	FastSearchDBTimeout  = 5    // Fast search database timeout in seconds

	// Extensive search configuration constants.
	ExtensiveSearchDBTimeout = 30 // Extensive search database timeout in seconds

	// Security constants for input validation.
	MaxSearchTokenLength = 1000 // Maximum length for a search token to prevent abuse
	MaxSearchQueryLength = 5000 // Maximum length for entire search query
	MaxFieldNameLength   = 100  // Maximum length for field names
	MaxTableNameLength   = 100  // Maximum length for table names

	// Relevance boost constants.
	ExactMatchBoostFactor  = 1.5 // 50% boost for exact matches
	PrefixMatchBoostFactor = 1.2 // 20% boost for prefix matches
	RelevanceRoundingBase  = 100 // Base for rounding to 2 decimal places

	// Search entity type strings for batch loading.
	SearchEntityTypeWorkflow         = "workflow"
	SearchEntityTypeRepository       = "repository"
	SearchEntityTypeConnection       = "connection"
	SearchEntityTypeScript           = "script"
	SearchEntityTypeQuery            = "query"
	SearchEntityTypeRepositoryObject = "repository_object"

	// Cursor-based pagination constants.
	DefaultCursorDatabaseTimeout = 10 // Default database timeout for cursor-based searches in seconds
	CursorPartsCount             = 2  // Number of parts in cursor string (ID_timestamp)
)

// QueryNormalizationOptions represents options for query normalization.
type QueryNormalizationOptions struct {
	RemoveStopWords bool
	MinTokenLength  int
	PreservePhrases bool
}

// DefaultNormalizationOptions returns the default query normalization options.
func DefaultNormalizationOptions() QueryNormalizationOptions {
	return QueryNormalizationOptions{
		RemoveStopWords: true,
		MinTokenLength:  DefaultMinTokenLength,
		PreservePhrases: true,
	}
}

// Common English stop words that should be filtered out from search queries.
func getStopWords() map[string]bool {
	return map[string]bool{
		"a": true, "an": true, "and": true, "are": true, "as": true, "at": true, "be": true, "by": true,
		"for": true, "from": true, "has": true, "he": true, "in": true, "is": true, "it": true,
		"its": true, "of": true, "on": true, "that": true, "the": true, "to": true, "was": true,
		"will": true, "with": true, "would": true, "you": true, "your": true, "yours": true,
		"i": true, "me": true, "my": true, "myself": true, "we": true, "our": true, "ours": true,
		"ourselves": true, "yourself": true, "yourselves": true, "him": true, "his": true, "himself": true,
		"she": true, "her": true, "hers": true, "herself": true, "itself": true, "they": true, "them": true,
		"their": true, "theirs": true, "themselves": true, "what": true, "which": true, "who": true,
		"whom": true, "this": true, "these": true, "those": true, "am": true, "were": true,
		"been": true, "being": true, "have": true, "had": true, "having": true, "do": true,
		"does": true, "did": true, "doing": true, "but": true, "if": true, "or": true,
		"because": true, "until": true, "while": true, "about": true, "against": true, "between": true,
		"into": true, "through": true, "during": true, "before": true, "after": true, "above": true,
		"below": true, "up": true, "down": true, "out": true, "off": true, "over": true, "under": true,
		"again": true, "further": true, "then": true, "once": true, "can": true, "could": true,
		"should": true, "may": true, "might": true, "must": true, "shall": true, "ought": true,
	}
}

// normalizeQuery normalizes a search query by trimming, converting to lowercase, and optionally removing stop words.
func normalizeQuery(query string, options QueryNormalizationOptions) string {
	if query == "" {
		return ""
	}

	// Step 1: Trim whitespace
	normalized := strings.TrimSpace(query)

	// Step 2: Convert to lowercase
	normalized = strings.ToLower(normalized)

	// If we're preserving phrases (text in quotes), we need to handle them specially
	if options.PreservePhrases {
		return normalizeQueryWithPhrases(normalized, options)
	}

	// Step 3: Split into words and remove stop words
	if options.RemoveStopWords {
		normalized = removeStopWordsFromQuery(normalized, options.MinTokenLength)
	}

	return normalized
}

// normalizeQueryWithPhrases normalizes a query while preserving quoted phrases.
func normalizeQueryWithPhrases(query string, options QueryNormalizationOptions) string {
	if !options.RemoveStopWords {
		return query
	}

	// Extract phrases (text in quotes) first
	phraseRegex := regexp.MustCompile(`"([^"]*)"`)
	phrases := phraseRegex.FindAllString(query, -1)

	// Remove phrases from query for processing
	queryWithoutPhrases := phraseRegex.ReplaceAllString(query, " __PHRASE_PLACEHOLDER__ ")

	// Process the non-phrase parts
	processedQuery := removeStopWordsFromQuery(queryWithoutPhrases, options.MinTokenLength)

	// Replace placeholders with original phrases
	for _, phrase := range phrases {
		processedQuery = strings.Replace(processedQuery, "__PHRASE_PLACEHOLDER__", phrase, 1)
	}

	// Clean up extra whitespace
	processedQuery = regexp.MustCompile(`\s+`).ReplaceAllString(processedQuery, " ")
	return strings.TrimSpace(processedQuery)
}

// removeStopWordsFromQuery removes stop words from a query string.
func removeStopWordsFromQuery(query string, minTokenLength int) string {
	words := strings.Fields(query)
	var filteredWords []string

	// Get stop words
	stopWords := getStopWords()

	for _, word := range words {
		// Clean the word (remove punctuation except for search operators)
		cleanWord := cleanToken(word)

		// Skip if it's a stop word, too short, or empty
		if cleanWord == "" || len(cleanWord) < minTokenLength || stopWords[cleanWord] {
			continue
		}

		// Preserve the original word if it contains search operators
		if containsSearchOperators(word) {
			filteredWords = append(filteredWords, word)
		} else {
			filteredWords = append(filteredWords, cleanWord)
		}
	}

	return strings.Join(filteredWords, " ")
}

// containsSearchOperators checks if a word contains search operators that should be preserved.
func containsSearchOperators(word string) bool {
	operators := []string{":", "=", ">", "<", "*"}
	for _, op := range operators {
		if strings.Contains(word, op) {
			return true
		}
	}
	return false
}

// removeStopWordsFromTokens removes stop words from a slice of search tokens.
func removeStopWordsFromTokens(tokens []SearchToken, minTokenLength int) []SearchToken {
	var filteredTokens []SearchToken
	stopWords := getStopWords()

	for _, token := range tokens {
		// Skip stop words for word tokens, but preserve phrases and filters
		if token.Type == TokenTypeWord {
			cleanValue := strings.ToLower(strings.TrimSpace(token.Value))
			if cleanValue == "" || len(cleanValue) < minTokenLength || stopWords[cleanValue] {
				continue
			}
		}

		filteredTokens = append(filteredTokens, token)
	}

	return filteredTokens
}

// SearchQuery represents a parsed search query with tokens and metadata.
type SearchQuery struct {
	OriginalQuery   string
	NormalizedQuery string
	Tokens          []SearchToken
	ExactPhrases    []string
	HasFilters      bool
}

// SearchToken represents a single search token with metadata.
type SearchToken struct {
	Value    string
	Type     TokenType
	Weight   float64
	IsExact  bool
	IsPrefix bool
}

// TokenType represents the type of search token.
type TokenType int

const (
	TokenTypeWord TokenType = iota
	TokenTypePhrase
	TokenTypeFilter
	TokenTypeOperator
)

// SearchTimeoutError represents a search timeout error.
type SearchTimeoutError struct {
	TimeoutSeconds int
	Message        string
}

// NewSearchTimeoutError creates a new search timeout error.
func NewSearchTimeoutError(timeoutSeconds int) *SearchTimeoutError {
	return &SearchTimeoutError{
		TimeoutSeconds: timeoutSeconds,
		Message:        fmt.Sprintf("search operation timed out after %d seconds", timeoutSeconds),
	}
}

// Error implements the error interface for SearchTimeoutError.
func (e *SearchTimeoutError) Error() string {
	return e.Message
}

// SearchLimits represents search result limits and timeout configuration.
type SearchLimits struct {
	MaxTotalResults        int           // Maximum total search results across all types
	MaxResultsPerType      int           // Maximum results per entity type
	TimeoutSeconds         int           // Search timeout in seconds
	DatabaseTimeout        time.Duration // Database query timeout
	EnableEarlyTermination bool          // Stop searching when limits are reached
}

// DefaultSearchLimits returns the default search limits configuration.
func DefaultSearchLimits() SearchLimits {
	return SearchLimits{
		MaxTotalResults:        MaxSearchResults,
		MaxResultsPerType:      MaxResultsPerEntityType,
		TimeoutSeconds:         DefaultSearchTimeout,
		DatabaseTimeout:        time.Duration(DatabaseQueryTimeout) * time.Second,
		EnableEarlyTermination: true,
	}
}

// ValidateSearchLimits validates and normalizes search limits.
func ValidateSearchLimits(limits SearchLimits) SearchLimits {
	// Ensure limits are within acceptable bounds
	if limits.MaxTotalResults <= 0 || limits.MaxTotalResults > MaxSearchResults {
		limits.MaxTotalResults = MaxSearchResults
	}

	if limits.MaxResultsPerType <= 0 || limits.MaxResultsPerType > MaxResultsPerEntityType {
		limits.MaxResultsPerType = MaxResultsPerEntityType
	}

	if limits.TimeoutSeconds <= 0 || limits.TimeoutSeconds > MaxSearchTimeout {
		limits.TimeoutSeconds = DefaultSearchTimeout
	}

	if limits.DatabaseTimeout <= 0 {
		limits.DatabaseTimeout = time.Duration(DatabaseQueryTimeout) * time.Second
	}

	return limits
}

// SearchFilters represents search filters with enhanced query parsing.
type SearchFilters struct {
	Query    string
	Types    []string
	Tags     []uint
	OwnerID  *uint
	DateFrom *string
	DateTo   *string
	Limit    int
	Offset   int
	// Enhanced search options
	FuzzyMatch    bool
	CaseSensitive bool
	SearchFields  []string      // Specific fields to search
	Limits        *SearchLimits // Search limits and timeout configuration
}

// SearchConfig represents configuration for entity-specific search operations.
type SearchConfig struct {
	EntityType      irminmodels.WorkspaceSearchResultType
	Model           any
	TableName       string
	FieldMappings   map[string]string
	FieldWeights    map[string]float64
	JoinTable       string
	EntityIDField   string
	GetTagsFunc     func(uint) ([]Tag, error)
	Preloads        []string
	AdditionalJoins []string
}

type SearchResult struct {
	Type      irminmodels.WorkspaceSearchResultType
	Relevance float64
	Entity    any
}

// SearchCondition represents a parameterized search condition.
type SearchCondition struct {
	SQL    string
	Args   []any
	Weight float64
}

// validateSearchFilters validates and sanitizes search filters to prevent injection.
func validateSearchFilters(filters *SearchFilters) *SearchFilters {
	if filters == nil {
		return &SearchFilters{}
	}

	validatedFilters := &SearchFilters{
		Query:         "",
		Types:         []string{},
		Tags:          []uint{},
		OwnerID:       filters.OwnerID,
		DateFrom:      filters.DateFrom,
		DateTo:        filters.DateTo,
		Limit:         filters.Limit,
		Offset:        filters.Offset,
		FuzzyMatch:    filters.FuzzyMatch,
		CaseSensitive: filters.CaseSensitive,
		SearchFields:  []string{},
		Limits:        filters.Limits,
	}

	// Validate and sanitize query
	if filters.Query != "" {
		query := strings.TrimSpace(filters.Query)
		if len(query) <= MaxSearchQueryLength && !ContainsSQLInjectionPattern(query) {
			validatedFilters.Query = query
		}
	}

	// Validate entity types against allowed values
	allowedTypes := map[string]bool{
		"workflow":          true,
		"repository":        true,
		"connection":        true,
		"script":            true,
		"query":             true,
		"user":              true,
		"repository_object": true,
		"invite":            true,
	}

	for _, entityType := range filters.Types {
		if allowedTypes[strings.ToLower(strings.TrimSpace(entityType))] {
			validatedFilters.Types = append(validatedFilters.Types, entityType)
		}
	}

	// Validate tag IDs (ensure they're positive integers)
	for _, tagID := range filters.Tags {
		if tagID > 0 && tagID < 4294967295 { // Valid uint range
			validatedFilters.Tags = append(validatedFilters.Tags, tagID)
		}
	}

	// Validate search fields
	for _, field := range filters.SearchFields {
		if IsValidFieldName(field) && !ContainsSuspiciousPatterns(field) {
			validatedFilters.SearchFields = append(validatedFilters.SearchFields, field)
		}
	}

	// Validate limits
	if validatedFilters.Limit < 0 {
		validatedFilters.Limit = 0
	}
	if validatedFilters.Limit > MaxSearchResults {
		validatedFilters.Limit = MaxSearchResults
	}

	if validatedFilters.Offset < 0 {
		validatedFilters.Offset = 0
	}
	if validatedFilters.Offset > MaxSearchResults {
		validatedFilters.Offset = MaxSearchResults
	}

	return validatedFilters
}

// ParseSearchQuery parses a search query string into tokens and metadata.
func ParseSearchQuery(query string) *SearchQuery {
	query = strings.TrimSpace(query)

	// SECURITY: Validate query length to prevent abuse
	if len(query) > MaxSearchQueryLength {
		query = query[:MaxSearchQueryLength]
	}

	// SECURITY: Check for SQL injection patterns
	if ContainsSQLInjectionPattern(query) {
		return &SearchQuery{
			OriginalQuery:   "",
			NormalizedQuery: "",
			Tokens:          []SearchToken{},
			ExactPhrases:    []string{},
			HasFilters:      false,
		}
	}

	if query == "" {
		return &SearchQuery{
			OriginalQuery:   "",
			NormalizedQuery: "",
			Tokens:          []SearchToken{},
			ExactPhrases:    []string{},
			HasFilters:      false,
		}
	}

	// Apply query normalization
	normalizationOptions := DefaultNormalizationOptions()
	normalizedQuery := normalizeQuery(query, normalizationOptions)

	parsed := &SearchQuery{
		OriginalQuery:   query,
		NormalizedQuery: normalizedQuery,
		Tokens:          []SearchToken{},
		ExactPhrases:    []string{},
		HasFilters:      false,
	}

	// Extract exact phrases (text in quotes) from normalized query
	phraseRegex := regexp.MustCompile(`"([^"]*)"`)
	phrases := phraseRegex.FindAllStringSubmatch(normalizedQuery, -1)

	// Remove phrases from normalized query for further processing
	queryWithoutPhrases := phraseRegex.ReplaceAllString(normalizedQuery, "")

	// Add exact phrases as tokens
	for _, match := range phrases {
		if len(match) > 1 && match[1] != "" {
			phrase := strings.TrimSpace(match[1])
			parsed.ExactPhrases = append(parsed.ExactPhrases, phrase)
			parsed.Tokens = append(parsed.Tokens, SearchToken{
				Value:    phrase,
				Type:     TokenTypePhrase,
				Weight:   ExactMatchWeight,
				IsExact:  true,
				IsPrefix: false,
			})
		}
	}

	// Tokenize remaining query
	tokens := tokenizeQuery(queryWithoutPhrases)

	for _, token := range tokens {
		if token != "" {
			// Check if token is a filter operator
			if isFilterOperator(token) {
				parsed.Tokens = append(parsed.Tokens, SearchToken{
					Value:    token,
					Type:     TokenTypeOperator,
					Weight:   1.0,
					IsExact:  false,
					IsPrefix: false,
				})
				parsed.HasFilters = true
			} else {
				// Regular word token
				parsed.Tokens = append(parsed.Tokens, SearchToken{
					Value:    token,
					Type:     TokenTypeWord,
					Weight:   PartialMatchWeight,
					IsExact:  false,
					IsPrefix: strings.HasSuffix(token, "*"),
				})
			}
		}
	}

	// Apply stop word filtering to tokens
	parsed.Tokens = removeStopWordsFromTokens(parsed.Tokens, normalizationOptions.MinTokenLength)

	return parsed
}

// ParseSearchQueryWithOptions parses a search query string with custom normalization options.
func ParseSearchQueryWithOptions(query string, options QueryNormalizationOptions) *SearchQuery {
	query = strings.TrimSpace(query)

	// SECURITY: Validate query length to prevent abuse
	if len(query) > MaxSearchQueryLength {
		query = query[:MaxSearchQueryLength]
	}

	if query == "" {
		return &SearchQuery{
			OriginalQuery:   "",
			NormalizedQuery: "",
			Tokens:          []SearchToken{},
			ExactPhrases:    []string{},
			HasFilters:      false,
		}
	}

	// Apply query normalization with custom options
	normalizedQuery := normalizeQuery(query, options)

	parsed := &SearchQuery{
		OriginalQuery:   query,
		NormalizedQuery: normalizedQuery,
		Tokens:          []SearchToken{},
		ExactPhrases:    []string{},
		HasFilters:      false,
	}

	// Extract exact phrases (text in quotes) from normalized query
	phraseRegex := regexp.MustCompile(`"([^"]*)"`)
	phrases := phraseRegex.FindAllStringSubmatch(normalizedQuery, -1)

	// Remove phrases from normalized query for further processing
	queryWithoutPhrases := phraseRegex.ReplaceAllString(normalizedQuery, "")

	// Add exact phrases as tokens
	for _, match := range phrases {
		if len(match) > 1 && match[1] != "" {
			phrase := strings.TrimSpace(match[1])
			parsed.ExactPhrases = append(parsed.ExactPhrases, phrase)
			parsed.Tokens = append(parsed.Tokens, SearchToken{
				Value:    phrase,
				Type:     TokenTypePhrase,
				Weight:   ExactMatchWeight,
				IsExact:  true,
				IsPrefix: false,
			})
		}
	}

	// Tokenize remaining query
	tokens := tokenizeQuery(queryWithoutPhrases)

	for _, token := range tokens {
		if token != "" {
			// Check if token is a filter operator
			if isFilterOperator(token) {
				parsed.Tokens = append(parsed.Tokens, SearchToken{
					Value:    token,
					Type:     TokenTypeOperator,
					Weight:   1.0,
					IsExact:  false,
					IsPrefix: false,
				})
				parsed.HasFilters = true
			} else {
				// Regular word token
				parsed.Tokens = append(parsed.Tokens, SearchToken{
					Value:    token,
					Type:     TokenTypeWord,
					Weight:   PartialMatchWeight,
					IsExact:  false,
					IsPrefix: strings.HasSuffix(token, "*"),
				})
			}
		}
	}

	// Apply stop word filtering to tokens if enabled
	if options.RemoveStopWords {
		parsed.Tokens = removeStopWordsFromTokens(parsed.Tokens, options.MinTokenLength)
	}

	return parsed
}

// GetNormalizedQuery returns just the normalized version of a query string.
// This is useful for debugging or displaying the processed query to users.
func GetNormalizedQuery(query string) string {
	options := DefaultNormalizationOptions()
	return normalizeQuery(query, options)
}

// GetNormalizedQueryWithOptions returns the normalized version with custom options.
func GetNormalizedQueryWithOptions(query string, options QueryNormalizationOptions) string {
	return normalizeQuery(query, options)
}

// tokenizeQuery splits a query string into individual tokens.
func tokenizeQuery(query string) []string {
	// Remove extra whitespace and split
	query = strings.TrimSpace(query)
	if query == "" {
		return []string{}
	}

	// Split on whitespace and filter out empty tokens
	parts := strings.Fields(query)
	tokens := make([]string, 0, len(parts))

	for _, part := range parts {
		// Clean the token
		token := cleanToken(part)
		if token != "" {
			tokens = append(tokens, token)
		}
	}

	return tokens
}

// cleanToken removes unwanted characters and normalizes a token.
func cleanToken(token string) string {
	// Remove common punctuation except for special characters used in search
	token = strings.TrimFunc(token, func(r rune) bool {
		return !unicode.IsLetter(r) && !unicode.IsNumber(r) &&
			r != '*' && r != ':' && r != '=' && r != '>' && r != '<' && r != '-'
	})

	return strings.ToLower(token)
}

// isFilterOperator checks if a token is a filter operator.
func isFilterOperator(token string) bool {
	operators := []string{"type:", "tag:", "owner:", "date:", "created:", "updated:"}
	for _, op := range operators {
		if strings.HasPrefix(token, op) {
			return true
		}
	}
	return false
}

// buildEnhancedSearchConditions builds parameterized search conditions for enhanced search.
func (d *Database) buildEnhancedSearchConditions(
	parsedQuery *SearchQuery,
	tableName string,
	fieldMappings map[string]string,
) []SearchCondition {
	if parsedQuery == nil || len(parsedQuery.Tokens) == 0 {
		return []SearchCondition{}
	}

	// Validate table name first
	if !IsValidTableName(tableName) {
		return []SearchCondition{}
	}

	// Validate and sanitize field mappings
	validFieldMappings := ValidateFieldMappings(fieldMappings)
	if len(validFieldMappings) == 0 {
		return []SearchCondition{}
	}

	var conditions []SearchCondition

	for _, token := range parsedQuery.Tokens {
		if token.Type == TokenTypeWord || token.Type == TokenTypePhrase {
			var fieldConditions []string
			var args []any

			for _, fieldName := range validFieldMappings {
				// Build parameterized condition for each field
				condition, fieldArgs := d.buildFieldSearchConditionParameterized(tableName, fieldName, token)
				if condition != "" {
					fieldConditions = append(fieldConditions, condition)
					args = append(args, fieldArgs...)
				}
			}

			if len(fieldConditions) > 0 {
				conditions = append(conditions, SearchCondition{
					SQL:    "(" + strings.Join(fieldConditions, " OR ") + ")",
					Args:   args,
					Weight: token.Weight,
				})
			}
		}
	}

	return conditions
}

// ValidateFieldMappings validates and filters field mappings to ensure they are safe.
func ValidateFieldMappings(fieldMappings map[string]string) map[string]string {
	validMappings := make(map[string]string)

	for key, fieldName := range fieldMappings {
		// Validate the field name
		if IsValidFieldName(fieldName) {
			// Additional check: ensure the field name doesn't contain suspicious patterns
			if !ContainsSuspiciousPatterns(fieldName) && !ContainsSQLInjectionPattern(fieldName) {
				validMappings[key] = fieldName
			}
		}
	}

	return validMappings
}

// buildFieldSearchConditionParameterized builds a parameterized search condition for a specific field and token.
func (d *Database) buildFieldSearchConditionParameterized(
	tableName, fieldName string,
	token SearchToken,
) (string, []any) {
	// SECURITY: Validate token before processing
	if !ValidateSearchToken(token) {
		return NeverMatchCondition, []any{} // Return a condition that will never match
	}

	// SECURITY: Validate table and field names
	if !IsValidTableName(tableName) || !IsValidFieldName(fieldName) {
		return NeverMatchCondition, []any{} // Return a condition that will never match
	}

	// Build field reference with proper table prefix handling and validation
	fieldRef := d.buildFieldReference(fieldName, tableName)
	if fieldRef == NullFieldReference {
		return NeverMatchCondition, []any{} // Return a condition that will never match
	}

	// Wrap field reference in COALESCE for NULL safety
	fieldRefWithCoalesce := "COALESCE(" + fieldRef + ", '')"

	// Sanitize the search value before building conditions
	sanitizedValue := SanitizeSearchValue(token.Value)
	if sanitizedValue == "" {
		return NeverMatchCondition, []any{} // Return a condition that will never match for empty/invalid values
	}

	// Build parameterized condition based on token type
	switch {
	case token.IsExact:
		// For exact matches, search for the value surrounded by any characters
		searchValue := "%" + sanitizedValue + "%"
		return fieldRefWithCoalesce + " ILIKE ?", []any{searchValue}
	case token.IsPrefix:
		// For prefix matches, remove the trailing * and search for prefix
		prefix := strings.TrimSuffix(sanitizedValue, "*")
		if prefix == "" {
			return NeverMatchCondition, []any{} // Return a condition that will never match for empty prefix
		}
		searchValue := prefix + "%"
		return fieldRefWithCoalesce + " ILIKE ?", []any{searchValue}
	default:
		// For partial matches, search for the value surrounded by any characters
		searchValue := "%" + sanitizedValue + "%"
		return fieldRefWithCoalesce + " ILIKE ?", []any{searchValue}
	}
}

// SanitizeSearchValue sanitizes a search value for use in ILIKE patterns.
func SanitizeSearchValue(value string) string {
	// Basic length check
	if len(value) == 0 || len(value) > MaxSearchTokenLength {
		return ""
	}

	// Check for SQL injection patterns
	if ContainsSQLInjectionPattern(value) {
		return ""
	}

	// Escape ILIKE pattern characters to prevent pattern injection
	sanitized := strings.ReplaceAll(value, "\\", "\\\\")  // Escape backslashes first
	sanitized = strings.ReplaceAll(sanitized, "%", "\\%") // Escape percent signs
	sanitized = strings.ReplaceAll(sanitized, "_", "\\_") // Escape underscores

	// Remove other potentially dangerous characters
	sanitized = strings.ReplaceAll(sanitized, "'", "")  // Remove single quotes
	sanitized = strings.ReplaceAll(sanitized, "\"", "") // Remove double quotes
	sanitized = strings.ReplaceAll(sanitized, ";", "")  // Remove semicolons
	sanitized = strings.ReplaceAll(sanitized, "--", "") // Remove SQL comments
	sanitized = strings.ReplaceAll(sanitized, "/*", "") // Remove block comments start
	sanitized = strings.ReplaceAll(sanitized, "*/", "") // Remove block comments end

	return sanitized
}

// applySearchConditions applies search conditions to a GORM query using parameterized queries.
func (d *Database) applySearchConditions(db *gorm.DB, conditions []SearchCondition) *gorm.DB {
	if len(conditions) == 0 {
		return db
	}

	// Build the complete WHERE clause with all conditions
	var whereClauses []string
	var allArgs []any

	for _, condition := range conditions {
		whereClauses = append(whereClauses, condition.SQL)
		allArgs = append(allArgs, condition.Args...)
	}

	// Join all conditions with AND logic (each condition group has OR logic internally)
	whereSQL := strings.Join(whereClauses, " AND ")
	return db.Where(whereSQL, allArgs...)
}

// buildEnhancedRelevanceExpression builds a secure SQL expression for calculating enhanced relevance scores.
// Note: This uses validated and sanitized input rather than parameterization due to GORM SELECT limitations.
func (d *Database) buildEnhancedRelevanceExpression(
	parsedQuery *SearchQuery,
	tableName string,
	fieldMappings map[string]string,
	fieldWeights map[string]float64,
) string {
	if parsedQuery == nil || len(parsedQuery.Tokens) == 0 {
		return "1.0"
	}

	var relevanceParts []string
	for _, token := range parsedQuery.Tokens {
		if token.Type == TokenTypeWord || token.Type == TokenTypePhrase {
			parts := d.buildTokenRelevancePartsSecure(token, tableName, fieldMappings, fieldWeights)
			relevanceParts = append(relevanceParts, parts...)
		}
	}

	if len(relevanceParts) == 0 {
		return "1.0"
	}

	return "(" + strings.Join(relevanceParts, " + ") + ")"
}

// buildTokenRelevancePartsSecure builds secure relevance parts for a single token across all fields.
func (d *Database) buildTokenRelevancePartsSecure(
	token SearchToken,
	tableName string,
	fieldMappings map[string]string,
	fieldWeights map[string]float64,
) []string {
	// Validate inputs first
	if !ValidateSearchToken(token) || !IsValidTableName(tableName) {
		return []string{}
	}

	// Validate field mappings
	validFieldMappings := ValidateFieldMappings(fieldMappings)

	var parts []string
	for fieldKey, weight := range fieldWeights {
		actualFieldName, exists := validFieldMappings[fieldKey]
		if !exists {
			continue
		}

		fieldRef := d.buildFieldReference(actualFieldName, tableName)
		if fieldRef == NullFieldReference {
			continue // Skip invalid field references
		}

		relevancePart := d.buildFieldRelevanceExpressionSecure(fieldRef, token, weight)
		if relevancePart != "" && relevancePart != "0" {
			parts = append(parts, relevancePart)
		}
	}
	return parts
}

// buildFieldRelevanceExpressionSecure builds a secure relevance expression for a specific field and token.
// Uses input validation and sanitization since parameterization is not feasible in SELECT clauses.
func (d *Database) buildFieldRelevanceExpressionSecure(fieldRef string, token SearchToken, fieldWeight float64) string {
	// SECURITY: Validate token before processing
	if !ValidateSearchToken(token) {
		return "0" // Return zero relevance for invalid tokens
	}

	// SECURITY: Additional validation for relevance scoring
	if !isValidFieldReference(fieldRef) || fieldRef == NullFieldReference {
		return "0" // Return zero relevance for invalid field references
	}

	// SECURITY: Validate field weight to prevent injection through numeric values
	if fieldWeight < 0 || fieldWeight > 100 || math.IsNaN(fieldWeight) || math.IsInf(fieldWeight, 0) {
		return "0" // Return zero relevance for invalid weights
	}

	baseWeight := token.Weight * fieldWeight

	// Handle NULL values by using COALESCE in the field reference
	coalescedField := "COALESCE(" + fieldRef + ", '')"

	// Sanitize the search value with enhanced security
	var sanitizedValue string
	switch {
	case token.IsExact:
		sanitizedValue = sanitizeForLiteral(token.Value)
		if sanitizedValue == "" {
			return "0" // Return zero relevance for empty sanitized values
		}
	case token.IsPrefix:
		prefix := strings.TrimSuffix(token.Value, "*")
		sanitizedValue = sanitizeForLiteral(prefix)
		if sanitizedValue == "" {
			return "0" // Return zero relevance for empty sanitized values
		}
	default:
		sanitizedValue = sanitizeForLiteral(token.Value)
		if sanitizedValue == "" {
			return "0" // Return zero relevance for empty sanitized values
		}
	}

	// Build secure condition with additional validation
	var condition string
	switch {
	case token.IsExact:
		condition = coalescedField + " ILIKE '%" + sanitizedValue + "%'"
	case token.IsPrefix:
		condition = coalescedField + " ILIKE '" + sanitizedValue + "%'"
	default:
		condition = coalescedField + " ILIKE '%" + sanitizedValue + "%'"
	}

	// Validate and format the relevance value with bounds checking
	finalWeight := baseWeight * PartialMatchWeight
	if finalWeight < 0 || finalWeight > 1000 || math.IsNaN(finalWeight) || math.IsInf(finalWeight, 0) {
		return "0" // Return zero relevance for invalid final weights
	}

	relevanceValue := strconv.FormatFloat(finalWeight, 'f', 2, 64)

	return "CASE WHEN " + condition + " THEN " + relevanceValue + " ELSE 0 END"
}

// isValidFieldReference validates that a field reference is safe to use in SQL.
func isValidFieldReference(fieldRef string) bool {
	// Allow only alphanumeric characters, dots, and underscores
	validFieldRegex := regexp.MustCompile(`^[a-zA-Z0-9_.]+$`)
	return validFieldRegex.MatchString(fieldRef)
}

// sanitizeForLiteral sanitizes a string for use in SQL literals with comprehensive safety measures.
func sanitizeForLiteral(input string) string {
	// Validate input length to prevent abuse
	if len(input) > MaxSearchTokenLength {
		input = input[:MaxSearchTokenLength]
	}

	// Check for SQL injection patterns first
	if ContainsSQLInjectionPattern(input) {
		// Return empty string for obviously malicious input
		return ""
	}

	// Remove or escape dangerous characters
	// Replace single quotes with doubled single quotes (SQL standard escaping)
	sanitized := strings.ReplaceAll(input, "'", "''")
	// Replace backslashes to prevent escape sequence issues
	sanitized = strings.ReplaceAll(sanitized, "\\", "\\\\")
	// Replace percent signs and underscores to prevent ILIKE pattern injection
	sanitized = strings.ReplaceAll(sanitized, "%", "\\%")
	sanitized = strings.ReplaceAll(sanitized, "_", "\\_")

	// Remove SQL comment sequences
	sanitized = strings.ReplaceAll(sanitized, "--", "")
	sanitized = strings.ReplaceAll(sanitized, "/*", "")
	sanitized = strings.ReplaceAll(sanitized, "*/", "")

	// Remove other dangerous characters and sequences
	sanitized = strings.ReplaceAll(sanitized, ";", "")
	sanitized = strings.ReplaceAll(sanitized, "@@", "")
	sanitized = strings.ReplaceAll(sanitized, "xp_", "")
	sanitized = strings.ReplaceAll(sanitized, "sp_", "")

	// Remove HTML/script tags
	sanitized = regexp.MustCompile(`(?i)<[^>]*>`).ReplaceAllString(sanitized, "")

	// Remove excessive whitespace
	sanitized = regexp.MustCompile(`\s+`).ReplaceAllString(sanitized, " ")
	sanitized = strings.TrimSpace(sanitized)

	return sanitized
}

// buildFieldReference builds a field reference with proper table prefix handling and security validation.
func (d *Database) buildFieldReference(fieldName, tableName string) string {
	// Validate inputs first
	if !IsValidFieldName(fieldName) || !IsValidTableName(tableName) {
		// Return a safe default that won't match anything
		return NullFieldReference
	}

	if strings.Contains(fieldName, ".") {
		// Field name already includes table prefix (e.g., "repositories.name")
		// Validate the full reference
		if !isValidFieldReference(fieldName) {
			return "NULL"
		}

		// Extract table and field parts for additional validation
		parts := strings.SplitN(fieldName, ".", MaxFieldParts)
		if len(parts) == MaxFieldParts {
			if !IsValidTableName(parts[0]) || !IsValidFieldName(parts[1]) {
				return NullFieldReference
			}
		}

		return fieldName
	}

	// Field name is just the column name, add table prefix
	return tableName + "." + fieldName
}

// IsValidFieldName validates that a field name is in the allowed whitelist.
func IsValidFieldName(fieldName string) bool {
	// Check length
	if len(fieldName) == 0 || len(fieldName) > MaxFieldNameLength {
		return false
	}

	// Check pattern
	if !validFieldRegex.MatchString(fieldName) {
		return false
	}

	// For dotted references (table.field), validate each part appropriately
	if strings.Contains(fieldName, ".") {
		parts := strings.Split(fieldName, ".")
		if len(parts) != MaxFieldParts {
			return false // We only support table.field format
		}

		tableName := parts[0]
		fieldPart := parts[1]

		// First part should be a valid table name
		if !IsValidTableName(tableName) {
			return false
		}

		// Second part should be a valid field name
		if !getAllowedFieldNames()[fieldPart] {
			return false
		}

		return true
	}

	// Check whitelist for simple field names
	return getAllowedFieldNames()[fieldName]
}

// IsValidTableName validates that a table name is in the allowed whitelist.
func IsValidTableName(tableName string) bool {
	// Check length
	if len(tableName) == 0 || len(tableName) > MaxTableNameLength {
		return false
	}

	// Check pattern
	if !validTableRegex.MatchString(tableName) {
		return false
	}

	// Check whitelist
	return getAllowedTableNames()[tableName]
}

// SearchWorkspace performs a full-text search across all entities in a workspace with timeout and limits.
func (d *Database) SearchWorkspace(
	workspaceID uint,
	filters SearchFilters,
) ([]SearchResult, int, error) {
	// SECURITY: Validate and sanitize search filters
	validatedFilters := validateSearchFilters(&filters)

	// Apply default limits if not provided
	if validatedFilters.Limits == nil {
		defaultLimits := DefaultSearchLimits()
		validatedFilters.Limits = &defaultLimits
	} else {
		// Validate and normalize provided limits
		*validatedFilters.Limits = ValidateSearchLimits(*validatedFilters.Limits)
	}

	// Create context with timeout
	ctx, cancel := context.WithTimeout(
		context.Background(),
		time.Duration(validatedFilters.Limits.TimeoutSeconds)*time.Second,
	)
	defer cancel()

	// Parse the search query for enhanced processing
	parsedQuery := ParseSearchQuery(validatedFilters.Query)
	searchQuery := strings.TrimSpace(validatedFilters.Query)

	// Check if we have any search criteria
	hasQuery := searchQuery != ""
	hasFilters := validatedFilters.OwnerID != nil || validatedFilters.DateFrom != nil ||
		validatedFilters.DateTo != nil ||
		len(validatedFilters.Tags) > 0 ||
		len(validatedFilters.Types) > 0

	// If no query and no filters, return empty results
	if !hasQuery && !hasFilters {
		return []SearchResult{}, 0, nil
	}

	// Perform all searches concurrently with timeout protection
	results, err := d.performAllSearchesConcurrentWithLimits(
		ctx,
		workspaceID,
		searchQuery,
		*validatedFilters,
		parsedQuery,
	)
	if err != nil {
		// Check if error is due to timeout
		if ctx.Err() == context.DeadlineExceeded {
			return nil, 0, NewSearchTimeoutError(validatedFilters.Limits.TimeoutSeconds)
		}
		return nil, 0, err
	}

	// Apply enhanced relevance calculation
	sorter := &SearchResultSorter{}
	results = sorter.CalculateEnhancedRelevance(results, parsedQuery)

	// Sort results by relevance
	results = sorter.SortByRelevance(results)

	// Filter out low-relevance results if query is provided
	if searchQuery != "" {
		results = sorter.FilterByMinimumRelevance(results, MinRelevanceThreshold)
	}

	// Apply total result limit
	if len(results) > validatedFilters.Limits.MaxTotalResults {
		results = results[:validatedFilters.Limits.MaxTotalResults]
	}

	// Calculate total count
	totalCount := len(results)

	// Apply pagination using switch statement
	results = d.applyPagination(results, validatedFilters.Offset, validatedFilters.Limit)

	return results, totalCount, nil
}

// SearchWorkspaceCount performs a search and returns only the total count of results with timeout protection.
func (d *Database) SearchWorkspaceCount(
	workspaceID uint,
	filters SearchFilters,
) (int, error) {
	// SECURITY: Validate and sanitize search filters
	validatedFilters := validateSearchFilters(&filters)

	// Apply default limits if not provided
	if validatedFilters.Limits == nil {
		defaultLimits := DefaultSearchLimits()
		validatedFilters.Limits = &defaultLimits
	} else {
		// Validate and normalize provided limits
		*validatedFilters.Limits = ValidateSearchLimits(*validatedFilters.Limits)
	}

	// Create context with timeout
	ctx, cancel := context.WithTimeout(
		context.Background(),
		time.Duration(validatedFilters.Limits.TimeoutSeconds)*time.Second,
	)
	defer cancel()

	// Parse the search query for enhanced processing
	parsedQuery := ParseSearchQuery(validatedFilters.Query)
	searchQuery := strings.TrimSpace(validatedFilters.Query)

	// Check if we have any search criteria
	hasQuery := searchQuery != ""
	hasFilters := validatedFilters.OwnerID != nil || validatedFilters.DateFrom != nil ||
		validatedFilters.DateTo != nil ||
		len(validatedFilters.Tags) > 0 ||
		len(validatedFilters.Types) > 0

	// If no query and no filters, return 0
	if !hasQuery && !hasFilters {
		return 0, nil
	}

	// Perform all searches concurrently with timeout protection
	results, err := d.performAllSearchesConcurrentWithLimits(
		ctx,
		workspaceID,
		searchQuery,
		*validatedFilters,
		parsedQuery,
	)
	if err != nil {
		// Check if error is due to timeout
		if ctx.Err() == context.DeadlineExceeded {
			return 0, NewSearchTimeoutError(validatedFilters.Limits.TimeoutSeconds)
		}
		return 0, err
	}

	// Apply enhanced relevance calculation
	sorter := &SearchResultSorter{}
	results = sorter.CalculateEnhancedRelevance(results, parsedQuery)

	// Sort results by relevance
	results = sorter.SortByRelevance(results)

	// Filter out low-relevance results if query is provided
	if searchQuery != "" {
		results = sorter.FilterByMinimumRelevance(results, MinRelevanceThreshold)
	}

	// Apply total result limit
	if len(results) > validatedFilters.Limits.MaxTotalResults {
		results = results[:validatedFilters.Limits.MaxTotalResults]
	}

	// Return only the count
	return len(results), nil
}

// performAllSearchesConcurrentWithLimits executes searches for all requested entity types concurrently with limits and timeout.
//
//nolint:gocognit,nestif // Complex logic needed for concurrent search with limits and timeout handling
func (d *Database) performAllSearchesConcurrentWithLimits(
	ctx context.Context,
	workspaceID uint,
	searchQuery string,
	filters SearchFilters,
	parsedQuery *SearchQuery,
) ([]SearchResult, error) {
	// Define search operations
	searchOperations := []struct {
		entityType irminmodels.WorkspaceSearchResultType
		searchFunc func(context.Context, uint, string, SearchFilters, *SearchQuery) ([]SearchResult, error)
	}{
		{irminmodels.WorkspaceSearchResultTypeWorkflow, d.searchWorkflowsWithLimits},
		{irminmodels.WorkspaceSearchResultTypeRepository, d.searchRepositoriesWithLimits},
		{irminmodels.WorkspaceSearchResultTypeConnection, d.searchConnectionsWithLimits},
		{irminmodels.WorkspaceSearchResultTypeQuery, d.searchStoredQueriesWithLimits},
		{irminmodels.WorkspaceSearchResultTypeScript, d.searchScriptsWithLimits},
		{irminmodels.WorkspaceSearchResultTypeUser, d.searchUsersWithLimits},
		{irminmodels.WorkspaceSearchResultTypeRepositoryObject, d.searchRepositoryObjectsWithLimits},
		{irminmodels.WorkspaceSearchResultTypeInvite, d.searchInvitesWithLimits},
	}

	var results []SearchResult
	var mu sync.Mutex
	var wg sync.WaitGroup
	var searchErrors []error

	// Track total results across all types
	totalResults := 0
	maxTotal := filters.Limits.MaxTotalResults

	// Execute searches for requested types concurrently
	for _, op := range searchOperations {
		if shouldSearchType(op.entityType, filters.Types) {
			wg.Add(1)
			go func(operation struct {
				entityType irminmodels.WorkspaceSearchResultType
				searchFunc func(context.Context, uint, string, SearchFilters, *SearchQuery) ([]SearchResult, error)
			}) {
				defer wg.Done()

				// Check if context is cancelled or if we've reached limits
				select {
				case <-ctx.Done():
					return
				default:
				}

				// Check if we've already reached the total limit
				mu.Lock()
				if totalResults >= maxTotal && filters.Limits.EnableEarlyTermination {
					mu.Unlock()
					return
				}
				mu.Unlock()

				searchResults, err := operation.searchFunc(ctx, workspaceID, searchQuery, filters, parsedQuery)

				mu.Lock()
				if err != nil {
					searchErrors = append(searchErrors, err)
				} else {
					// Apply per-type limit
					if len(searchResults) > filters.Limits.MaxResultsPerType {
						searchResults = searchResults[:filters.Limits.MaxResultsPerType]
					}

					// Check total limit
					remainingCapacity := maxTotal - totalResults
					if len(searchResults) > remainingCapacity && filters.Limits.EnableEarlyTermination {
						searchResults = searchResults[:remainingCapacity]
					}

					results = append(results, searchResults...)
					totalResults += len(searchResults)
				}
				mu.Unlock()
			}(op)
		}
	}

	// Wait for all searches to complete or timeout
	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		// All searches completed normally
	case <-ctx.Done():
		// Timeout occurred
		return nil, ctx.Err()
	}

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
	entity any,
	relevanceScore float64,
) SearchResult {
	// Use the actual relevance score from the database if available
	relevance := relevanceScore
	if query != "" && relevanceScore == 0 {
		relevance = 0.5 // Fallback relevance
	}

	result := SearchResult{
		Type:      entityType,
		Relevance: roundRelevance(relevance),
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
	case irminmodels.WorkspaceSearchResultTypeScript:
		if s, ok := entity.(*StoredScript); ok {
			result.Entity = s
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

// loadTagsForResults loads tags for search results using batch loading.
func (d *Database) loadTagsForResults(
	results []SearchResult,
	entityType string,
) []SearchResult {
	if len(results) == 0 {
		return results
	}

	// Create entity loader
	loader := NewEntityLoader(d)

	// Collect entity IDs
	var entityIDs []uint
	for _, result := range results {
		entityID := d.extractEntityID(result)
		if entityID != nil {
			entityIDs = append(entityIDs, *entityID)
		}
	}

	if len(entityIDs) == 0 {
		return results
	}

	// Batch load tags
	tagsMap, err := loader.BatchLoadTags(entityType, entityIDs)
	if err != nil {
		// If batch loading fails, return results without tags
		return results
	}

	// Set tags on entities
	for i := range results {
		entityID := d.extractEntityID(results[i])
		if entityID != nil {
			if tags, exists := tagsMap[*entityID]; exists {
				d.setEntityTags(results[i], tags)
			}
		}
	}

	return results
}

// extractEntityID extracts the ID from a search result entity.
func (d *Database) extractEntityID(result SearchResult) *uint {
	switch entity := result.Entity.(type) {
	case *Workflow:
		return &entity.ID
	case *Repository:
		return &entity.ID
	case *Connection:
		return &entity.ID
	case *StoredQuery:
		return &entity.ID
	case *User:
		return &entity.ID
	case *RepositoryObject:
		return &entity.ID
	case *Invite:
		return &entity.ID
	default:
		return nil
	}
}

// setEntityTags sets tags on an entity.
func (d *Database) setEntityTags(result SearchResult, tags []Tag) {
	switch entity := result.Entity.(type) {
	case *Workflow:
		entity.Tags = tags
	case *Repository:
		entity.Tags = tags
	case *Connection:
		entity.Tags = tags
	case *StoredQuery:
		entity.Tags = tags
	case *RepositoryObject:
		entity.Tags = tags
	}
}

// searchWorkflows searches workflows using the generic search function.
func (d *Database) searchWorkflows(
	workspaceID uint,
	query string,
	filters SearchFilters,
	parsedQuery *SearchQuery,
) ([]SearchResult, error) {
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
	return d.genericSearch(workspaceID, query, filters, parsedQuery, config)
}

// searchRepositories searches repositories using the generic search function.
func (d *Database) searchRepositories(
	workspaceID uint,
	query string,
	filters SearchFilters,
	parsedQuery *SearchQuery,
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
	return d.genericSearch(workspaceID, query, filters, parsedQuery, config)
}

// searchConnections searches connections using the generic search function.
func (d *Database) searchConnections(
	workspaceID uint,
	query string,
	filters SearchFilters,
	parsedQuery *SearchQuery,
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
	return d.genericSearch(workspaceID, query, filters, parsedQuery, config)
}

// searchStoredQueries searches stored queries using the generic search function.
func (d *Database) searchStoredQueries(
	workspaceID uint,
	query string,
	filters SearchFilters,
	parsedQuery *SearchQuery,
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
	return d.genericSearch(workspaceID, query, filters, parsedQuery, config)
}

// searchScripts searches scripts using the generic search function.
func (d *Database) searchScripts(
	workspaceID uint,
	query string,
	filters SearchFilters,
	parsedQuery *SearchQuery,
) ([]SearchResult, error) {
	config := SearchConfig{
		EntityType:    irminmodels.WorkspaceSearchResultTypeScript,
		Model:         &StoredScript{},
		TableName:     "stored_scripts",
		FieldMappings: map[string]string{"name": "name", "description": "description", "content": "content"},
		FieldWeights: map[string]float64{
			"name":        FieldNameWeight,
			"description": FieldDescriptionWeight,
			"content":     FieldContentWeight,
		},
		JoinTable:       "",
		EntityIDField:   "",
		GetTagsFunc:     d.GetScriptTags,
		Preloads:        []string{"Owner"},
		AdditionalJoins: []string{},
	}
	return d.genericSearch(workspaceID, query, filters, parsedQuery, config)
}

// searchUsers searches users using a specific implementation for workspace relationships.
//
//nolint:gocognit // This function is not complex enough to warrant a refactor.
func (d *Database) searchUsers(
	workspaceID uint,
	query string,
	filters SearchFilters,
	parsedQuery *SearchQuery,
) ([]SearchResult, error) {
	// Build the base query with workspace relationship
	db := d.Model(&User{}).
		Joins("JOIN workspace_users ON users.id = workspace_users.user_id").
		Where("workspace_users.workspace_id = ? AND workspace_users.deleted_at IS NULL", workspaceID)

	// Build search query with conditions and relevance scoring
	db = d.buildSearchQuery(
		db,
		"users",
		query,
		parsedQuery,
		filters,
		map[string]string{
			"first_name": "first_name",
			"last_name":  "last_name",
			"email":      "email",
			"company":    "company",
		},
		map[string]float64{
			"first_name": FieldNameWeight,
			"last_name":  FieldNameWeight,
			"email":      FieldNameWeight,
			"company":    FieldContentWeight,
		},
	)

	// If no query and no filters, return empty result
	if db == nil {
		return []SearchResult{}, nil
	}

	// Apply date filters
	if filters.DateFrom != nil {
		db = db.Where("users.created_at >= ?", *filters.DateFrom)
	}
	if filters.DateTo != nil {
		db = db.Where("users.created_at <= ?", *filters.DateTo)
	}

	// Add preloads - use the correct relation name
	db = db.Preload("Workspaces")

	// Set query timeout for better performance
	db = db.Session(&gorm.Session{
		QueryFields: true, // Only select specified fields for better performance
	})

	// Execute query with dynamic ordering
	orderClause := "relevance_score DESC, users.created_at DESC"

	// Use a map to scan results with relevance score
	var rawResults []map[string]any
	err := db.Order(orderClause).Scan(&rawResults).Error
	if err != nil {
		return nil, err
	}

	// Collect user IDs and relevance scores for batch loading
	type UserRelevance struct {
		ID        uint
		Relevance float64
	}

	var userRelevances []UserRelevance
	var userIDs []uint

	for _, rawResult := range rawResults {
		// Extract relevance score
		relevanceScore := 1.0
		if score, exists := rawResult["relevance_score"]; exists {
			if scoreFloat, valid := score.(float64); valid {
				relevanceScore = scoreFloat
			}
		}

		// Get the user by ID
		if idVal, exists := rawResult["id"]; exists {
			if userID, valid := extractIDFromRawResult(idVal); valid {
				userIDs = append(userIDs, userID)
				userRelevances = append(userRelevances, UserRelevance{
					ID:        userID,
					Relevance: relevanceScore,
				})
			}
		}
	}

	// Batch load users if we have any IDs
	var results []SearchResult
	if len(userIDs) > 0 {
		loader := NewEntityLoader(d)
		usersMap, loadErr := loader.BatchLoadEntities(&User{}, userIDs, []string{"Workspaces"})
		if loadErr != nil {
			return nil, loadErr
		}

		// Create search results with proper relevance scores
		for _, userRel := range userRelevances {
			if user, exists := usersMap[userRel.ID]; exists {
				result := createSearchResult(irminmodels.WorkspaceSearchResultTypeUser, query, user, userRel.Relevance)
				results = append(results, result)
			}
		}
	}

	return results, nil
}

// searchRepositoryObjects searches repository objects using a specific implementation for workspace relationships.
//
//nolint:gocognit // This function is not complex enough to warrant a refactor.
func (d *Database) searchRepositoryObjects(
	workspaceID uint,
	query string,
	filters SearchFilters,
	parsedQuery *SearchQuery,
) ([]SearchResult, error) {
	// Build the base query with workspace relationship
	db := d.Model(&RepositoryObject{}).
		Joins("JOIN repositories ON repository_objects.repository_id = repositories.id").
		Where("repositories.workspace_id = ? AND repositories.deleted_at IS NULL", workspaceID)

	// Build search query with conditions and relevance scoring
	db = d.buildSearchQuery(
		db,
		"repository_objects",
		query,
		parsedQuery,
		filters,
		map[string]string{
			"name":            "repository_objects.name",
			"path":            "repository_objects.path",
			"content_type":    "repository_objects.content_type",
			"repository_name": "repositories.name",
			"repository_slug": "repositories.slug",
		},
		map[string]float64{
			"name":            FieldNameWeight,
			"path":            FieldDescriptionWeight,
			"content_type":    FieldContentWeight,
			"repository_name": FieldDescriptionWeight,
			"repository_slug": FieldDescriptionWeight,
		},
	)

	// If no query and no filters, return empty result
	if db == nil {
		return []SearchResult{}, nil
	}

	// Apply date filters
	if filters.DateFrom != nil {
		db = db.Where("repository_objects.created_at >= ?", *filters.DateFrom)
	}
	if filters.DateTo != nil {
		db = db.Where("repository_objects.created_at <= ?", *filters.DateTo)
	}

	// Apply owner filter if specified
	if filters.OwnerID != nil {
		db = db.Where("repositories.owner_id = ?", *filters.OwnerID)
	}

	// Add preloads
	db = db.Preload("Repository").Preload("Parent")

	// Add tag filtering if specified
	if len(filters.Tags) > 0 {
		db = db.Joins("JOIN repository_object_tags ON repository_objects.id = repository_object_tags.repository_object_id").
			Where("repository_object_tags.tag_id IN ?", filters.Tags)
	}

	// Set query timeout for better performance
	db = db.Session(&gorm.Session{
		QueryFields: true, // Only select specified fields for better performance
	})

	// Execute query with dynamic ordering
	orderClause := "relevance_score DESC, repository_objects.created_at DESC"

	// Use a map to scan results with relevance score
	var rawResults []map[string]any
	err := db.Order(orderClause).Scan(&rawResults).Error
	if err != nil {
		return nil, err
	}

	// Collect repository object IDs and relevance scores for batch loading
	type RepositoryObjectRelevance struct {
		ID        uint
		Relevance float64
	}

	var repoObjRelevances []RepositoryObjectRelevance
	var repoObjIDs []uint

	for _, rawResult := range rawResults {
		// Extract relevance score
		relevanceScore := 1.0
		if score, exists := rawResult["relevance_score"]; exists {
			if scoreFloat, valid := score.(float64); valid {
				relevanceScore = scoreFloat
			}
		}

		// Get the repository object by ID
		if idVal, exists := rawResult["id"]; exists {
			if repoObjID, valid := extractIDFromRawResult(idVal); valid {
				repoObjIDs = append(repoObjIDs, repoObjID)
				repoObjRelevances = append(repoObjRelevances, RepositoryObjectRelevance{
					ID:        repoObjID,
					Relevance: relevanceScore,
				})
			}
		}
	}

	// Batch load repository objects if we have any IDs
	var results []SearchResult
	if len(repoObjIDs) > 0 {
		loader := NewEntityLoader(d)
		repoObjsMap, loadErr := loader.BatchLoadEntities(
			&RepositoryObject{},
			repoObjIDs,
			[]string{"Repository", "Parent"},
		)
		if loadErr != nil {
			return nil, loadErr
		}

		// Create search results with proper relevance scores
		for _, repoObjRel := range repoObjRelevances {
			if repoObj, exists := repoObjsMap[repoObjRel.ID]; exists {
				result := createSearchResult(
					irminmodels.WorkspaceSearchResultTypeRepositoryObject,
					query,
					repoObj,
					repoObjRel.Relevance,
				)
				results = append(results, result)
			}
		}
	}

	// Load tags separately
	results = d.loadTagsForResults(results, SearchEntityTypeRepositoryObject)

	return results, nil
}

// searchInvites searches invites using the generic search function.
func (d *Database) searchInvites(
	workspaceID uint,
	query string,
	filters SearchFilters,
	parsedQuery *SearchQuery,
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
	return d.genericSearch(workspaceID, query, filters, parsedQuery, config)
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
	case irminmodels.WorkspaceSearchResultTypeScript:
		return ScriptPriority
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
	case *StoredScript:
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
		return "workflow:" + string(result.Type) + ":" + strconv.FormatUint(uint64(entity.ID), 10)
	case *Repository:
		return "repository:" + string(result.Type) + ":" + strconv.FormatUint(uint64(entity.ID), 10)
	case *Connection:
		return "connection:" + string(result.Type) + ":" + strconv.FormatUint(uint64(entity.ID), 10)
	case *StoredQuery:
		return "query:" + string(result.Type) + ":" + strconv.FormatUint(uint64(entity.ID), 10)
	case *User:
		return "user:" + string(result.Type) + ":" + strconv.FormatUint(uint64(entity.ID), 10)
	case *RepositoryObject:
		return "repo_object:" + string(result.Type) + ":" + strconv.FormatUint(uint64(entity.ID), 10)
	case *Invite:
		return "invite:" + string(result.Type) + ":" + strconv.FormatUint(uint64(entity.ID), 10)
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
			boosted[i].Relevance = roundRelevance(boosted[i].Relevance * ExactMatchBoostFactor) // Boost by 50%
		}

		// Check for prefix matches
		if s.hasPrefixMatch(result, queryLower) {
			boosted[i].Relevance = roundRelevance(boosted[i].Relevance * PrefixMatchBoostFactor) // Boost by 20%
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
	case *StoredScript:
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
	case *StoredScript:
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

// CalculateEnhancedRelevance calculates enhanced relevance scores for search results.
func (s *SearchResultSorter) CalculateEnhancedRelevance(
	results []SearchResult,
	parsedQuery *SearchQuery,
) []SearchResult {
	if parsedQuery == nil {
		return results
	}

	boosted := make([]SearchResult, len(results))
	copy(boosted, results)

	for i, result := range results {
		boosted[i] = result

		// Check for exact matches in entity names
		if s.hasExactMatch(result, strings.ToLower(parsedQuery.OriginalQuery)) {
			boosted[i].Relevance = roundRelevance(boosted[i].Relevance * ExactMatchBoostFactor) // Boost by 50%
		}

		// Check for prefix matches
		if s.hasPrefixMatch(result, strings.ToLower(parsedQuery.OriginalQuery)) {
			boosted[i].Relevance = roundRelevance(boosted[i].Relevance * PrefixMatchBoostFactor) // Boost by 20%
		}
	}

	return boosted
}

// buildSearchQuery builds the database query with search conditions and relevance scoring.
func (d *Database) buildSearchQuery(
	db *gorm.DB,
	tableName string,
	query string,
	parsedQuery *SearchQuery,
	filters SearchFilters,
	fieldMappings map[string]string,
	fieldWeights map[string]float64,
) *gorm.DB {
	// Handle case where no query is provided
	if query == "" || parsedQuery == nil {
		return d.buildQueryWithoutSearch(db, tableName, filters)
	}

	// Build search conditions
	searchConditions := d.buildEnhancedSearchConditions(parsedQuery, tableName, fieldMappings)
	if len(searchConditions) > 0 {
		db = d.applySearchConditions(db, searchConditions)
	}

	// Calculate enhanced relevance score
	relevanceExpr := d.buildEnhancedRelevanceExpression(parsedQuery, tableName, fieldMappings, fieldWeights)
	db = db.Select(tableName + ".*, " + relevanceExpr + " as relevance_score")

	return db
}

// buildQueryWithoutSearch builds a query when no search term is provided.
func (d *Database) buildQueryWithoutSearch(
	db *gorm.DB,
	tableName string,
	filters SearchFilters,
) *gorm.DB {
	hasFilters := d.hasAnyFilters(filters)

	if hasFilters {
		// Apply filters only, with default relevance score
		return db.Select(tableName + ".*, 1.0 as relevance_score")
	}

	// No query and no filters, return empty result
	return nil
}

// hasAnyFilters checks if any filters are applied for the given entity type.
func (d *Database) hasAnyFilters(filters SearchFilters) bool {
	return filters.OwnerID != nil || filters.DateFrom != nil || filters.DateTo != nil || len(filters.Tags) > 0
}

// applyCommonFilters applies common filters to the database query.
func (d *Database) applyCommonFilters(db *gorm.DB, filters SearchFilters, tableName string) *gorm.DB {
	// Add filters
	if filters.OwnerID != nil {
		db = db.Where("owner_id = ?", *filters.OwnerID)
	}
	if filters.DateFrom != nil {
		db = db.Where(tableName+".created_at >= ?", *filters.DateFrom)
	}
	if filters.DateTo != nil {
		db = db.Where(tableName+".created_at <= ?", *filters.DateTo)
	}

	return db
}

// applyTagFilter applies tag filtering to the database query.
func (d *Database) applyTagFilter(db *gorm.DB, filters SearchFilters, joinTable, entityIDField string) *gorm.DB {
	if len(filters.Tags) > 0 {
		db = db.Joins("JOIN "+joinTable+" ON "+entityIDField+" = "+joinTable+"."+entityIDField).
			Where(joinTable+".tag_id IN ?", filters.Tags)
	}
	return db
}

// genericSearch performs a generic search operation for any entity type with optional timeout.
//
//nolint:gocognit,funlen // This function handles complex search logic that cannot be easily simplified
func (d *Database) genericSearch(
	workspaceID uint,
	query string,
	filters SearchFilters,
	parsedQuery *SearchQuery,
	config SearchConfig,
) ([]SearchResult, error) {
	// Build the base query
	db := d.Model(config.Model).
		Where(config.TableName+".workspace_id = ? AND "+config.TableName+".deleted_at IS NULL", workspaceID)

	// Apply database timeout if limits are specified
	var cancel context.CancelFunc
	if filters.Limits != nil && filters.Limits.DatabaseTimeout > 0 {
		db, cancel = applyQueryTimeout(db, filters.Limits.DatabaseTimeout)
		defer cancel() // Ensure resources are cleaned up when function returns
	}

	// Add additional joins if specified
	for _, join := range config.AdditionalJoins {
		db = db.Joins(join)
	}

	// Build search query with conditions and relevance scoring
	db = d.buildSearchQuery(
		db,
		config.TableName,
		query,
		parsedQuery,
		filters,
		config.FieldMappings,
		config.FieldWeights,
	)

	// If no query and no filters, return empty result
	if db == nil {
		return []SearchResult{}, nil
	}

	// Apply common filters
	db = d.applyCommonFilters(db, filters, config.TableName)

	// Add preloads
	for _, preload := range config.Preloads {
		db = db.Preload(preload)
	}

	// Add tag filtering if join table is specified
	if config.JoinTable != "" {
		db = d.applyTagFilter(db, filters, config.JoinTable, config.EntityIDField)
	}

	// Set query timeout for better performance
	db = db.Session(&gorm.Session{
		QueryFields: true, // Only select specified fields for better performance
	})

	// Apply per-type result limit
	if filters.Limits != nil && filters.Limits.MaxResultsPerType > 0 {
		db = db.Limit(filters.Limits.MaxResultsPerType)
	}

	// Execute query with dynamic ordering
	orderClause := "relevance_score DESC, " + config.TableName + ".created_at DESC"

	// Use a map to scan results with relevance score
	var rawResults []map[string]any
	err := db.Order(orderClause).Scan(&rawResults).Error
	if err != nil {
		return nil, err
	}

	// Collect entity IDs and relevance scores for batch loading
	type EntityRelevance struct {
		ID        uint
		Relevance float64
	}

	var entityRelevances []EntityRelevance
	var entityIDs []uint

	for _, rawResult := range rawResults {
		// Extract relevance score
		relevanceScore := 1.0
		if score, exists := rawResult["relevance_score"]; exists {
			if scoreFloat, valid := score.(float64); valid {
				relevanceScore = scoreFloat
			}
		}

		// Get the entity by ID
		if idVal, exists := rawResult["id"]; exists {
			if entityID, valid := extractIDFromRawResult(idVal); valid {
				entityIDs = append(entityIDs, entityID)
				entityRelevances = append(entityRelevances, EntityRelevance{
					ID:        entityID,
					Relevance: relevanceScore,
				})
			}
		}
	}

	// Batch load entities if we have any IDs
	var results []SearchResult
	if len(entityIDs) > 0 {
		loader := NewEntityLoader(d)

		// Apply timeout to entity loader if specified
		var entitiesMap map[uint]any
		var loadErr error

		if filters.Limits != nil && filters.Limits.DatabaseTimeout > 0 {
			// Create a timeout context for batch loading
			ctx, batchCancel := context.WithTimeout(context.Background(), filters.Limits.DatabaseTimeout)
			defer batchCancel()

			// Use timeout-aware loading
			resultChan := make(chan struct {
				entities map[uint]any
				err      error
			}, 1)

			go func() {
				entities, batchErr := loader.BatchLoadEntities(config.Model, entityIDs, config.Preloads)
				resultChan <- struct {
					entities map[uint]any
					err      error
				}{entities, batchErr}
			}()

			select {
			case result := <-resultChan:
				entitiesMap, loadErr = result.entities, result.err
			case <-ctx.Done():
				return nil, ctx.Err()
			}
		} else {
			entitiesMap, loadErr = loader.BatchLoadEntities(config.Model, entityIDs, config.Preloads)
		}

		if loadErr != nil {
			return nil, loadErr
		}

		// Create search results with proper relevance scores
		for _, entityRel := range entityRelevances {
			if entity, exists := entitiesMap[entityRel.ID]; exists {
				result := createSearchResult(config.EntityType, query, entity, entityRel.Relevance)
				results = append(results, result)
			}
		}
	}

	// Load tags separately if getTagsFunc is provided
	if config.GetTagsFunc != nil {
		entityTypeStr := entityTypeToString(config.EntityType)
		if entityTypeStr != "" {
			results = d.loadTagsForResults(results, entityTypeStr)
		}
	}

	return results, nil
}

// BatchLoadResult represents the result of a batch loading operation.
type BatchLoadResult struct {
	Entities map[uint]any   // Map of entity ID to entity
	Tags     map[uint][]Tag // Map of entity ID to tags
}

// EntityLoader provides methods for batch loading entities.
type EntityLoader struct {
	db *Database
}

// NewEntityLoader creates a new EntityLoader instance.
func NewEntityLoader(db *Database) *EntityLoader {
	return &EntityLoader{db: db}
}

// BatchLoadEntities loads multiple entities of the same type in a single query.
func (el *EntityLoader) BatchLoadEntities(
	model any,
	ids []uint,
	preloads []string,
) (map[uint]any, error) {
	if len(ids) == 0 {
		return make(map[uint]any), nil
	}

	// Split into batches if needed
	entities := make(map[uint]any)

	for i := 0; i < len(ids); i += MaxBatchSize {
		end := i + MaxBatchSize
		if end > len(ids) {
			end = len(ids)
		}

		batchIDs := ids[i:end]
		batchEntities, err := el.loadEntityBatch(model, batchIDs, preloads)
		if err != nil {
			return nil, err
		}

		// Merge batch results
		for id, entity := range batchEntities {
			entities[id] = entity
		}
	}

	return entities, nil
}

// loadEntityBatch loads a single batch of entities.
func (el *EntityLoader) loadEntityBatch(
	model any,
	ids []uint,
	preloads []string,
) (map[uint]any, error) {
	// Create slice of models to hold results
	modelType := reflect.TypeOf(model).Elem()
	resultsSlice := reflect.New(reflect.SliceOf(reflect.PointerTo(modelType))).Interface()

	// Build query with preloads
	db := el.db.Model(model)
	for _, preload := range preloads {
		db = db.Preload(preload)
	}

	// Execute batch query
	err := db.Where("id IN ?", ids).Find(resultsSlice).Error
	if err != nil {
		return nil, err
	}

	// Convert slice to map
	entities := make(map[uint]any)
	resultsValue := reflect.ValueOf(resultsSlice).Elem()

	for i := range resultsValue.Len() {
		entity := resultsValue.Index(i).Interface()
		id := el.extractEntityIDFromInterface(entity)
		if id != nil {
			entities[*id] = entity
		}
	}

	return entities, nil
}

// BatchLoadTags loads tags for multiple entities in batches.
func (el *EntityLoader) BatchLoadTags(
	entityType string,
	entityIDs []uint,
) (map[uint][]Tag, error) {
	if len(entityIDs) == 0 {
		return make(map[uint][]Tag), nil
	}

	// Determine the join table and field names based on entity type
	joinTable, entityField := el.getTagJoinInfo(entityType)
	if joinTable == "" {
		return make(map[uint][]Tag), nil
	}

	tags := make(map[uint][]Tag)

	// Split into batches if needed
	for i := 0; i < len(entityIDs); i += MaxBatchSize {
		end := i + MaxBatchSize
		if end > len(entityIDs) {
			end = len(entityIDs)
		}

		batchIDs := entityIDs[i:end]
		batchTags, err := el.loadTagBatch(joinTable, entityField, batchIDs)
		if err != nil {
			return nil, err
		}

		// Merge batch results
		for id, entityTags := range batchTags {
			tags[id] = entityTags
		}
	}

	return tags, nil
}

// loadTagBatch loads tags for a single batch of entities.
func (el *EntityLoader) loadTagBatch(
	joinTable, entityField string,
	entityIDs []uint,
) (map[uint][]Tag, error) {
	type TagResult struct {
		EntityID uint `gorm:"column:entity_id"`
		Tag      Tag  `gorm:"embedded"`
	}

	var results []TagResult

	// Query to get all tags for the batch of entities
	query := `
		SELECT ` + joinTable + `.` + entityField + ` as entity_id,
		       tags.id, tags.name, tags.color, tags.workspace_id, 
		       tags.created_at, tags.updated_at, tags.deleted_at
		FROM ` + joinTable + `
		JOIN tags ON ` + joinTable + `.tag_id = tags.id
		WHERE ` + joinTable + `.` + entityField + ` IN ?
		AND tags.deleted_at IS NULL
	`

	err := el.db.Raw(query, entityIDs).Scan(&results).Error
	if err != nil {
		return nil, err
	}

	// Group tags by entity ID
	tags := make(map[uint][]Tag)
	for _, result := range results {
		tags[result.EntityID] = append(tags[result.EntityID], result.Tag)
	}

	// Initialize empty slices for entities with no tags
	for _, entityID := range entityIDs {
		if _, exists := tags[entityID]; !exists {
			tags[entityID] = []Tag{}
		}
	}

	return tags, nil
}

// getTagJoinInfo returns the join table and entity field name for tag relationships.
func (el *EntityLoader) getTagJoinInfo(entityType string) (string, string) {
	switch entityType {
	case SearchEntityTypeWorkflow:
		return "workflow_tags", "workflow_id"
	case SearchEntityTypeRepository:
		return "repository_tags", "repository_id"
	case SearchEntityTypeConnection:
		return "connection_tags", "connection_id"
	case SearchEntityTypeQuery:
		return "query_tags", "stored_query_id"
	case SearchEntityTypeScript:
		return "script_tags", "stored_script_id"
	case SearchEntityTypeRepositoryObject:
		return "repository_object_tags", "repository_object_id"
	default:
		return "", ""
	}
}

// entityTypeToString converts an EntityType to a string for batch loading.
func entityTypeToString(entityType irminmodels.WorkspaceSearchResultType) string {
	switch entityType {
	case irminmodels.WorkspaceSearchResultTypeWorkflow:
		return SearchEntityTypeWorkflow
	case irminmodels.WorkspaceSearchResultTypeRepository:
		return SearchEntityTypeRepository
	case irminmodels.WorkspaceSearchResultTypeConnection:
		return SearchEntityTypeConnection
	case irminmodels.WorkspaceSearchResultTypeQuery:
		return SearchEntityTypeQuery
	case irminmodels.WorkspaceSearchResultTypeScript:
		return SearchEntityTypeScript
	case irminmodels.WorkspaceSearchResultTypeRepositoryObject:
		return SearchEntityTypeRepositoryObject
	case irminmodels.WorkspaceSearchResultTypeUser:
		return "" // Users don't have tags
	case irminmodels.WorkspaceSearchResultTypeInvite:
		return "" // Invites don't have tags
	default:
		return ""
	}
}

// extractEntityIDFromInterface extracts the ID field from an entity interface.
func (el *EntityLoader) extractEntityIDFromInterface(entity any) *uint {
	if entity == nil {
		return nil
	}

	// Use reflection to get the ID field
	value := reflect.ValueOf(entity)

	// Handle pointer types
	if value.Kind() == reflect.Ptr {
		if value.IsNil() {
			return nil
		}
		value = value.Elem()
	}

	// Get the ID field
	if value.Kind() == reflect.Struct {
		idField := value.FieldByName("ID")
		if idField.IsValid() && idField.CanInterface() {
			if id, ok := idField.Interface().(uint); ok {
				return &id
			}
		}
	}

	return nil
}

// extractIDFromRawResult safely extracts and converts an ID from a raw database result.
func extractIDFromRawResult(idVal any) (uint, bool) {
	switch val := idVal.(type) {
	case uint:
		return val, true
	case int64:
		if val >= 0 && val <= 0xFFFFFFFF { // Check for safe conversion
			return uint(val), true
		}
	case float64:
		if val >= 0 && val <= 0xFFFFFFFF && val == float64(uint(val)) { // Check for safe integer conversion
			return uint(val), true
		}
	}
	return 0, false
}

// searchWorkflowsWithLimits wraps searchWorkflows with context and timeout support.
func (d *Database) searchWorkflowsWithLimits(
	ctx context.Context,
	workspaceID uint,
	query string,
	filters SearchFilters,
	parsedQuery *SearchQuery,
) ([]SearchResult, error) {
	return d.executeSearchWithTimeout(ctx, filters.Limits.DatabaseTimeout, func() ([]SearchResult, error) {
		return d.searchWorkflows(workspaceID, query, filters, parsedQuery)
	})
}

// searchRepositoriesWithLimits wraps searchRepositories with context and timeout support.
func (d *Database) searchRepositoriesWithLimits(
	ctx context.Context,
	workspaceID uint,
	query string,
	filters SearchFilters,
	parsedQuery *SearchQuery,
) ([]SearchResult, error) {
	return d.executeSearchWithTimeout(ctx, filters.Limits.DatabaseTimeout, func() ([]SearchResult, error) {
		return d.searchRepositories(workspaceID, query, filters, parsedQuery)
	})
}

// searchConnectionsWithLimits wraps searchConnections with context and timeout support.
func (d *Database) searchConnectionsWithLimits(
	ctx context.Context,
	workspaceID uint,
	query string,
	filters SearchFilters,
	parsedQuery *SearchQuery,
) ([]SearchResult, error) {
	return d.executeSearchWithTimeout(ctx, filters.Limits.DatabaseTimeout, func() ([]SearchResult, error) {
		return d.searchConnections(workspaceID, query, filters, parsedQuery)
	})
}

// searchStoredQueriesWithLimits wraps searchStoredQueries with context and timeout support.
func (d *Database) searchStoredQueriesWithLimits(
	ctx context.Context,
	workspaceID uint,
	query string,
	filters SearchFilters,
	parsedQuery *SearchQuery,
) ([]SearchResult, error) {
	return d.executeSearchWithTimeout(ctx, filters.Limits.DatabaseTimeout, func() ([]SearchResult, error) {
		return d.searchStoredQueries(workspaceID, query, filters, parsedQuery)
	})
}

// searchScriptsWithLimits wraps searchScripts with context and timeout support.
func (d *Database) searchScriptsWithLimits(
	ctx context.Context,
	workspaceID uint,
	query string,
	filters SearchFilters,
	parsedQuery *SearchQuery,
) ([]SearchResult, error) {
	return d.executeSearchWithTimeout(ctx, filters.Limits.DatabaseTimeout, func() ([]SearchResult, error) {
		return d.searchScripts(workspaceID, query, filters, parsedQuery)
	})
}

// searchUsersWithLimits wraps searchUsers with context and timeout support.
func (d *Database) searchUsersWithLimits(
	ctx context.Context,
	workspaceID uint,
	query string,
	filters SearchFilters,
	parsedQuery *SearchQuery,
) ([]SearchResult, error) {
	return d.executeSearchWithTimeout(ctx, filters.Limits.DatabaseTimeout, func() ([]SearchResult, error) {
		return d.searchUsers(workspaceID, query, filters, parsedQuery)
	})
}

// searchRepositoryObjectsWithLimits wraps searchRepositoryObjects with context and timeout support.
func (d *Database) searchRepositoryObjectsWithLimits(
	ctx context.Context,
	workspaceID uint,
	query string,
	filters SearchFilters,
	parsedQuery *SearchQuery,
) ([]SearchResult, error) {
	return d.executeSearchWithTimeout(ctx, filters.Limits.DatabaseTimeout, func() ([]SearchResult, error) {
		return d.searchRepositoryObjects(workspaceID, query, filters, parsedQuery)
	})
}

// searchInvitesWithLimits wraps searchInvites with context and timeout support.
func (d *Database) searchInvitesWithLimits(
	ctx context.Context,
	workspaceID uint,
	query string,
	filters SearchFilters,
	parsedQuery *SearchQuery,
) ([]SearchResult, error) {
	return d.executeSearchWithTimeout(ctx, filters.Limits.DatabaseTimeout, func() ([]SearchResult, error) {
		return d.searchInvites(workspaceID, query, filters, parsedQuery)
	})
}

// executeSearchWithTimeout executes a search function with timeout protection.
func (d *Database) executeSearchWithTimeout(
	ctx context.Context,
	timeout time.Duration,
	searchFunc func() ([]SearchResult, error),
) ([]SearchResult, error) {
	// Create a channel to receive the result
	resultChan := make(chan struct {
		results []SearchResult
		err     error
	}, 1)

	// Execute the search in a goroutine
	go func() {
		results, err := searchFunc()
		resultChan <- struct {
			results []SearchResult
			err     error
		}{results, err}
	}()

	// Wait for either the result or timeout
	select {
	case result := <-resultChan:
		return result.results, result.err
	case <-ctx.Done():
		return nil, ctx.Err()
	case <-time.After(timeout):
		return nil, NewSearchTimeoutError(int(timeout.Seconds()))
	}
}

// applyQueryTimeout applies timeout to a database query if timeout is specified.
// Returns the database instance with context and a cancel function that MUST be called to prevent resource leaks.
func applyQueryTimeout(db *gorm.DB, timeout time.Duration) (*gorm.DB, context.CancelFunc) {
	if timeout > 0 {
		ctx, cancel := context.WithTimeout(context.Background(), timeout)
		return db.WithContext(ctx), cancel
	}
	return db, func() {} // Return no-op cancel function when no timeout is set
}

// CreateCustomSearchLimits creates a SearchLimits configuration with custom values.
func CreateCustomSearchLimits(maxTotal, maxPerType, timeoutSeconds int) SearchLimits {
	limits := SearchLimits{
		MaxTotalResults:        maxTotal,
		MaxResultsPerType:      maxPerType,
		TimeoutSeconds:         timeoutSeconds,
		DatabaseTimeout:        time.Duration(DatabaseQueryTimeout) * time.Second,
		EnableEarlyTermination: true,
	}
	return ValidateSearchLimits(limits)
}

// CreateFastSearchLimits creates search limits optimized for fast responses.
func CreateFastSearchLimits() SearchLimits {
	return SearchLimits{
		MaxTotalResults:        FastSearchMaxResults,                             // Reduced total
		MaxResultsPerType:      FastSearchMaxPerType,                             // Reduced per type
		TimeoutSeconds:         FastSearchTimeout,                                // Shorter timeout
		DatabaseTimeout:        time.Duration(FastSearchDBTimeout) * time.Second, // Shorter DB timeout
		EnableEarlyTermination: true,
	}
}

// CreateExtensiveSearchLimits creates search limits for comprehensive searches.
func CreateExtensiveSearchLimits() SearchLimits {
	return SearchLimits{
		MaxTotalResults:        MaxSearchResults,                                      // Maximum allowed
		MaxResultsPerType:      MaxResultsPerEntityType,                               // Maximum per type
		TimeoutSeconds:         MaxSearchTimeout,                                      // Longer timeout
		DatabaseTimeout:        time.Duration(ExtensiveSearchDBTimeout) * time.Second, // Longer DB timeout
		EnableEarlyTermination: false,                                                 // Don't terminate early
	}
}

// ValidateSearchToken performs comprehensive security validation on search tokens.
func ValidateSearchToken(token SearchToken) bool {
	// Check token value length
	if len(token.Value) == 0 || len(token.Value) > MaxSearchTokenLength {
		return false
	}

	// Reject tokens that are only special characters or whitespace
	trimmed := strings.TrimSpace(token.Value)
	if len(trimmed) == 0 {
		return false
	}

	// Check for SQL injection patterns
	if ContainsSQLInjectionPattern(token.Value) {
		return false
	}

	// Validate token content based on type
	switch token.Type {
	case TokenTypeWord, TokenTypePhrase:
		// Allow normal search terms but check for suspicious patterns
		return !ContainsSuspiciousPatterns(token.Value)
	case TokenTypeFilter, TokenTypeOperator:
		// Stricter validation for filter/operator tokens
		return isValidFilterToken(token.Value)
	default:
		return true
	}
}

// ContainsSQLInjectionPattern checks for common SQL injection patterns.
func ContainsSQLInjectionPattern(input string) bool {
	for _, pattern := range getSQLInjectionPatterns() {
		if pattern.MatchString(input) {
			return true
		}
	}
	return false
}

// ContainsSuspiciousPatterns checks for additional suspicious patterns.
func ContainsSuspiciousPatterns(input string) bool {
	// Check for excessive special characters (but be more lenient for legitimate searches)
	specialCharCount := 0
	for _, char := range input {
		if !unicode.IsLetter(char) && !unicode.IsDigit(char) && !unicode.IsSpace(char) {
			// Allow common legitimate special characters
			if char != '.' && char != '@' && char != '_' && char != '-' && char != '+' && char != '#' {
				specialCharCount++
			}
		}
	}

	// Reject if more than 70% special characters (more lenient than 50%)
	// This allows searches like "C++", "user@domain.com", etc.
	if len(input) > 0 && float64(specialCharCount)/float64(len(input)) > 0.7 {
		return true
	}

	// Check for suspicious character sequences
	suspiciousPatterns := []string{
		"--", "/*", "*/", "@@", "xp_", "sp_", "<script", "</script>",
		"<iframe", "javascript:", "vbscript:", "onload=", "onerror=",
	}

	lowerInput := strings.ToLower(input)
	for _, pattern := range suspiciousPatterns {
		if strings.Contains(lowerInput, pattern) {
			return true
		}
	}

	return false
}

// isValidFilterToken validates filter/operator tokens against allowed patterns.
func isValidFilterToken(token string) bool {
	// Allow specific filter operators only
	allowedFilters := []string{
		"type:", "tag:", "owner:", "date:", "created:", "updated:",
	}

	for _, allowed := range allowedFilters {
		if strings.HasPrefix(strings.ToLower(token), allowed) {
			return true
		}
	}

	return false
}

// roundRelevance rounds a relevance score to 2 decimal places.
func roundRelevance(score float64) float64 {
	return math.Round(score*RelevanceRoundingBase) / RelevanceRoundingBase
}

// Security validation patterns.
var (
	// Valid field reference pattern (alphanumeric, dots, underscores only).
	validFieldRegex = regexp.MustCompile(`^[a-zA-Z][a-zA-Z0-9_.]*$`)

	// Valid table name pattern.
	validTableRegex = regexp.MustCompile(`^[a-zA-Z][a-zA-Z0-9_]*$`)
)

// getSQLInjectionPatterns returns SQL injection detection patterns.
func getSQLInjectionPatterns() []*regexp.Regexp {
	return []*regexp.Regexp{
		regexp.MustCompile(`(?i)\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b`),
		regexp.MustCompile(`(?i)\b(script|javascript|vbscript)\b|(?i)(onload|onerror|onclick)`),
		regexp.MustCompile(`(?i)(xp_|sp_|sys\.|information_schema\.)`),
		regexp.MustCompile(`[';](\s*--|\s*/\*)`),
		regexp.MustCompile(`\b(0x[0-9a-f]+|char\(|ascii\(|substring\()`),
		regexp.MustCompile(`(?i)(load_file|into\s+outfile|into\s+dumpfile)`),
	}
}

// getAllowedFieldNames returns the whitelist of allowed field names.
func getAllowedFieldNames() map[string]bool {
	return map[string]bool{
		"id":            true,
		"name":          true,
		"title":         true,
		"description":   true,
		"documentation": true,
		"content":       true,
		"filename":      true,
		"path":          true,
		"email":         true,
		"username":      true,
		"display_name":  true,
		"first_name":    true,
		"last_name":     true,
		"company":       true,
		"sql":           true,
		"content_type":  true,
		"clerk_id":      true,
		"slug":          true,
		"created_at":    true,
		"updated_at":    true,
		"workspace_id":  true,
		"owner_id":      true,
		"type":          true,
		"status":        true,
		"url":           true,
		"config":        true,
		"metadata":      true,
	}
}

// getAllowedTableNames returns the whitelist of allowed table names.
func getAllowedTableNames() map[string]bool {
	return map[string]bool{
		"workflows":          true,
		"repositories":       true,
		"connections":        true,
		"stored_queries":     true,
		"users":              true,
		"repository_objects": true,
		"invites":            true,
		"workspace_users":    true,
	}
}
