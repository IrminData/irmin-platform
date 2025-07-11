package models

import irminmodels "github.com/IrminData/irmin-sdk-go/models"

type ConnectorDetails struct {
	Name             string                            `json:"name"`
	Description      string                            `json:"description"`
	Version          string                            `json:"version"`
	StructureVersion string                            `json:"structure_version"`
	Author           string                            `json:"author"`
	APIBaseURL       string                            `json:"api_base_url"`
	LogoURL          string                            `json:"logo_url"`
	Capabilities     []irminmodels.ConnectorCapability `json:"capabilities"`
	Locales          []string                          `json:"locales"`
	PrimaryCategory  irminmodels.ConnectorCategory     `json:"primary_category"`
	Categories       []irminmodels.ConnectorCategory   `json:"categories"`
	AuthorEmail      string                            `json:"author_email"`
	ReadMoreURL      string                            `json:"read_more_url"`
}
