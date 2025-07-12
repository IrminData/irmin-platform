package irminmodels

type CustomFieldValues map[string]string

type Connection struct {
	ID            string            `json:"id"             validate:"required,validsqid=connections"`
	Name          string            `json:"name"           validate:"required,max=100"`
	Description   string            `json:"description"    validate:"max=500"`
	Documentation string            `json:"documentation"  validate:"validdocumentation"`
	Details       CustomFieldValues `json:"details"        validate:"required"`
	Settings      CustomFieldValues `json:"settings"       validate:"required"`
	Owner         User              `json:"owner"          validate:"required"`
	Connector     Connector         `json:"connector"      validate:"required"`
	Tags          []Tag             `json:"tags,omitempty" validate:"dive"`
}
