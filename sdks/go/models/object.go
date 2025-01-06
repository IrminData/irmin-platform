package models

// ObjectType represents the type of the object ("group", "structured", or "binary").
type ObjectType string

const (
	// ObjectTypeGroup indicates the object is a group.
	ObjectTypeGroup ObjectType = "group"
	// ObjectTypeStructured indicates the object is structured.
	ObjectTypeStructured ObjectType = "structured"
	// ObjectTypeBinary indicates the object is binary.
	ObjectTypeBinary ObjectType = "binary"
)

// Object represents an object in a repository.
type Object struct {
	// Name of the object
	Name string `json:"name"`
	// Path of the object
	Path string `json:"path"`
	// MIME type of the object's content, e.g., application/json, text/csv, or application/vnd.apache.parquet.
	ContentType *string `json:"content_type,omitempty"`
	// Type of the object ("group", "structured", or "binary")
	Type ObjectType `json:"type"`
	// Last modified timestamp
	LastModified *string `json:"last_modified,omitempty"`
}
