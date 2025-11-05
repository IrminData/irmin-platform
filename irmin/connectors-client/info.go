package connectorsclient

import (
	"context"
	"net/http"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// ConnectorInfo holds metadata about a connector returned from the connector's /info endpoint.
type ConnectorInfo struct {
	Name             string                            `json:"name"              example:"My Connector"`
	Description      string                            `json:"description"       example:"My Connector Description"`
	Version          string                            `json:"version"           example:"1.0.0"`
	StructureVersion string                            `json:"structure_version" example:"1.0.0"`
	Author           string                            `json:"author"            example:"John Doe"`
	APIBaseURL       string                            `json:"api_base_url"      example:"https://api.example.com"`
	LogoURL          string                            `json:"logo_url"          example:"https://example.com/logo.png"`
	Capabilities     []irminmodels.ConnectorCapability `json:"capabilities"      example:"pull,push"`
	Locales          []string                          `json:"locales"           example:"en,fr"`
	PrimaryCategory  irminmodels.ConnectorCategory     `json:"primary_category"  example:"database"`
	Categories       []irminmodels.ConnectorCategory   `json:"categories"        example:"database,api"`
	AuthorEmail      string                            `json:"author_email"      example:"john.doe@example.com"`
	Documentation    string                            `json:"documentation"     example:"https://example.com/documentation"`
	ReadMoreURL      string                            `json:"read_more_url"     example:"https://example.com/read-more"`
}

// GetInfo fetches the connector's information from the /info endpoint.
//
// Note: System token is required for this operation.
//
// Parameters:
// - ctx: Context for request cancellation and timeout control.
//
// Returns:
// - A pointer to ConnectorInfo if the request is successful.
// - An error if the API call fails or the response cannot be unmarshalled.
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
