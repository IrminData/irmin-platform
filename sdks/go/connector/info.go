package irminConnectorClient

import (
	"net/http"
)

// ConnectorInfo holds metadata about a connector returned from the connector's /info endpoint.
type ConnectorInfo struct {
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

// GetInfo fetches the connector's information from the /info endpoint.
//
// Note: System token is required for this operation.
//
// Returns:
// - A pointer to ConnectorInfo if the request is successful.
// - An error if the API call fails or the response cannot be unmarshalled.
func (c *Client) GetInfo() (*ConnectorInfo, error) {
	var info ConnectorInfo
	if err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: "/info",
	}, &info); err != nil {
		return nil, err
	}
	return &info, nil
}
