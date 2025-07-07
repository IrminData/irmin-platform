package irminmodels

// Connector represents general information about a connector.
type Connector struct {
	ID               string                `json:"id"                          validate:"required,validsqid=connectors"`
	Name             string                `json:"name"                        validate:"required,min=1,max=100"`
	Description      string                `json:"description"                 validate:"required,min=1,max=500"`
	Version          string                `json:"version"                     validate:"required,min=1,max=20"`
	StructureVersion string                `json:"structure_version,omitempty" validate:"min=1,max=20"`
	Author           string                `json:"author"                      validate:"required,min=1,max=100"`
	LogoURL          string                `json:"logo_url"                    validate:"required,url"`
	Capabilities     []ConnectorCapability `json:"capabilities"                validate:"required,min=1,dive,oneof=pull push webhook_patch webhook_pull"`
	Locales          []string              `json:"locales"                     validate:"required,min=1,dive,min=2,max=5"`
	Categories       []ConnectorCategory   `json:"categories"                  validate:"required,min=1,dive,oneof=database crm erp warehouse marketing analytics storage messaging payment social calendar project_management ecommerce iot monitoring other"`
	PrimaryCategory  ConnectorCategory     `json:"primary_category"            validate:"required,oneof=database crm erp warehouse marketing analytics storage messaging payment social calendar project_management ecommerce iot monitoring other"`
	AuthorEmail      string                `json:"author_email"                validate:"required,email"`
	ReadMoreURL      string                `json:"read_more_url"               validate:"required,url"`
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
	// (Optional) Validation error messages
	Errors []string `json:"errors,omitempty"          validate:"dive,min=1"`
}
