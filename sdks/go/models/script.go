package irminmodels

import "time"

type StoredScript struct {
	ID          string    `json:"id"                    validate:"required,validsqid=scripts" example:"scr_8x2m9k4n7p5q"`
	Name        string    `json:"name"                  validate:"required,max=255"           example:"script.py"`
	Description *string   `json:"description,omitempty" validate:"max=500"                    example:"Data processor for the project"`
	Content     *string   `json:"content,omitempty"                                           example:"This is the content of the file"`
	Language    *string   `json:"language,omitempty"                                          example:"js"` // js, py, go, etc.
	Owner       User      `json:"owner"                 validate:"required"`
	Tags        []Tag     `json:"tags,omitempty"        validate:"dive"`
	CreatedAt   time.Time `json:"created_at"            validate:"required"                   example:"2025-01-15T10:30:00Z"`
	UpdatedAt   time.Time `json:"updated_at"            validate:"required"                   example:"2025-12-01T14:22:30Z"`
}

type ScriptResult struct {
	StructuredResults map[string][]map[string]any `json:"structured_results,omitempty"`                 // Parsed resulting structured files, formatted like {"customers.json":[{"name":"John","age":30}]}
	HasErrors         bool                        `json:"has_errors,omitempty"         example:"false"` // Whether the script execution encountered errors
	Duration          time.Duration               `json:"duration,omitempty"           example:"1000"`  // Time between two instants as an int64 nanosecond count
	StartedAt         time.Time                   `json:"started_at,omitempty"         example:"2025-01-15T10:30:00Z"`
	FinishedAt        time.Time                   `json:"finished_at,omitempty"        example:"2025-01-15T10:30:00Z"`
	Logs              []string                    `json:"logs,omitempty"               example:"Execution started,Execution completed" validate:"dive"`
}
