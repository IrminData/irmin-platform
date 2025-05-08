package irminmodels

// IrminAPIPaginationMetadata represents the pagination metadata from the Irmin Core API.
type IrminAPIPaginationMetadata struct {
	// Total is the total number of items available
	Total int `json:"total"`
	// Current page number
	Page *int `json:"page,omitempty"`
	// Number of items per page
	PerPage int `json:"per_page"`
	// Total number of pages available
	TotalPages int `json:"total_pages"`
	// HasMore indicates if there are more items available
	HasMore bool `json:"has_more"`
	// Next is the next page number or token, if applicable
	Next *string `json:"next,omitempty"`
}

// IrminAPIResponse is a “raw” response type where the `Data` is `json.RawMessage`.
// This lets us unmarshal it a second time into the type we actually want.
type IrminAPIResponse struct {
	Pagination *IrminAPIPaginationMetadata `json:"pagination,omitempty"`
	Metadata   map[string]string           `json:"metadata,omitempty"`
	Message    string                      `json:"message,omitempty"`
	Errors     []string                    `json:"errors,omitempty"`
	Data       any                         `json:"data,omitempty"`
}
