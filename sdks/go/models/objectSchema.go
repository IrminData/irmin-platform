package irminmodels

type ObjectSchema struct {
	Name               string     `json:"name"                           validate:"max=255"                                             example:"customers.json"`
	Path               string     `json:"path"                                                                                          example:"/data/customers/customers.json"`
	Type               ObjectType `json:"type"                           validate:"required,oneof=group structured binary"              example:"structured"`
	LastModified       *string    `json:"last_modified,omitempty"                                                                       example:"2025-12-01T14:22:30Z"`
	Description        *string    `json:"description,omitempty"                                                                         example:"Customer data in JSON format with contact information"`
	SQLSelectorExample *string    `json:"sql_selector_example,omitempty"                                                                example:"$['workspace;repo;file.json@main']"`
	// Structured schema
	Schema *JSONSchema `json:"schema,omitempty"               validate:"required_if=Type structured"`
	// Structured or Binary schema
	Size        *int    `json:"size,omitempty"                                                                                example:"1048576"`
	ContentType *string `json:"content_type,omitempty"         validate:"required_if=Type binary,required_if=Type structured" example:"application/json"`
	// Group schema
	Children     []ObjectSchema           `json:"children,omitempty"             validate:"dive,required_if=Type group"`
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
	Type                 string                `json:"type"                             validate:"required,oneof=object array string number integer boolean null" example:"object"` // e.g. "object", "array", etc.
	Properties           map[string]JSONSchema `json:"properties,omitempty"`                                                                                                        // Properties of the schema, formatted like {"name":{"type":"string"},"age":{"type":"integer"}}
	Required             []string              `json:"required,omitempty"               validate:"dive"                                                           example:"name,email"`
	Items                *JSONSchema           `json:"items,omitempty"`
	Description          *string               `json:"description,omitempty"                                                                                      example:"Customer information schema"`
	Default              any                   `json:"default,omitempty"`
	Enum                 []any                 `json:"enum,omitempty"                                                                                                                                   swaggertype:"array,string"`
	AdditionalProperties any                   `json:"additionalProperties,omitempty"                                                                                                                   swaggertype:"boolean"`
	Format               *string               `json:"format,omitempty"                                                                                           example:"email"`
	Minimum              *float64              `json:"minimum,omitempty"                                                                                          example:"0"`
	Maximum              *float64              `json:"maximum,omitempty"                                                                                          example:"100"`
	MinLength            *int                  `json:"minLength,omitempty"                                                                                        example:"1"`
	MaxLength            *int                  `json:"maxLength,omitempty"                                                                                        example:"255"`
	Pattern              *string               `json:"pattern,omitempty"                                                                                          example:"email-pattern"`
	ContentEncoding      *string               `json:"contentEncoding,omitempty"                                                                                  example:"base64"`
	ContentMediaType     *string               `json:"contentMediaType,omitempty"                                                                                 example:"application/octet-stream"`
	MinItems             *int                  `json:"minItems,omitempty"                                                                                         example:"1"`
	MaxItems             *int                  `json:"maxItems,omitempty"                                                                                         example:"100"`
	// Extension fields for metadata and traceability
	XOriginalDuckDBType *string            `json:"x-original-duckdb-type,omitempty"                                                                           example:"DECIMAL(10,2)"`
	XDecimalPrecision   *int               `json:"x-decimal-precision,omitempty"                                                                              example:"10"`
	XDecimalScale       *int               `json:"x-decimal-scale,omitempty"                                                                                  example:"2"`
	XDuckDBType         *string            `json:"x-duckdb-type,omitempty"                                                                                    example:"INTERVAL"`
	XIrmin              *map[string]string `json:"x-irmin,omitempty"`
	XIrminSchemaVersion *string            `json:"x-irmin-schema-version,omitempty"                                                                           example:"1.0.0"`
	XInferredBy         *string            `json:"x-inferred-by,omitempty"                                                                                    example:"duckdb-information_schema"`
	XUnmappedTypes      *[]string          `json:"x-unmapped-types,omitempty"                                                                                 example:"CUSTOM_TYPE,UNKNOWN_TYPE"`
}
