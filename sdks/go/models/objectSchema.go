package irminModels

type ObjectSchema struct {
	Name         string     `json:"name"`
	Path         string     `json:"path"`
	Type         ObjectType `json:"type"`
	LastModified *string    `json:"last_modified,omitempty"`
	Description  *string    `json:"description,omitempty"`
	// Structured schema
	Schema *JSONSchema `json:"schema,omitempty"`
	// Structured or Binary schema
	Size        *int    `json:"size,omitempty"`
	ContentType *string `json:"content_type,omitempty"`
	// Group schema
	Children     []ObjectSchema           `json:"children,omitempty"`
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
	Type                 string                `json:"type"` // e.g. "object", "array", etc.
	Properties           map[string]JSONSchema `json:"properties,omitempty"`
	Required             []string              `json:"required,omitempty"`
	Items                *JSONSchema           `json:"items,omitempty"`
	Description          *string               `json:"description,omitempty"`
	Default              any                   `json:"default,omitempty"`
	Enum                 []any                 `json:"enum,omitempty"`
	AdditionalProperties any                   `json:"additionalProperties,omitempty"`
	Format               *string               `json:"format,omitempty"`
	Minimum              *float64              `json:"minimum,omitempty"`
	Maximum              *float64              `json:"maximum,omitempty"`
	MinLength            *int                  `json:"minLength,omitempty"`
	MaxLength            *int                  `json:"maxLength,omitempty"`
	Pattern              *string               `json:"pattern,omitempty"`
}
