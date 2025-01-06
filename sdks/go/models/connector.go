package models

// Connector represents general information about a connector.
type Connector struct {
	// Unique ID of the connector
	ID string `json:"id"`
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
	// Base URL for the connector's REST API
	APIBaseURL string `json:"api_base_url"`
	// URL to the connector's logo image
	LogoURL string `json:"logo_url"`
	// List of capabilities supported by the connector
	Capabilities []ConnectorCapability `json:"capabilities"`
	// List of locales supported by the connector
	Locales []string `json:"locales"`
	// (optional) Primary category of the connector
	PrimaryCategory *ConnectorCategory `json:"primary_category,omitempty"`
	// (optional) List of categories the connector belongs to
	Categories []ConnectorCategory `json:"categories,omitempty"`
	// (optional) Email address of the author
	AuthorEmail *string `json:"author_email,omitempty"`
	// (optional) Markdown-formatted text providing more details about the connector
	Documentation *string `json:"documentation,omitempty"`
	// (optional) URL to read more about the connector, such as documentation
	ReadMoreURL *string `json:"read_more_url,omitempty"`
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

// ConnectorConfigurationValidationResult represents the validation result of a connector configuration.
type ConnectorConfigurationValidationResult struct {
	// Indicates if the configuration is valid
	OK bool `json:"ok"`
	// Indicates if the connector can connect to the external system
	CanConnect bool `json:"can_connect"`
	// Indicates if the connection details are valid
	ConnectionDetailsValid bool `json:"connection_details_valid"`
	// Indicates if the connection settings are valid
	ConnectionSettingsValid bool `json:"connection_settings_valid"`
}

// ConnectorSchemaValidationResult represents the validation result of a schema.
type ConnectorSchemaValidationResult struct {
	// Indicates if the data is valid against the schema
	Valid bool `json:"valid"`
}
