package irminmodels

import "time"

type StoredQuery struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	SQL         string    `json:"sql"`
	Owner       User      `json:"owner"`
	Tags        []Tag     `json:"tags,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type QueryResult struct {
	Columns    []string         `json:"columns,omitempty"`
	Data       []map[string]any `json:"data,omitempty"`
	HasErrors  bool             `json:"has_errors,omitempty"`
	Duration   time.Duration    `json:"duration,omitempty"`
	StartedAt  time.Time        `json:"started_at,omitempty"`
	FinishedAt time.Time        `json:"finished_at,omitempty"`
	Logs       []string         `json:"logs,omitempty"`
}
