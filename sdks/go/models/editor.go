package irminmodels

import "time"

type EditorItemType string

const (
	EditorItemTypeFile   EditorItemType = "file"
	EditorItemTypeFolder EditorItemType = "folder"
)

type EditorItem struct {
	Name         string         `json:"name"               validate:"required,max=255"           example:"file.txt"`
	Path         string         `json:"path"               validate:"required"                   example:"/path/to/file.txt"`
	Type         EditorItemType `json:"type"               validate:"required,oneof=file folder" example:"file"`
	Content      *string        `json:"content,omitempty"                                        example:"This is the content of the file"`
	Language     *string        `json:"language,omitempty" validate:"required_if=Type file"      example:"js"` // js, py, go, etc.
	Children     []EditorItem   `json:"children,omitempty" validate:"dive,excluded_if=Type file"`
	LastModified time.Time      `json:"last_modified"      validate:"required"                   example:"2025-01-15T10:30:00Z"`
}

type ScriptResult struct {
	StructuredResults map[string][]map[string]any `json:"structured_results,omitempty"`                 // Parsed resulting structured files, formatted like {"customers.json":[{"name":"John","age":30}]}
	HasErrors         bool                        `json:"has_errors,omitempty"         example:"false"` // Whether the script execution encountered errors
	Duration          time.Duration               `json:"duration,omitempty"           example:"1000"`  // Time between two instants as an int64 nanosecond count
	StartedAt         time.Time                   `json:"started_at,omitempty"         example:"2025-01-15T10:30:00Z"`
	FinishedAt        time.Time                   `json:"finished_at,omitempty"        example:"2025-01-15T10:30:00Z"`
	Logs              []string                    `json:"logs,omitempty"               example:"Execution started,Execution completed" validate:"dive"`
}
