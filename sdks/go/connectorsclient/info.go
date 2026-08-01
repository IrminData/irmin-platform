package connectorsclient

import (
	"context"
	"net/http"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

// ConnectorInfo holds metadata about a connector returned from the
// connector's /info endpoint. Requires a system token.
type ConnectorInfo struct {
	Name             string                            `json:"name"              example:"My Connector"`
	Description      string                            `json:"description"       example:"My Connector Description"`
	Version          string                            `json:"version"           example:"1.0.0"`
	StructureVersion string                            `json:"structure_version" example:"1.0.0"`
	Author           string                            `json:"author"            example:"John Doe"`
	APIBaseURL       string                            `json:"api_base_url"      example:"https://api.example.com"`
	LogoURL          string                            `json:"logo_url"          example:"https://example.com/logo.png"`
	Capabilities     []irminmodels.ConnectorCapability `json:"capabilities"      example:"pull,push"`
	PrimaryCategory  irminmodels.ConnectorCategory     `json:"primary_category"  example:"database"`
	Categories       []irminmodels.ConnectorCategory   `json:"categories"        example:"database,api"`
	AuthorEmail      string                            `json:"author_email"      example:"john.doe@example.com"`
	Documentation    string                            `json:"documentation"     example:"https://example.com/documentation"`
	ReadMoreURL      string                            `json:"read_more_url"     example:"https://example.com/read-more"`

	// ConnectionOAuthConfig is optional. When present, the connector
	// declares it uses OAuth 2.0 (authorization code + PKCE) for
	// authenticating a Connection, and Core runs the flow on the
	// user's behalf. Nil/absent means the connector uses the legacy
	// DynamicField form path (password / API key / etc.).
	ConnectionOAuthConfig *irminmodels.ConnectionOAuthConfig `json:"connection_oauth_config,omitempty"`
}

// GetInfo fetches the connector's metadata from GET /info.
//
// Requires a system token on the Client.
func (c *Client) GetInfo(ctx context.Context) (*ConnectorInfo, error) {
	var info ConnectorInfo
	if err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: "/info",
	}, &info); err != nil {
		return nil, err
	}
	return &info, nil
}
