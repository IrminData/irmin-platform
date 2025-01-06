package models

// ObjectSchema represents the schema of an object.
type ObjectSchema struct {
	Name         string                      `json:"name"`
	Path         string                      `json:"path"`
	LastModified *string                     `json:"last_modified,omitempty"`
	Description  *string                     `json:"description,omitempty"`
	Type         string                      `json:"type"` // "structured", "binary", or "group"
	Structured   *SchemaObjectStructuredItem `json:"structured,omitempty"`
	Binary       *SchemaObjectBinaryItem     `json:"binary,omitempty"`
	Group        *SchemaObjectGroup          `json:"group,omitempty"`
}

// SchemaObjectStructuredItem defines properties for structured items.
type SchemaObjectStructuredItem struct {
	Type        string     `json:"type"` // "structured"
	Schema      JSONSchema `json:"schema"`
	Size        *int       `json:"size,omitempty"`
	ContentType *string    `json:"content_type,omitempty"`
}

// SchemaObjectBinaryItem defines properties for binary items.
type SchemaObjectBinaryItem struct {
	Type        string  `json:"type"` // "binary"
	Size        *int    `json:"size,omitempty"`
	ContentType *string `json:"content_type,omitempty"`
}

// SchemaObjectGroup defines properties for groups of objects.
type SchemaObjectGroup struct {
	Type         string                   `json:"type"` // "group"
	Children     []ObjectSchema           `json:"children"`
	Restrictions *GroupSchemaRestrictions `json:"restrictions,omitempty"`
}

// GroupSchemaRestrictions defines restrictions on group schemas.
type GroupSchemaRestrictions struct {
	NoStructured           *bool     `json:"no_structured,omitempty"`
	NoBinary               *bool     `json:"no_binary,omitempty"`
	NoGroups               *bool     `json:"no_groups,omitempty"`
	OnlyStructured         *bool     `json:"only_structured,omitempty"`
	OnlyBinary             *bool     `json:"only_binary,omitempty"`
	OnlyGroups             *bool     `json:"only_groups,omitempty"`
	AllowedContentTypes    *[]string `json:"allowed_content_types,omitempty"`
	RestrictedContentTypes *[]string `json:"restricted_content_types,omitempty"`
	MaxSize                *int      `json:"max_size,omitempty"`
	MinSize                *int      `json:"min_size,omitempty"`
	MaxCount               *int      `json:"max_count,omitempty"`
	MinCount               *int      `json:"min_count,omitempty"`
	NamePattern            *string   `json:"name_pattern,omitempty"`
}

// JSONSchema represents a JSON Schema for structured data.
type JSONSchema struct {
	Type                 string                `json:"type"` // "object", "array", "string", "number", "boolean", "null"
	Properties           map[string]JSONSchema `json:"properties,omitempty"`
	Required             []string              `json:"required,omitempty"`
	Items                *JSONSchema           `json:"items,omitempty"`
	Description          *string               `json:"description,omitempty"`
	Default              interface{}           `json:"default,omitempty"`
	Enum                 []interface{}         `json:"enum,omitempty"`
	AdditionalProperties interface{}           `json:"additionalProperties,omitempty"`
	Format               *string               `json:"format,omitempty"`
	Minimum              *float64              `json:"minimum,omitempty"`
	Maximum              *float64              `json:"maximum,omitempty"`
	MinLength            *int                  `json:"minLength,omitempty"`
	MaxLength            *int                  `json:"maxLength,omitempty"`
	Pattern              *string               `json:"pattern,omitempty"`
}
