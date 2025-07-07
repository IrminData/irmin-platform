package irminmodels

// IrminAPIPaginationMetadata represents the pagination metadata from the Irmin Core API.
type IrminAPIPaginationMetadata struct {
	// Total is the total number of items available
	Total int `json:"total"          validate:"required,min=0"`
	// Current page number
	Page *int `json:"page,omitempty" validate:"min=1"`
	// Number of items per page
	PerPage int `json:"per_page"       validate:"required,min=1,max=1000"`
	// Total number of pages available
	TotalPages int `json:"total_pages"    validate:"required,min=0"`
	// HasMore indicates if there are more items available
	HasMore bool `json:"has_more"`
	// Next is the next page number or token, if applicable
	Next *string `json:"next,omitempty" validate:"min=1"`
}

// IrminAPIResponse is a "raw" response type where the `Data` is `json.RawMessage`.
// This lets us unmarshal it a second time into the type we actually want.
type IrminAPIResponse struct {
	Pagination *IrminAPIPaginationMetadata `json:"pagination,omitempty"`
	Metadata   map[string]string           `json:"metadata,omitempty"`
	Message    string                      `json:"message,omitempty"    validate:"max=1000"`
	Errors     []string                    `json:"errors,omitempty"     validate:"dive,min=1"`
	Data       any                         `json:"data,omitempty"`
}
