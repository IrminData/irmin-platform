package db

import (
	"gorm.io/gorm"
)

type Connector struct {
	gorm.Model

	// Base URL for the connector's REST API
	APIBaseURL string `json:"api_base_url"`
	// Token to authenticate system requests to the Connector's API
	SystemToken string `json:"system_token"`
	// Name of the connector
	Name string `json:"name"`
	// Short description of the connector
	Description string `json:"description"`
	// Current version of the connector
	Version string `json:"version"`
	// Version of the Irmin Connector Structure this connector adheres to
	StructureVersion string `json:"structure_version"`
	// Name of the author of the connector
	Author string `json:"author"`
	// URL to the connector's logo image
	LogoURL string `json:"logo_url"`
	// List of capabilities supported by the connector e.g. pull, push, webhook_pull, webhook_patch
	Capabilities []string `json:"capabilities" gorm:"type:jsonb;serializer:json"`
	// List of locales supported by the connector
	Locales []string `json:"locales" gorm:"type:jsonb;serializer:json"`
	// (optional) Primary category of the connector
	PrimaryCategory string `json:"primary_category,omitempty" gorm:"type:varchar(255)"`
	// (optional) List of categories the connector belongs to
	Categories []string `json:"categories,omitempty" gorm:"type:jsonb;serializer:json"`
	// (optional) Email address of the author
	AuthorEmail string `json:"author_email,omitempty"`
	// (optional) URL to read more about the connector, such as documentation
	ReadMoreURL string `json:"read_more_url,omitempty"`
}

type ConnectorResponse struct {
	ID              string   `json:"id"`
	Name            string   `json:"name"`
	Description     string   `json:"description"`
	Version         string   `json:"version"`
	Author          string   `json:"author"`
	LogoURL         string   `json:"logo_url"`
	Capabilities    []string `json:"capabilities"`
	Locales         []string `json:"locales"`
	Categories      []string `json:"categories"`
	PrimaryCategory string   `json:"primary_category"`
	AuthorEmail     string   `json:"author_email"`
	ReadMoreURL     string   `json:"read_more_url"`
}

// GetAllConnectors retrieves all connectors from the database.
func GetAllConnectors() ([]Connector, error) {
	var connectors []Connector
	if err := DB.Find(&connectors).Error; err != nil {
		return nil, err
	}
	return connectors, nil
}

// GetConnector retrieves a connector from the database by its ID.
func GetConnector(id uint) (*Connector, error) {
	var connector Connector
	if err := DB.First(&connector, id).Error; err != nil {
		return nil, err
	}
	return &connector, nil
}

// GetConnectorByAPIBaseURL retrieves a connector from the database by its API base URL.
func GetConnectorByAPIBaseURL(apiBaseURL string) (*Connector, error) {
	var connector Connector
	if err := DB.Where("api_base_url = ?", apiBaseURL).First(&connector).Error; err != nil {
		return nil, err
	}
	return &connector, nil
}

// CreateConnector creates a new connector record in the database.
func CreateConnector(connector *Connector) (*Connector, error) {
	if err := DB.Create(&connector).Error; err != nil {
		return nil, err
	}
	return connector, nil
}

// UpdateConnector updates an existing connector record in the database.
func UpdateConnector(id uint, updates interface{}) (*Connector, error) {
	var connector Connector
	// Update only the provided fields for the connector with the specified ID.
	if err := DB.Model(&Connector{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return nil, err
	}
	// Retrieve the updated connector record.
	if err := DB.First(&connector, id).Error; err != nil {
		return nil, err
	}
	return &connector, nil
}

// DeleteConnector deletes a connector record from the database by its ID.
func DeleteConnector(id uint) error {
	if err := DB.Delete(&Connector{}, id).Error; err != nil {
		return err
	}
	return nil
}
