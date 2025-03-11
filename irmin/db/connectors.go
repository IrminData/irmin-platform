package db

import (
	"gorm.io/gorm"
)

type Connector struct {
	gorm.Model

	// Base URL for the connector's REST API
	APIBaseURL string `json:"api_base_url" gorm:"type:varchar(255);not null"`
	// Token to authenticate system requests to the Connector's API
	SystemToken string `json:"systemToken" gorm:"type:varchar(255);not null"`
	// Name of the connector
	Name string `json:"name" gorm:"type:varchar(255);not null"`
	// Short description of the connector
	Description string `json:"description" gorm:"type:varchar(255);not null"`
	// Current version of the connector
	Version string `json:"version" gorm:"type:varchar(255);not null"`
	// Version of the Irmin Connector Structure this connector adheres to
	StructureVersion string `json:"structure_version" gorm:"type:varchar(255);not null"`
	// Name of the author of the connector
	Author string `json:"author" gorm:"type:varchar(255);not null"`
	// URL to the connector's logo image
	LogoURL string `json:"logo_url" gorm:"type:varchar(255);not null"`
	// List of capabilities supported by the connector
	Capabilities []ConnectorCapability `json:"capabilities" gorm:"type:json"`
	// List of locales supported by the connector
	Locales []string `json:"locales" gorm:"type:json"`
	// (optional) Primary category of the connector
	PrimaryCategory *ConnectorCategory `json:"primary_category,omitempty" gorm:"type:json"`
	// (optional) List of categories the connector belongs to
	Categories []ConnectorCategory `json:"categories,omitempty" gorm:"type:json"`
	// (optional) Email address of the author
	AuthorEmail *string `json:"author_email,omitempty" gorm:"type:varchar(255)"`
	// (optional) URL to read more about the connector, such as documentation
	ReadMoreURL *string `json:"read_more_url,omitempty" gorm:"type:varchar(255)"`
}

// ConnectorCapability represents the capabilities of a connector.
type ConnectorCapability string

const (
	ConnectorCapabilityPullFullSync  ConnectorCapability = "pull"
	ConnectorCapabilityPushFullSync  ConnectorCapability = "push"
	ConnectorCapabilityPushPatchSync ConnectorCapability = "webhook_patch"
	ConnectorCapabilityPullPatchSync ConnectorCapability = "webhook_pull"
)

// ConnectorCategory represents the category of a connector.
type ConnectorCategory string

const (
	ConnectorCategoryDatabase          ConnectorCategory = "database"
	ConnectorCategoryCRM               ConnectorCategory = "crm"
	ConnectorCategoryERP               ConnectorCategory = "erp"
	ConnectorCategoryWarehouse         ConnectorCategory = "warehouse"
	ConnectorCategoryMarketing         ConnectorCategory = "marketing"
	ConnectorCategoryAnalytics         ConnectorCategory = "analytics"
	ConnectorCategoryStorage           ConnectorCategory = "storage"
	ConnectorCategoryMessaging         ConnectorCategory = "messaging"
	ConnectorCategoryPayment           ConnectorCategory = "payment"
	ConnectorCategorySocial            ConnectorCategory = "social"
	ConnectorCategoryCalendar          ConnectorCategory = "calendar"
	ConnectorCategoryProjectManagement ConnectorCategory = "project_management"
	ConnectorCategoryECommerce         ConnectorCategory = "ecommerce"
	ConnectorCategoryIoT               ConnectorCategory = "iot"
	ConnectorCategoryMonitoring        ConnectorCategory = "monitoring"
	ConnectorCategoryOther             ConnectorCategory = "other"
)
