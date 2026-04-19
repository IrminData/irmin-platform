package models

import irminmodels "github.com/IrminData/irmin-sdk-go/models"

type ConnectorDetails struct {
	Name             string                            `json:"name"              example:"MySQL Database Connector"`
	Description      string                            `json:"description"       example:"Connect to MySQL databases for data extraction and synchronization"`
	Version          string                            `json:"version"           example:"1.2.3"`
	StructureVersion string                            `json:"structure_version" example:"1.0.0"`
	Author           string                            `json:"author"            example:"Irmin Team"`
	APIBaseURL       string                            `json:"api_base_url"      example:"https://connectors.irmin.co/mysql"`
	LogoURL          string                            `json:"logo_url"          example:"https://cdn.irmin.co/connectors/mysql.png"`
	Capabilities     []irminmodels.ConnectorCapability `json:"capabilities"      example:"pull,push"                                                                                                                                  enums:"pull,push,apply_patch,patch_event"`
	Locales          []string                          `json:"locales"           example:"en,fi"`
	PrimaryCategory  irminmodels.ConnectorCategory     `json:"primary_category"  example:"database"`
	Categories       []irminmodels.ConnectorCategory   `json:"categories"        example:"database,crm,erp,warehouse,marketing,analytics,storage,messaging,payment,social,calendar,project_management,ecommerce,iot,monitoring,other"`
	AuthorEmail      string                            `json:"author_email"      example:"hello@irmin.co"`
	ReadMoreURL      string                            `json:"read_more_url"     example:"https://docs.irmin.co/connectors/mysql"`

	// ConnectionOAuthConfig is optional. When set, the connector declares
	// it uses OAuth 2.0 (authorization code + PKCE) for authenticating a
	// Connection, and Irmin Core runs the flow on the user's behalf. Nil
	// means the connector uses the legacy DynamicField form path
	// (password / API key / etc.). See OAUTH-CONNECTORS.md for the flow
	// + patterns + which vendors are planned.
	ConnectionOAuthConfig *irminmodels.ConnectionOAuthConfig `json:"connection_oauth_config,omitempty"`
}
