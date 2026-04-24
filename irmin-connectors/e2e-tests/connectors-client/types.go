package connectorsclient

import (
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// ConnectorInfo holds metadata about a connector returned from the connector's /info endpoint.
type ConnectorInfo struct {
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
	Documentation    string                            `json:"documentation"`
	ReadMoreURL      string                            `json:"read_more_url"`
}

// Subscription represents a record of an active subscription to changes in data.
type Subscription struct {
	ID                      uint    `json:"ID"`
	CreatedAt               string  `json:"CreatedAt"`
	UpdatedAt               string  `json:"UpdatedAt"`
	DeletedAt               *string `json:"DeletedAt,omitempty"`
	WebhookURL              string  `json:"webhookUrl"`
	WebhookAccessToken      string  `json:"webhookAccessToken"`
	ConnectorRegistrationID uint    `json:"connectorRegistrationID"`
	OperationID             uint    `json:"operationID"`
}

// Operation represents a record of an initiated operation tied to a connector.
type Operation struct {
	ID                      uint              `json:"ID"`
	CreatedAt               string            `json:"CreatedAt"`
	UpdatedAt               string            `json:"UpdatedAt"`
	DeletedAt               *string           `json:"DeletedAt,omitempty"`
	Details                 map[string]string `json:"details"`
	Settings                map[string]string `json:"settings"`
	Token                   string            `json:"token"`
	ConfigHash              string            `json:"configHash"`
	ConnectorRegistrationID uint              `json:"connectorRegistrationID"`
}
