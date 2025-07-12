package irminmodels

import "time"

type EditorItemType string

const (
	EditorItemTypeFile   EditorItemType = "file"
	EditorItemTypeFolder EditorItemType = "folder"
)

type EditorItem struct {
	Name         string         `json:"name"               validate:"required,max=255"`
	Path         string         `json:"path"               validate:"required"`
	Type         EditorItemType `json:"type"               validate:"required,oneof=file folder"`
	Content      *string        `json:"content,omitempty"`
	Language     *string        `json:"language,omitempty" validate:"required_if=Type file"` // js, py, go, etc.
	Children     []EditorItem   `json:"children,omitempty" validate:"dive,excluded_if=Type file"`
	LastModified time.Time      `json:"last_modified"      validate:"required"`
}

type ScriptResult struct {
	StructuredResults map[string][]map[string]any `json:"structured_results,omitempty"` // Parsed resulting structured files
	HasErrors         bool                        `json:"has_errors,omitempty"`
	Duration          time.Duration               `json:"duration,omitempty"`
	StartedAt         time.Time                   `json:"started_at,omitempty"`
	FinishedAt        time.Time                   `json:"finished_at,omitempty"`
	Logs              []string                    `json:"logs,omitempty"               validate:"dive"`
}
