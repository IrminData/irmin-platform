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
