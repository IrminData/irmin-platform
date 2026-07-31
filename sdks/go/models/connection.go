package irminmodels

type CustomFieldValues map[string]string

type Connection struct {
	ID            string            `json:"id"             validate:"required,validsqid=connections" example:"conn_5p8q2n7m9x4k"`
	Name          string            `json:"name"           validate:"required,max=100"               example:"Production MySQL Database"`
	Description   string            `json:"description"    validate:"max=500"                        example:"Primary MySQL database"`
	Documentation string            `json:"documentation"  validate:"validdocumentation"             example:"# Production Database"`
	Details       CustomFieldValues `json:"details"`  // Values for the required connector configuration as JSON object, like {"host":"db.example.com"}
	Settings      CustomFieldValues `json:"settings"` // Values for the optional connector configuration as JSON object, like {"ssl_enabled":"true"}
	Owner         User              `json:"owner"          validate:"required"`
	Connector     Connector         `json:"connector"      validate:"required"`
	Tags          []Tag             `json:"tags,omitempty" validate:"dive"`
}
