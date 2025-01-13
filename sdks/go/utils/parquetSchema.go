package utils

import (
	"fmt"
	"reflect"
	"strings"
)

type SchemaField struct {
	Tag    string        `json:"Tag"`
	Fields []SchemaField `json:"Fields,omitempty"`
}

// Create a Parquet schema from a Go struct.
func CreateParquetSchema(t reflect.Type, inName string) SchemaField {
	tagName := strings.ToLower(inName)
	field := SchemaField{
		Tag: fmt.Sprintf("name=%s, inname=%s, ", tagName, inName),
	}

	switch t.Kind() {
	case reflect.String:
		field.Tag += "type=BYTE_ARRAY, convertedtype=UTF8, repetitiontype=REQUIRED"
	case reflect.Int, reflect.Int32:
		field.Tag += "type=INT32, repetitiontype=REQUIRED"
	case reflect.Int64:
		field.Tag += "type=INT64, repetitiontype=REQUIRED"
	case reflect.Float32, reflect.Float64:
		field.Tag += "type=FLOAT, repetitiontype=REQUIRED"
	case reflect.Bool:
		field.Tag += "type=BOOLEAN, repetitiontype=REQUIRED"
	case reflect.Slice:
		field.Tag += "type=LIST, repetitiontype=REQUIRED"
		elem := CreateParquetSchema(t.Elem(), "element")
		field.Fields = []SchemaField{elem}
	case reflect.Map:
		field.Tag += "type=MAP, repetitiontype=REQUIRED"
		key := CreateParquetSchema(t.Key(), "key")
		value := CreateParquetSchema(t.Elem(), "value")
		field.Fields = []SchemaField{key, value}
	case reflect.Struct:
		field.Tag += "repetitiontype=REQUIRED"
		for i := 0; i < t.NumField(); i++ {
			subField := t.Field(i)
			if !subField.IsExported() {
				continue
			}
			field.Fields = append(field.Fields, CreateParquetSchema(subField.Type, subField.Name))
		}
	}

	return field
}

// Helper to map Parquet types to Go types.
func parquetTypeToGoType(tag string) string {
	if strings.Contains(tag, "type=BYTE_ARRAY") && strings.Contains(tag, "convertedtype=UTF8") {
		return "string"
	} else if strings.Contains(tag, "type=INT32") {
		return "int32"
	} else if strings.Contains(tag, "type=INT64") {
		return "int64"
	} else if strings.Contains(tag, "type=FLOAT") {
		return "float32"
	} else if strings.Contains(tag, "type=BOOLEAN") {
		return "bool"
	} else if strings.Contains(tag, "type=LIST") {
		return "[]"
	} else if strings.Contains(tag, "type=MAP") {
		return "map"
	}
	return "interface{}"
}

// Recursively generate Go struct definition.
func GenerateGoStruct(schema SchemaField, structName string) string {
	var builder strings.Builder
	builder.WriteString(fmt.Sprintf("type %s struct {\n", structName))

	for _, field := range schema.Fields {
		// Extract field name and inname from the Tag.
		tagParts := strings.Split(field.Tag, ", ")
		var name, inname string
		for _, part := range tagParts {
			if strings.HasPrefix(part, "name=") {
				name = strings.TrimPrefix(part, "name=")
			}
			if strings.HasPrefix(part, "inname=") {
				inname = strings.TrimPrefix(part, "inname=")
			}
		}

		goType := parquetTypeToGoType(field.Tag)
		if goType == "[]" {
			// Handle list types
			if len(field.Fields) > 0 {
				elementType := parquetTypeToGoType(field.Fields[0].Tag)
				goType += elementType
			}
		} else if goType == "map" {
			// Handle map types
			if len(field.Fields) >= 2 {
				keyType := parquetTypeToGoType(field.Fields[0].Tag)
				valueType := parquetTypeToGoType(field.Fields[1].Tag)
				goType = fmt.Sprintf("map[%s]%s", keyType, valueType)
			}
		} else if len(field.Fields) > 0 {
			// Nested struct
			nestedStructName := strings.Title(name)
			goType = nestedStructName
			nestedStruct := GenerateGoStruct(field, nestedStructName)
			builder.WriteString(nestedStruct + "\n")
		}

		// Add the field to the struct definition
		builder.WriteString(fmt.Sprintf("\t%s %s `json:\"%s\"`\n", strings.Title(inname), goType, name))
	}

	builder.WriteString("}\n")
	return builder.String()
}
