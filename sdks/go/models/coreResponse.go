package irminmodels

// IrminAPIPaginationMetadata represents the pagination metadata from the Irmin Core API.
type IrminAPIPaginationMetadata struct {
	// Total is the total number of items available
	Total *int `json:"total,omitempty"       validate:"omitempty,gte=0" example:"150"`
	// Current page number
	Page *int `json:"page,omitempty"        validate:"omitempty,gte=1" example:"2"`
	// Number of items per page
	PerPage *int `json:"per_page,omitempty"    validate:"omitempty,gte=1" example:"20"`
	// Total number of pages available
	TotalPages *int `json:"total_pages,omitempty" validate:"omitempty,gte=0" example:"8"`
	// HasMore indicates if there are more items available
	HasMore *bool `json:"has_more,omitempty"                               example:"true"`
	// Next is the next page number or token, if applicable
	Next *string `json:"next,omitempty"                                   example:"3"`
}

// IrminAPIResponse is a "raw" response type where the `Data` is `json.RawMessage`.
// This lets us unmarshal it a second time into the type we actually want.
type IrminAPIResponse struct {
	Pagination *IrminAPIPaginationMetadata `json:"pagination,omitempty"`
	Metadata   map[string]string           `json:"metadata,omitempty"`
	Message    string                      `json:"message,omitempty"    example:"Operation completed successfully"             validate:"max=140"`
	Errors     []string                    `json:"errors,omitempty"     example:"Field validation failed,Invalid input format" validate:"dive"`
	Data       any                         `json:"data,omitempty"`
}
