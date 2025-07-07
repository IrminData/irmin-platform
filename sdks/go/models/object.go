package irminmodels

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

type Object struct {
	ID                    string            `json:"id"                                validate:"required,validsqid=repository_objects"`
	Name                  string            `json:"name"                              validate:"required,min=1,max=255"`
	Path                  string            `json:"path"                              validate:"required,min=1"`
	RepositorySlug        string            `json:"repository_slug"                   validate:"required,min=1,max=100"` // The slug of the repository that contains the object.
	Ref                   string            `json:"ref"                               validate:"required,min=1,max=100"` // The branch or other reference that contains the object.
	Type                  ObjectType        `json:"type"                              validate:"required,oneof=group structured binary"`
	ContentType           string            `json:"content_type,omitempty"            validate:"min=1,max=100"` // The MIME type of the object content, like "application/json" or "text/plain".
	PhysicalAddress       string            `json:"physical_address,omitempty"        validate:"uri"`           // The location of the object on the underlying object store. Formatted as a native URI with the object store type as scheme ("s3://...", "gs://...", etc.) Or, in the case of presign=true, will be an HTTP URL to be consumed via regular HTTP GET
	PhysicalAddressExpiry *int64            `json:"physical_address_expiry,omitempty" validate:"min=0"`         // If present and nonzero, physical_address is a pre-signed URL and will expire at this Unix Epoch time. This will be shorter than the pre-signed URL lifetime if an authentication token is about to expire.
	SizeBytes             int64             `json:"size_bytes,omitempty"              validate:"min=0"`         // The number of bytes in the object.
	LastModified          string            `json:"last_modified,omitempty"`                                    // The last modified time of the object in RFC3339 format.
	Metadata              map[string]string `json:"metadata,omitempty"`                                         // Key-value pairs of metadata about the object.
	Tags                  []Tag             `json:"tags,omitempty"                    validate:"dive"`          // Tags associated with this object.
	Children              []Object          `json:"children,omitempty"                validate:"dive"`          // If the object is a group, this will contain the children objects.
}
