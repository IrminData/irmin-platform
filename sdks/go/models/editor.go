package irminModels

import "time"

type EditorItem struct {
	Name         string       `json:"name"`
	Path         string       `json:"path"`
	Type         string       `json:"type"` // file or folder
	Content      *string      `json:"content,omitempty"`
	Language     *string      `json:"language,omitempty"` // js, py, go, etc.
	Children     []EditorItem `json:"children,omitempty"` // for folders
	LastModified time.Time    `json:"last_modified"`
}

type ScriptResult struct {
	Columns    []string         `json:"columns,omitempty"`
	Data       []map[string]any `json:"data,omitempty"`
	HasErrors  bool             `json:"has_errors,omitempty"`
	Duration   time.Duration    `json:"duration,omitempty"`
	StartedAt  time.Time        `json:"started_at,omitempty"`
	FinishedAt time.Time        `json:"finished_at,omitempty"`
	Logs       []string         `json:"logs,omitempty"`
}
