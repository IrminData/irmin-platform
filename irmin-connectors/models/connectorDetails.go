package models

import irminmodels "github.com/IrminData/irmin-sdk-go/models"

type ConnectorDetails struct {
	Name             string                            `json:"name"              example:"MySQL Database Connector"`
	Description      string                            `json:"description"       example:"Connect to MySQL databases for data extraction and synchronization"`
	Version          string                            `json:"version"           example:"1.2.3"`
	StructureVersion string                            `json:"structure_version" example:"1.0.0"`
	Author           string                            `json:"author"            example:"Irmin Team"`
	APIBaseURL       string                            `json:"api_base_url"      example:"https://connectors.irmin.co/mysql"`
	LogoURL          string                            `json:"logo_url"          example:"https://cdn.irmin.co/connectors/mysql.png"`
	Capabilities     []irminmodels.ConnectorCapability `json:"capabilities"      example:"pull,push"                                                                                                                                  enums:"pull,push,push_patch,event_webhook"`
	Locales          []string                          `json:"locales"           example:"en,fi"`
	PrimaryCategory  irminmodels.ConnectorCategory     `json:"primary_category"  example:"database"`
	Categories       []irminmodels.ConnectorCategory   `json:"categories"        example:"database,crm,erp,warehouse,marketing,analytics,storage,messaging,payment,social,calendar,project_management,ecommerce,iot,monitoring,other"`
	AuthorEmail      string                            `json:"author_email"      example:"hello@irmin.co"`
	ReadMoreURL      string                            `json:"read_more_url"     example:"https://docs.irmin.co/connectors/mysql"`
}
