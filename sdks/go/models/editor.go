package irminModels

import "time"

type EditorItem struct {
	Name         string    `json:"name"`
	Path         string    `json:"path"`
	Type         string    `json:"type"` // file or folder
	Content      *string   `json:"content,omitempty"`
	LastModified time.Time `json:"last_modified"`
}
