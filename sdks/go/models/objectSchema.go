package irminmodels

type ObjectSchema struct {
	Name         string     `json:"name"                    validate:"required,max=255"                                    example:"customers.json"`
	Path         string     `json:"path"                    validate:"required"                                            example:"/data/customers/customers.json"`
	Type         ObjectType `json:"type"                    validate:"required,oneof=group structured binary"              example:"structured"`
	LastModified *string    `json:"last_modified,omitempty"                                                                example:"2025-12-01T14:22:30Z"`
	Description  *string    `json:"description,omitempty"                                                                  example:"Customer data in JSON format with contact information"`
	// Structured schema
	Schema *JSONSchema `json:"schema,omitempty"        validate:"required_if=Type structured"`
	// Structured or Binary schema
	Size        *int    `json:"size,omitempty"          validate:"required_if=Type binary,required_if=Type structured" example:"1048576"`
	ContentType *string `json:"content_type,omitempty"  validate:"required_if=Type binary,required_if=Type structured" example:"application/json"`
	// Group schema
	Children     []ObjectSchema           `json:"children,omitempty"      validate:"dive,required_if=Type group"`
	Restrictions *GroupSchemaRestrictions `json:"restrictions,omitempty"` // Restrictions are not required, but are available for group schemas
}

// GroupSchemaRestrictions defines restrictions on group schemas.
type GroupSchemaRestrictions struct {
	NoStructured           *bool     `json:"no_structured,omitempty"            example:"false"`
	NoBinary               *bool     `json:"no_binary,omitempty"                example:"true"`
	NoGroups               *bool     `json:"no_groups,omitempty"                example:"false"`
	OnlyStructured         *bool     `json:"only_structured,omitempty"          example:"true"`
	OnlyBinary             *bool     `json:"only_binary,omitempty"              example:"false"`
	OnlyGroups             *bool     `json:"only_groups,omitempty"              example:"false"`
	AllowedContentTypes    *[]string `json:"allowed_content_types,omitempty"    example:"application/json,text/csv"`
	RestrictedContentTypes *[]string `json:"restricted_content_types,omitempty" example:"application/octet-stream,image/*"`
	MaxSize                *int      `json:"max_size,omitempty"                 example:"104857600"`
	MinSize                *int      `json:"min_size,omitempty"                 example:"1024"`
	MaxCount               *int      `json:"max_count,omitempty"                example:"1000"`
	MinCount               *int      `json:"min_count,omitempty"                example:"1"`
	NamePattern            *string   `json:"name_pattern,omitempty"             example:"*.json"`
}

// JSONSchema represents a JSON Schema for structured data.
type JSONSchema struct {
	Type                 string                `json:"type"                           validate:"required,oneof=object array string number integer boolean null" example:"object"` // e.g. "object", "array", etc.
	Properties           map[string]JSONSchema `json:"properties,omitempty"`                                                                                                      // Properties of the schema, formatted like {"name":{"type":"string"},"age":{"type":"integer"}}
	Required             []string              `json:"required,omitempty"             validate:"dive"                                                           example:"name,email"`
	Items                *JSONSchema           `json:"items,omitempty"`
	Description          *string               `json:"description,omitempty"                                                                                    example:"Customer information schema"`
	Default              any                   `json:"default,omitempty"`
	Enum                 []any                 `json:"enum,omitempty"                                                                                                                                 swaggertype:"array,string"`
	AdditionalProperties any                   `json:"additionalProperties,omitempty"                                                                                                                 swaggertype:"boolean"`
	Format               *string               `json:"format,omitempty"                                                                                         example:"email"`
	Minimum              *float64              `json:"minimum,omitempty"                                                                                        example:"0"`
	Maximum              *float64              `json:"maximum,omitempty"                                                                                        example:"100"`
	MinLength            *int                  `json:"minLength,omitempty"                                                                                      example:"1"`
	MaxLength            *int                  `json:"maxLength,omitempty"                                                                                      example:"255"`
	Pattern              *string               `json:"pattern,omitempty"                                                                                        example:"email-pattern"`
}
