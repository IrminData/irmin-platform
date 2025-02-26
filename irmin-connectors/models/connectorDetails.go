package models

type ConnectorDetails struct {
	Name             string   `json:"name"`
	Description      string   `json:"description"`
	Version          string   `json:"version"`
	StructureVersion string   `json:"structure_version"`
	Author           string   `json:"author"`
	APIBaseURL       string   `json:"api_base_url"`
	LogoURL          string   `json:"logo_url"`
	Capabilities     []string `json:"capabilities"`
	Locales          []string `json:"locales"`
	PrimaryCategory  string   `json:"primary_category"`
	Categories       []string `json:"categories"`
	AuthorEmail      string   `json:"author_email"`
	Documentation    string   `json:"documentation"`
	ReadMoreURL      string   `json:"read_more_url"`
}
