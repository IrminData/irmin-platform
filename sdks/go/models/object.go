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
	ID                    string            `json:"id"                                validate:"required,validsqid=repository_objects"`
	Name                  string            `json:"name"                              validate:"omitempty,max=255"`               // Empty name signifies root directory object
	Path                  string            `json:"path"                              validate:"omitempty,required_if=Name !=''"` // Path required if Name is NOT empty
	RepositorySlug        string            `json:"repository_slug"                   validate:"required,max=100"`
	Ref                   string            `json:"ref"                               validate:"required,max=100"`
	Type                  ObjectType        `json:"type"                              validate:"required,oneof=group structured binary"`
	ContentType           string            `json:"content_type,omitempty"            validate:"max=100,excluded_if=Type group"`
	PhysicalAddress       string            `json:"physical_address,omitempty"        validate:"omitempty,uri"`
	PhysicalAddressExpiry *int64            `json:"physical_address_expiry,omitempty" validate:"omitempty,min=0"`
	SizeBytes             int64             `json:"size_bytes,omitempty"              validate:"omitempty,min=0"`
	LastModified          string            `json:"last_modified,omitempty"`
	Metadata              map[string]string `json:"metadata,omitempty"`
	Tags                  []Tag             `json:"tags,omitempty"                    validate:"dive,omitempty"`
	Children              []Object          `json:"children,omitempty"                validate:"dive,omitempty"`
}
