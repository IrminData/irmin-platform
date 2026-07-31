package irminmodels

type TemplateType string

const (
	TemplateTypeScript TemplateType = "script"
	TemplateTypeQuery  TemplateType = "query"
)

type TemplateLanguage string

const (
	TemplateLanguageGo  TemplateLanguage = "go"
	TemplateLanguageSQL TemplateLanguage = "sql"
)

// TemplatePlaceholder represents a placeholder in a template with an example value.
type TemplatePlaceholder struct {
	Name    string `json:"name"    validate:"required,max=100" example:"repository_slug"`
	Example string `json:"example" validate:"required,max=255" example:"my-repo"`
}

// Template represents a template from which a script or query can be created.
type Template struct {
	ID           string                `json:"id"           validate:"required,validsqid=templates" example:"tpl_2k8n9q1m7p3x4z"`
	Title        string                `json:"title"        validate:"required,max=100"             example:"My Template"`
	Description  string                `json:"description"  validate:"required,max=255"             example:"This is a template for my application"`
	Content      string                `json:"content"      validate:"required,max=10000"           example:"This is the content of my template"`
	Type         TemplateType          `json:"type"         validate:"required,max=50"              example:"script"`
	Language     TemplateLanguage      `json:"language"     validate:"required,max=50"              example:"go"`
	Tags         []string              `json:"tags"         validate:"required,dive"                example:"tag1,tag2,tag3"`
	Placeholders []TemplatePlaceholder `json:"placeholders" validate:"omitempty,dive"`
}
