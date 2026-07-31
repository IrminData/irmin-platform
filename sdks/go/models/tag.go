package irminmodels

// Tag represents a workspace tag object for labeling entities.
type Tag struct {
	// ID is the unique sqid for the tag
	ID string `json:"id"          validate:"required,validsqid=tags" example:"tag_7k3m9x2n5q8p"`
	// Name is the name of the tag
	Name string `json:"name"        validate:"required,validslug"      example:"production"`
	// Color is the hex color code for the tag
	Color string `json:"color"       validate:"required,iscolor"        example:"#ff5722"`
	// Description is the description of the tag, used for tagging entities
	Description string `json:"description" validate:"max=200"                 example:"Production environment resources"`
}

// TagWithAssets represents a tag along with all its associated assets and counts.
type TagWithAssets struct {
	Tag    Tag            `json:"tag"    validate:"required"`
	Assets TaggedAssets   `json:"assets" validate:"required"`
	Counts map[string]int `json:"counts" validate:"required"` // Counts of assets associated with the tag, formatted like {"repositories":5,"queries":12,"workflows":3}
}

// TaggedAssets represents all assets associated with a specific tag.
type TaggedAssets struct {
	Queries           []StoredQuery  `json:"queries"            validate:"dive"`
	Scripts           []StoredScript `json:"scripts"            validate:"dive"`
	Repositories      []Repository   `json:"repositories"       validate:"dive"`
	Workflows         []Workflow     `json:"workflows"          validate:"dive"`
	Connections       []Connection   `json:"connections"        validate:"dive"`
	RepositoryObjects []Object       `json:"repository_objects" validate:"dive"`
}

type TagEntityType string

const (
	TagEntityTypeRepository TagEntityType = "repositories"
	TagEntityTypeQuery      TagEntityType = "queries"
	TagEntityTypeScript     TagEntityType = "scripts"
	TagEntityTypeWorkflow   TagEntityType = "workflows"
	TagEntityTypeConnection TagEntityType = "connections"
	TagEntityTypeObject     TagEntityType = "repository_objects"
)
