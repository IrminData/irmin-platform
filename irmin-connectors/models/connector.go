package models

import (
	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// ConnectorCapability describes the features the connector supports.
type ConnectorCapability string

const (
	// Can perform operation "pull"
	ConnectorCapabilityPullFullSync ConnectorCapability = "pull"
	// Can perform operation "push"
	ConnectorCapabilityPushFullSync ConnectorCapability = "push"
	// Can send patch webhook events
	ConnectorCapabilityPushPatchSync ConnectorCapability = "webhook_patch"
	// Can send full object webhook events
	ConnectorCapabilityPullPatchSync ConnectorCapability = "webhook_pull"
)

// ConnectorCategory describes the type of service the connector is for.
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

// ConnectorInfo holds general information about a connector.
type ConnectorInfo struct {
	gorm.Model

	// Unique identifier for the connector
	ID string `json:"id" gorm:"primaryKey type:varchar(255);not null"`

	// Name of the connector
	Name string `json:"name" gorm:"type:varchar(255);not null"`

	// Short description of the connector
	Description string `json:"description" gorm:"type:text;not null"`

	// Current version of the connector
	Version string `json:"version" gorm:"type:varchar(50);not null"`

	// Version of the Irmin Connector Structure this connector adheres to
	StructureVersion string `json:"structure_version" gorm:"type:varchar(50);not null"`

	// Name of the author of the connector
	Author string `json:"author" gorm:"type:varchar(100);not null"`

	// Base URL for the connector's REST API
	APIBaseURL string `json:"api_base_url" gorm:"type:text;not null"`

	// URL to the connector's logo image
	LogoURL string `json:"logo_url" gorm:"type:text;not null"`

	// List of capabilities supported by the connector
	// Stored in JSON format for array-like data.
	Capabilities datatypes.JSON `json:"capabilities" gorm:"type:json"`

	// List of locales supported by the connector
	// Also stored in JSON format.
	Locales datatypes.JSON `json:"locales" gorm:"type:json"`

	// (optional) Primary category of the connector
	PrimaryCategory *ConnectorCategory `json:"primary_category" gorm:"type:varchar(50)"`

	// (optional) List of categories the connector belongs to
	Categories datatypes.JSON `json:"categories" gorm:"type:json"`

	// (optional) Email address of the author
	AuthorEmail *string `json:"author_email" gorm:"type:varchar(255)"`

	// (optional) Markdown-formatted text providing more details about the connector
	Documentation *string `json:"documentation" gorm:"type:text"`

	// (optional) URL to read more about the connector, such as documentation
	ReadMoreURL *string `json:"read_more_url" gorm:"type:text"`
}

// TableName allows you to override the default table name if desired.
func (ConnectorInfo) TableName() string {
	return "connector_info"
}

// Generate a custom string ID before creating the record.
func (ci *ConnectorInfo) BeforeCreate(tx *gorm.DB) (err error) {
	if ci.ID == "" { // Only generate an ID if it wasn't already set
		id := uuid.NewString()
		ci.ID = id
	}
	return nil
}
