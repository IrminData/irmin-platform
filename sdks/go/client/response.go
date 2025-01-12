package client

import "encoding/json"

// IrminAPIPaginationMetadata represents the pagination metadata from the Irmin Core API
type IrminAPIPaginationMetadata struct {
	Total        int    `json:"total"`
	PerPage      int    `json:"per_page"`
	CurrentPage  int    `json:"current_page"`
	LastPage     int    `json:"last_page"`
	FirstPageURL string `json:"first_page_url"`
	LastPageURL  string `json:"last_page_url"`
	NextPageURL  string `json:"next_page_url"`
	PrevPageURL  string `json:"prev_page_url"`
}

// IrminAPIResponse is a “raw” response type where the `Data` is `json.RawMessage`.
// This lets us unmarshal it a second time into the type we actually want.
type IrminAPIResponse struct {
	Metadata *interface{}    `json:"metadata,omitempty"`
	Message  *string         `json:"message,omitempty"`
	Errors   []string        `json:"errors,omitempty"`
	Data     json.RawMessage `json:"data,omitempty"`
}
