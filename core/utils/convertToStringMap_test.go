package utils_test

import (
	"irmin-api/utils"
	"reflect"
	"testing"
)

func TestConvertToStringMap(t *testing.T) {
	tests := []struct {
		name     string
		input    map[string]any
		expected map[string]string
	}{
		{
			name:     "empty map",
			input:    map[string]any{},
			expected: map[string]string{},
		},
		{
			name: "string values only",
			input: map[string]any{
				"key1": "value1",
				"key2": "value2",
				"key3": "value3",
			},
			expected: map[string]string{
				"key1": "value1",
				"key2": "value2",
				"key3": "value3",
			},
		},
		{
			name: "mixed value types",
			input: map[string]any{
				"string": "hello",
				"int":    42,
				"float":  3.14,
				"bool":   true,
				"nil":    nil,
			},
			expected: map[string]string{
				"string": "hello",
				"int":    "42",
				"float":  "3.14",
				"bool":   "true",
				"nil":    "<nil>",
			},
		},
		{
			name: "integer types",
			input: map[string]any{
				"int":    123,
				"int8":   int8(12),
				"int16":  int16(1234),
				"int32":  int32(12345),
				"int64":  int64(123456),
				"uint":   uint(123),
				"uint8":  uint8(12),
				"uint16": uint16(1234),
				"uint32": uint32(12345),
				"uint64": uint64(123456),
			},
			expected: map[string]string{
				"int":    "123",
				"int8":   "12",
				"int16":  "1234",
				"int32":  "12345",
				"int64":  "123456",
				"uint":   "123",
				"uint8":  "12",
				"uint16": "1234",
				"uint32": "12345",
				"uint64": "123456",
			},
		},
		{
			name: "float types",
			input: map[string]any{
				"float32": float32(3.14),
				"float64": float64(3.14159),
			},
			expected: map[string]string{
				"float32": "3.14",
				"float64": "3.14159",
			},
		},
		{
			name: "boolean values",
			input: map[string]any{
				"true":  true,
				"false": false,
			},
			expected: map[string]string{
				"true":  "true",
				"false": "false",
			},
		},
		{
			name: "complex types - slices and maps",
			input: map[string]any{
				"slice": []string{"a", "b", "c"},
				"map":   map[string]string{"nested": "value"},
			},
			expected: map[string]string{
				"slice": "[a b c]",
				"map":   "map[nested:value]",
			},
		},
		{
			name: "empty string values",
			input: map[string]any{
				"empty": "",
				"space": " ",
			},
			expected: map[string]string{
				"empty": "",
				"space": " ",
			},
		},
		{
			name: "special characters in values",
			input: map[string]any{
				"special": "hello!@#$%^&*()",
				"unicode": "Hello 世界 🌍",
			},
			expected: map[string]string{
				"special": "hello!@#$%^&*()",
				"unicode": "Hello 世界 🌍",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := utils.ConvertToStringMap(tt.input)

			if !reflect.DeepEqual(result, tt.expected) {
				t.Errorf("ConvertToStringMap() = %v, expected %v", result, tt.expected)
			}

			// Check that the length matches
			if len(result) != len(tt.expected) {
				t.Errorf("ConvertToStringMap returned map of length %d, expected %d", len(result), len(tt.expected))
			}
		})
	}
}

func TestConvertToStringMapWithNilMap(t *testing.T) {
	var input map[string]any
	result := utils.ConvertToStringMap(input)

	if result == nil {
		t.Error("ConvertToStringMap returned nil for nil input, expected empty map")
	}

	if len(result) != 0 {
		t.Errorf("ConvertToStringMap returned map of length %d for nil input, expected 0", len(result))
	}
}
