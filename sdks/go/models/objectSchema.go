package irminmodels

type ObjectSchema struct {
	Name         string     `json:"name"                    validate:"required,max=255"`
	Path         string     `json:"path"                    validate:"required"`
	Type         ObjectType `json:"type"                    validate:"required,oneof=group structured binary"`
	LastModified *string    `json:"last_modified,omitempty" validate:"datetime"`
	Description  *string    `json:"description,omitempty"   validate:"max=500"`
	// Structured schema
	Schema *JSONSchema `json:"schema,omitempty"        validate:"required_if=Type structured"`
	// Structured or Binary schema
	Size        *int    `json:"size,omitempty"          validate:"gte=0,required_if=Type binary,required_if=Type structured"`
	ContentType *string `json:"content_type,omitempty"  validate:"max=100,required_if=Type binary,required_if=Type structured"`
	// Group schema
	Children     []ObjectSchema           `json:"children,omitempty"      validate:"dive,required_if=Type group"`
	Restrictions *GroupSchemaRestrictions `json:"restrictions,omitempty"  validate:"required_if=Type group"`
}

// GroupSchemaRestrictions defines restrictions on group schemas.
type GroupSchemaRestrictions struct {
	NoStructured           *bool     `json:"no_structured,omitempty"`
	NoBinary               *bool     `json:"no_binary,omitempty"`
	NoGroups               *bool     `json:"no_groups,omitempty"`
	OnlyStructured         *bool     `json:"only_structured,omitempty"`
	OnlyBinary             *bool     `json:"only_binary,omitempty"`
	OnlyGroups             *bool     `json:"only_groups,omitempty"`
	AllowedContentTypes    *[]string `json:"allowed_content_types,omitempty"    validate:"dive"`
	RestrictedContentTypes *[]string `json:"restricted_content_types,omitempty" validate:"dive"`
	MaxSize                *int      `json:"max_size,omitempty"                 validate:"gte=0"`
	MinSize                *int      `json:"min_size,omitempty"                 validate:"gte=0"`
	MaxCount               *int      `json:"max_count,omitempty"                validate:"gte=0"`
	MinCount               *int      `json:"min_count,omitempty"                validate:"gte=0"`
	NamePattern            *string   `json:"name_pattern,omitempty"             validate:"min=1"`
}

// JSONSchema represents a JSON Schema for structured data.
type JSONSchema struct {
	Type                 string                `json:"type"                           validate:"required,oneof=object array string number integer boolean null"` // e.g. "object", "array", etc.
	Properties           map[string]JSONSchema `json:"properties,omitempty"`
	Required             []string              `json:"required,omitempty"             validate:"dive"`
	Items                *JSONSchema           `json:"items,omitempty"`
	Description          *string               `json:"description,omitempty"          validate:"max=500"`
	Default              any                   `json:"default,omitempty"`
	Enum                 []any                 `json:"enum,omitempty"`
	AdditionalProperties any                   `json:"additionalProperties,omitempty"`
	Format               *string               `json:"format,omitempty"               validate:"min=1"`
	Minimum              *float64              `json:"minimum,omitempty"`
	Maximum              *float64              `json:"maximum,omitempty"`
	MinLength            *int                  `json:"minLength,omitempty"            validate:"gte=0"`
	MaxLength            *int                  `json:"maxLength,omitempty"            validate:"gte=0"`
	Pattern              *string               `json:"pattern,omitempty"              validate:"min=1"`
}
