package controllers

import (
	"math"
	"strconv"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// paginationParams is a struct that contains the pagination parameters.
type paginationParams struct {
	perPage int
	page    int
	offset  int
}

// parsePaginationParams parses the pagination parameters from the request.
func parsePaginationParams(params map[string]string) paginationParams {
	perPage := 100
	page := 1
	if params["per_page"] != "" {
		if parsedPerPage, err := strconv.Atoi(params["per_page"]); err == nil {
			perPage = parsedPerPage
		}
	}
	if params["page"] != "" {
		if parsedPage, err := strconv.Atoi(params["page"]); err == nil {
			page = parsedPage
		}
	}
	return paginationParams{
		perPage: perPage,
		page:    page,
		offset:  (page - 1) * perPage,
	}
}

// buildPaginationResponse builds the pagination response.
func buildPaginationResponse(count int64, pagination paginationParams) *irminmodels.IrminAPIPaginationMetadata {
	totalPages := int(math.Ceil(float64(count) / float64(pagination.perPage)))
	hasMore := pagination.page < totalPages
	var nextPage *string
	if hasMore {
		nextPageStr := strconv.Itoa(pagination.page + 1)
		nextPage = &nextPageStr
	}

	return &irminmodels.IrminAPIPaginationMetadata{
		Total:      int(count),
		TotalPages: totalPages,
		Page:       &pagination.page,
		PerPage:    pagination.perPage,
		HasMore:    hasMore,
		Next:       nextPage,
	}
}

// cursorPaginationParams is a struct that contains the cursor-based pagination parameters.
type cursorPaginationParams struct {
	perPage int
	after   *string
}

// parseCursorPaginationParams parses the cursor-based pagination parameters from the request.
func parseCursorPaginationParams(params map[string]string) cursorPaginationParams {
	perPage := 100
	if params["per_page"] != "" {
		if parsedPerPage, err := strconv.Atoi(params["per_page"]); err == nil {
			perPage = parsedPerPage
		}
	}

	var after *string
	if afterVal, exists := params["after"]; exists && afterVal != "" {
		after = &afterVal
	}

	return cursorPaginationParams{
		perPage: perPage,
		after:   after,
	}
}

// buildCursorPaginationResponse builds the cursor-based pagination response.
func buildCursorPaginationResponse(
	count int,
	perPage int,
	hasMore bool,
	nextOffset *string,
) *irminmodels.IrminAPIPaginationMetadata {
	return &irminmodels.IrminAPIPaginationMetadata{
		Total:   count,
		PerPage: perPage,
		HasMore: hasMore,
		Next:    nextOffset,
	}
}
