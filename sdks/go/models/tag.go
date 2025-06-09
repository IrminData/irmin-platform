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
