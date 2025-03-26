package irminModels

// Connector represents general information about a connector.
type Connector struct {
	ID               string                `json:"id"`
	Name             string                `json:"name"`
	Description      string                `json:"description"`
	Version          string                `json:"version"`
	StructureVersion string                `json:"structure_version,omitempty"`
	Author           string                `json:"author"`
	LogoURL          string                `json:"logo_url"`
	Capabilities     []ConnectorCapability `json:"capabilities"`
	Locales          []string              `json:"locales"`
	Categories       []ConnectorCategory   `json:"categories"`
	PrimaryCategory  ConnectorCategory     `json:"primary_category"`
	AuthorEmail      string                `json:"author_email"`
	ReadMoreURL      string                `json:"read_more_url"`
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
