package irminmodels

// ObjectType represents the type of the object ("group", "structured", or "binary").
type ObjectType string

const (
	// ObjectTypeGroup is a folder object, which can contain other objects.
	ObjectTypeGroup ObjectType = "group"
	// ObjectTypeStructured is a tabular file, which can be parsed and queried (e.g. CSV, JSON, Parquet, etc.)
	ObjectTypeStructured ObjectType = "structured"
	// ObjectTypeBinary is a binary file, which can't be parsed or queried (e.g. image, video, audio, etc.)
	ObjectTypeBinary ObjectType = "binary"
)

type Object struct {
	ID                    string            `json:"id"                                validate:"required,validsqid=repository_objects"  example:"obj_3x7k9m2n5q8p"`
	Name                  string            `json:"name"                              validate:"omitempty,max=255"                      example:"customers.json"`                 // Empty name signifies root directory object
	Path                  string            `json:"path"                              validate:"omitempty,required_if=Name !=''"        example:"/data/customers/customers.json"` // Path required if Name is NOT empty
	RepositorySlug        string            `json:"repository_slug"                   validate:"required,max=100"                       example:"customer-analytics"`
	Ref                   string            `json:"ref"                               validate:"required,max=100"                       example:"main"`
	Type                  ObjectType        `json:"type"                              validate:"required,oneof=group structured binary" example:"structured"`
	ContentType           string            `json:"content_type,omitempty"            validate:"max=100,excluded_if=Type group"         example:"application/json"`
	PhysicalAddress       string            `json:"physical_address,omitempty"        validate:"omitempty,uri"                          example:"s3://bucket/path/to/customers.json"`
	PhysicalAddressExpiry *int64            `json:"physical_address_expiry,omitempty" validate:"omitempty,min=0"                        example:"1672531200"`
	SizeBytes             int64             `json:"size_bytes,omitempty"              validate:"omitempty,min=0"                        example:"1048576"`
	LastModified          string            `json:"last_modified,omitempty"                                                             example:"2025-12-01T14:22:30Z"`
	Metadata              map[string]string `json:"metadata,omitempty"`
	SQLSelectorExample    string            `json:"sql_selector_example,omitempty"` // Constructed SQL selector for the object, like $["workspace;repo;file.json@main"]
	Tags                  []Tag             `json:"tags,omitempty"                    validate:"dive,omitempty"`
	Children              []Object          `json:"children,omitempty"                validate:"dive,omitempty"`
}
