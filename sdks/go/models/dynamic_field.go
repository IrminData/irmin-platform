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
	Type         FieldType      `json:"type"                    validate:"required,oneof=text textarea password email checkbox integer float select radio file date time datetime" example:"text"`
	Label        string         `json:"label"                   validate:"required,max=100"                                                                                        example:"Name"`
	Min          float64        `json:"min,omitempty"                                                                                                                              example:"1"`
	Max          float64        `json:"max,omitempty"                                                                                                                              example:"100"`
	Multiple     bool           `json:"multiple,omitempty"                                                                                                                         example:"false"`
	Options      []SelectOption `json:"options,omitempty"       validate:"dive"`
	HelpText     string         `json:"help_text,omitempty"     validate:"max=200"                                                                                                 example:"This is a help text"`
	Example      string         `json:"example,omitempty"       validate:"max=100"                                                                                                 example:"Example value"`
	Default      string         `json:"default,omitempty"                                                                                                                          example:"Default value"`
	Secret       bool           `json:"secret,omitempty"                                                                                                                           example:"false"`
	Required     bool           `json:"required,omitempty"                                                                                                                         example:"true"`
	RequiredWith []string       `json:"required_with,omitempty" validate:"dive"                                                                                                    example:"field1,field2"`
}

// SelectOption represents an option for select/radio fields.
type SelectOption struct {
	Key   string `json:"key"   validate:"required,max=50"  example:"key1"`
	Value string `json:"value" validate:"required,max=100" example:"Value 1"`
}

// DynamicFields represents a list of dynamic fields for a form.
type DynamicFields map[string]DynamicField
