package irminmodels

import "time"

type EditorItemType string

const (
	EditorItemTypeFile   EditorItemType = "file"
	EditorItemTypeFolder EditorItemType = "folder"
)

type EditorItem struct {
	Name         string         `json:"name"`
	Path         string         `json:"path"`
	Type         EditorItemType `json:"type"`
	Content      *string        `json:"content,omitempty"`
	Language     *string        `json:"language,omitempty"` // js, py, go, etc.
	Children     []EditorItem   `json:"children,omitempty"` // for folders
	LastModified time.Time      `json:"last_modified"`
}

type ScriptResult struct {
	StructuredResults map[string][]map[string]any `json:"structured_results,omitempty"` // Parsed resulting structured files
	HasErrors         bool                        `json:"has_errors,omitempty"`
	Duration          time.Duration               `json:"duration,omitempty"`
	StartedAt         time.Time                   `json:"started_at,omitempty"`
	FinishedAt        time.Time                   `json:"finished_at,omitempty"`
	Logs              []string                    `json:"logs,omitempty"`
}
