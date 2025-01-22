package models

import (
	"encoding/json"
	"fmt"
)

type ObjectSchemaType string

const (
	ObjectSchemaTypeStructured ObjectSchemaType = "structured"
	ObjectSchemaTypeBinary     ObjectSchemaType = "binary"
	ObjectSchemaTypeGroup      ObjectSchemaType = "group"
)

type ObjectSchema interface {
	// method that subtypes must implement, so we can do type switches.
	ObjectSchemaType() ObjectSchemaType
	// Method that subtypes must implement for common base properties.
	Base() ObjectSchemaBase
}

type ObjectSchemaBase struct {
	Name         string  `json:"name"`
	Path         string  `json:"path"`
	LastModified *string `json:"last_modified,omitempty"`
	Description  *string `json:"description,omitempty"`
}

// ObjectSchemaStructured describes a structured object.
type ObjectSchemaStructured struct {
	ObjectSchemaBase
	Schema      JSONSchema `json:"schema"`
	Size        *int       `json:"size,omitempty"`
	ContentType *string    `json:"content_type,omitempty"`
}

// Ensure ObjectSchemaStructured implements ObjectSchema.
func (s ObjectSchemaStructured) ObjectSchemaType() ObjectSchemaType {
	return ObjectSchemaTypeStructured
}
func (s ObjectSchemaStructured) Base() ObjectSchemaBase {
	return s.ObjectSchemaBase
}

// ObjectSchemaBinary describes a binary object.
type ObjectSchemaBinary struct {
	ObjectSchemaBase
	Size        *int    `json:"size,omitempty"`
	ContentType *string `json:"content_type,omitempty"`
}

// Ensure ObjectSchemaBinary implements ObjectSchema.
func (b ObjectSchemaBinary) ObjectSchemaType() ObjectSchemaType {
	return ObjectSchemaTypeBinary
}
func (b ObjectSchemaBinary) Base() ObjectSchemaBase {
	return b.ObjectSchemaBase
}

// ObjectSchemaGroup describes a group object (folder).
type ObjectSchemaGroup struct {
	ObjectSchemaBase
	Children     []ObjectSchema           `json:"children"`
	Restrictions *GroupSchemaRestrictions `json:"restrictions,omitempty"`
}

// Ensure ObjectSchemaGroup implements ObjectSchema.
func (g ObjectSchemaGroup) ObjectSchemaType() ObjectSchemaType {
	return ObjectSchemaTypeGroup
}
func (g ObjectSchemaGroup) Base() ObjectSchemaBase {
	return g.ObjectSchemaBase
}

// GroupSchemaRestrictions defines restrictions on group schemas.
type GroupSchemaRestrictions struct {
	NoStructured           *bool     `json:"no_structured,omitempty"`
	NoBinary               *bool     `json:"no_binary,omitempty"`
	NoGroups               *bool     `json:"no_groups,omitempty"`
	OnlyStructured         *bool     `json:"only_structured,omitempty"`
	OnlyBinary             *bool     `json:"only_binary,omitempty"`
	OnlyGroups             *bool     `json:"only_groups,omitempty"`
	AllowedContentTypes    *[]string `json:"allowed_content_types,omitempty"`
	RestrictedContentTypes *[]string `json:"restricted_content_types,omitempty"`
	MaxSize                *int      `json:"max_size,omitempty"`
	MinSize                *int      `json:"min_size,omitempty"`
	MaxCount               *int      `json:"max_count,omitempty"`
	MinCount               *int      `json:"min_count,omitempty"`
	NamePattern            *string   `json:"name_pattern,omitempty"`
}

// JSONSchema represents a JSON Schema for structured data.
type JSONSchema struct {
	Type                 string                `json:"type"` // e.g. "object", "array", etc.
	Properties           map[string]JSONSchema `json:"properties,omitempty"`
	Required             []string              `json:"required,omitempty"`
	Items                *JSONSchema           `json:"items,omitempty"`
	Description          *string               `json:"description,omitempty"`
	Default              interface{}           `json:"default,omitempty"`
	Enum                 []interface{}         `json:"enum,omitempty"`
	AdditionalProperties interface{}           `json:"additionalProperties,omitempty"`
	Format               *string               `json:"format,omitempty"`
	Minimum              *float64              `json:"minimum,omitempty"`
	Maximum              *float64              `json:"maximum,omitempty"`
	MinLength            *int                  `json:"minLength,omitempty"`
	MaxLength            *int                  `json:"maxLength,omitempty"`
	Pattern              *string               `json:"pattern,omitempty"`
}

type objectSchemaWire struct {
	Type ObjectSchemaType `json:"type"`
}

// UnmarshalObjectSchema helps us decode JSON into the correct subtype.
func UnmarshalObjectSchema(data []byte) (ObjectSchema, error) {
	// Step 1: unmarshal into a “wire” struct to get the type
	var wire objectSchemaWire
	if err := json.Unmarshal(data, &wire); err != nil {
		return nil, fmt.Errorf("could not unmarshal to detect type: %w", err)
	}

	// Step 2: use the wire.Type to decide which real struct to unmarshal
	switch wire.Type {
	case ObjectSchemaTypeStructured:
		var s ObjectSchemaStructured
		if err := json.Unmarshal(data, &s); err != nil {
			return nil, fmt.Errorf("could not unmarshal structured schema: %w", err)
		}
		return s, nil
	case ObjectSchemaTypeBinary:
		var b ObjectSchemaBinary
		if err := json.Unmarshal(data, &b); err != nil {
			return nil, fmt.Errorf("could not unmarshal binary schema: %w", err)
		}
		return b, nil
	case ObjectSchemaTypeGroup:
		var g ObjectSchemaGroup
		if err := json.Unmarshal(data, &g); err != nil {
			return nil, fmt.Errorf("could not unmarshal group schema: %w", err)
		}
		return g, nil
	default:
		return nil, fmt.Errorf("unrecognised type %q", wire.Type)
	}
}

// MarshalObjectSchema helps us encode the correct subtype into JSON.
func MarshalObjectSchema(obj ObjectSchema) ([]byte, error) {
	return json.Marshal(obj) // This just works if `obj` is a concrete type
}
