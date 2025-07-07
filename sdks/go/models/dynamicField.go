package irminmodels

// FieldType represents the type of a dynamic field.
type FieldType string

const (
	FieldTypeText     FieldType = "text"
	FieldTypeTextarea FieldType = "textarea"
	FieldTypePassword FieldType = "password"
	FieldTypeEmail    FieldType = "email"
	FieldTypeCheckbox FieldType = "checkbox"
	FieldTypeInteger  FieldType = "integer"
	FieldTypeFloat    FieldType = "float"
	FieldTypeSelect   FieldType = "select"
	FieldTypeRadio    FieldType = "radio"
	FieldTypeFile     FieldType = "file"
	FieldTypeDate     FieldType = "date"
	FieldTypeTime     FieldType = "time"
	FieldTypeDatetime FieldType = "datetime"
)

// DynamicField represents a field for user to fill in.
type DynamicField struct {
	Type         FieldType      `json:"type"                    validate:"required,oneof=text textarea password email checkbox integer float select radio file date time datetime"`
	Label        string         `json:"label"                   validate:"required,min=1,max=100"`
	Min          any            `json:"min,omitempty"`
	Max          any            `json:"max,omitempty"`
	Multiple     bool           `json:"multiple,omitempty"`
	Options      []SelectOption `json:"options,omitempty"       validate:"dive"`
	HelpText     string         `json:"help_text,omitempty"     validate:"max=200"`
	Example      string         `json:"example,omitempty"       validate:"max=100"`
	Default      any            `json:"default,omitempty"`
	Required     bool           `json:"required,omitempty"`
	RequiredWith []string       `json:"required_with,omitempty" validate:"dive,min=1"`
}

// SelectOption represents an option for select/radio fields.
type SelectOption struct {
	Key   string `json:"key"   validate:"required,min=1,max=50"`
	Value string `json:"value" validate:"required,min=1,max=100"`
}

// DynamicFields represents a list of dynamic fields for a form.
type DynamicFields map[string]DynamicField
