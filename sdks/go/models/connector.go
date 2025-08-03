package irminmodels

// Connector represents general information about a connector.
type Connector struct {
	// ID is a unique SQIDidentifier of the connector
	ID string `json:"id"                validate:"required,validsqid=connectors"                                                                                                                                  example:"conn_9m3x7k2n8q5p"`
	// Name of the connector
	Name string `json:"name"              validate:"required,max=100"                                                                                                                                               example:"MySQL Database Connector"`
	// Description of the connector
	Description string `json:"description"       validate:"required,max=500"                                                                                                                                               example:"Connect to MySQL databases for data extraction and synchronization"`
	// Version of the connector (provided by the connector author)
	Version string `json:"version"           validate:"required,max=20"                                                                                                                                                example:"1.2.3"`
	// Structure version of the connector (e.g. which connector guideline version the connector is based on)
	StructureVersion string `json:"structure_version" validate:"required,max=20"                                                                                                                                                example:"1.0.0"`
	// Author of the connector
	Author string `json:"author"            validate:"required,max=100"                                                                                                                                               example:"Irmin Team"`
	// URL to the connector's logo
	LogoURL string `json:"logo_url"          validate:"required,validimageurl"                                                                                                                                         example:"https://cdn.irmin.dev/mysql.png"`
	// Array of capabilities of the connector, eg. what kind of operations the connector can perform
	Capabilities []ConnectorCapability `json:"capabilities"      validate:"required,dive,oneof=pull push push_patch event_webhook"                                                                                                         example:"pull,push"`
	// Array of locales supported by the connector, eg. what languages the connector supports
	Locales []string `json:"locales"           validate:"required,dive,min=2,max=5"                                                                                                                                      example:"en,fi"`
	// Array of categories associated with the connector, eg. what kind of connector it is
	Categories []ConnectorCategory `json:"categories"        validate:"required,dive,oneof=database crm erp warehouse marketing analytics storage messaging payment social calendar project_management ecommerce iot monitoring other" example:"database"`
	// Primary category of the connector
	PrimaryCategory ConnectorCategory `json:"primary_category"  validate:"required,oneof=database crm erp warehouse marketing analytics storage messaging payment social calendar project_management ecommerce iot monitoring other"      example:"database"`
	// Author's email address, eg. who to contact if there are any issues with the connector
	AuthorEmail string `json:"author_email"      validate:"required,email"                                                                                                                                                 example:"connectors@irmin.dev"`
	// URL for more information about the connector, eg. a website where the connector is described
	ReadMoreURL string `json:"read_more_url"     validate:"required,validurl"                                                                                                                                              example:"https://docs.irmin.dev/connectors/mysql"`
}

// ConnectorCapability represents the capabilities of a connector.
type ConnectorCapability string

const (
	// ConnectorCapabilityPull means that data files can be pulled from different paths in the connector.
	ConnectorCapabilityPull ConnectorCapability = "pull"
	// ConnectorCapabilityPush means that data files can be pushed to different paths in the connector.
	ConnectorCapabilityPush ConnectorCapability = "push"
	// ConnectorCapabilityPushPatch means that JSON Patch based change sets can be pushed to the connector.
	ConnectorCapabilityPushPatch ConnectorCapability = "push_patch"
	// ConnectorCapabilityEventWebhook means that the connector can send webhook notifications when something changes in the underlying data.
	ConnectorCapabilityEventWebhook ConnectorCapability = "event_webhook"
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
	OK bool `json:"ok"                        example:"true"`
	// Indicates if the connector can connect to the external system
	CanConnect bool `json:"can_connect"               example:"true"`
	// Indicates if the connection details are valid
	ConnectionDetailsValid bool `json:"connection_details_valid"  example:"true"`
	// Indicates if the connection settings are valid
	ConnectionSettingsValid bool `json:"connection_settings_valid" example:"true"`
	// (Optional) Array of validation errors
	Errors []string `json:"errors,omitempty"          example:"Invalid host address,Authentication failed" validate:"dive"`
}
