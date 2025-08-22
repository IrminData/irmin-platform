package db

import (
	"gorm.io/gorm"
)

type Connector struct {
	gorm.Model

	// Base URL for the connector's REST API
	APIBaseURL string `json:"api_base_url"               gorm:"index"`
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
	Capabilities []string `json:"capabilities"               gorm:"type:jsonb;serializer:json"`
	// List of locales supported by the connector
	Locales []string `json:"locales"                    gorm:"type:jsonb;serializer:json"`
	// (optional) Primary category of the connector
	PrimaryCategory string `json:"primary_category,omitempty" gorm:"type:varchar(255)"`
	// (optional) List of categories the connector belongs to
	Categories []string `json:"categories,omitempty"       gorm:"type:jsonb;serializer:json"`
	// (optional) Email address of the author
	AuthorEmail string `json:"author_email,omitempty"`
	// (optional) URL to read more about the connector, such as documentation
	ReadMoreURL string `json:"read_more_url,omitempty"`
}

// GetAllConnectors retrieves all connectors from the database.
func (d *Database) GetAllConnectors() ([]Connector, error) {
	var connectors []Connector
	if err := d.Order("created_at desc").Find(&connectors).Error; err != nil {
		return nil, err
	}
	return connectors, nil
}

// GetConnector retrieves a connector from the database by its ID.
func (d *Database) GetConnector(id uint) (*Connector, error) {
	var connector Connector
	if err := d.First(&connector, id).Error; err != nil {
		return nil, err
	}
	return &connector, nil
}

// GetConnectorByAPIBaseURL retrieves a connector from the database by its API base URL.
func (d *Database) GetConnectorByAPIBaseURL(apiBaseURL string) (*Connector, error) {
	var connector Connector
	if err := d.Where(&Connector{APIBaseURL: apiBaseURL}).First(&connector).Error; err != nil {
		return nil, err
	}
	return &connector, nil
}

// DeleteConnector deletes a connector record and its associated connections from the database by its ID.
func (d *Database) DeleteConnector(tx *gorm.DB, id uint) error {
	// Delete associated connections first
	if err := tx.Where(&Connection{ConnectorID: id}).Delete(&Connection{}).Error; err != nil {
		return err
	}
	// Then delete the connector
	if err := tx.Delete(&Connector{}, id).Error; err != nil {
		return err
	}
	return nil
}
