package irminModels

import "time"

// JSONValue represents a JSON-compatible value.
type JSONValue any

// JSONObject represents a JSON-compatible object.
type JSONObject map[string]JSONValue

// JSONArray represents a JSON-compatible array.
type JSONArray []JSONValue

type StoredQuery struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	SQL         string    `json:"sql"`
	Owner       User      `json:"owner"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
