package irminmodels

// Tag represents a workspace tag object for labeling entities.
type Tag struct {
	// ID is the unique sqid for the tag
	ID string `json:"id"`
	// Name is the name of the tag
	Name string `json:"name"`
	// Color is the hex color code for the tag
	Color string `json:"color"`
	// Description is the description of the tag, used for tagging entities
	Description string `json:"description"`
}

// TagWithAssets represents a tag along with all its associated assets and counts.
type TagWithAssets struct {
	Tag    Tag            `json:"tag"`
	Assets TaggedAssets   `json:"assets"`
	Counts map[string]int `json:"counts"`
}

// TaggedAssets represents all assets associated with a specific tag.
type TaggedAssets struct {
	Queries           []StoredQuery `json:"queries"`
	Repositories      []Repository  `json:"repositories"`
	Workflows         []Workflow    `json:"workflows"`
	Connections       []Connection  `json:"connections"`
	RepositoryObjects []Object      `json:"repository_objects"`
}
