package irminmodels

import "time"

type StoredQuery struct {
	ID          string    `json:"id"             validate:"required,validsqid=queries"`
	Name        string    `json:"name"           validate:"required,min=1,max=100"`
	Description string    `json:"description"    validate:"max=500"`
	SQL         string    `json:"sql"            validate:"required"`
	Owner       User      `json:"owner"          validate:"required"`
	Tags        []Tag     `json:"tags,omitempty" validate:"dive"`
	CreatedAt   time.Time `json:"created_at"     validate:"required"`
	UpdatedAt   time.Time `json:"updated_at"     validate:"required"`
}

type QueryResult struct {
	Columns    []string         `json:"columns,omitempty"     validate:"dive,min=1"`
	Data       []map[string]any `json:"data,omitempty"`
	HasErrors  bool             `json:"has_errors,omitempty"`
	Duration   time.Duration    `json:"duration,omitempty"    validate:"min=0"`
	StartedAt  time.Time        `json:"started_at,omitempty"`
	FinishedAt time.Time        `json:"finished_at,omitempty"`
	Logs       []string         `json:"logs,omitempty"        validate:"dive"`
}
