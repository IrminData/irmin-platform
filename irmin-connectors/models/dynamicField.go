package models

type DynamicField struct {
	Type         string         `json:"type"`
	Label        string         `json:"label"`
	Min          interface{}    `json:"min,omitempty"`
	Max          interface{}    `json:"max,omitempty"`
	Multiple     bool           `json:"multiple,omitempty"`
	Options      []SelectOption `json:"options,omitempty"`
	HelpText     string         `json:"help_text,omitempty"`
	Example      string         `json:"example,omitempty"`
	Default      interface{}    `json:"default,omitempty"`
	Required     bool           `json:"required,omitempty"`
	RequiredWith []string       `json:"required_with,omitempty"`
}

type SelectOption struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}
