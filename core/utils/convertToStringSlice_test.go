package utils_test

import (
	"irmin-api/utils"
	"reflect"
	"testing"
)

// Custom type based on string for testing
type CustomString string

func TestConvertToStringSlice(t *testing.T) {
	tests := []struct {
		name     string
		input    []CustomString
		expected []string
	}{
		{
			name:     "empty slice",
			input:    []CustomString{},
			expected: []string{},
		},
		{
			name:     "single element",
			input:    []CustomString{"hello"},
			expected: []string{"hello"},
		},
		{
			name:     "multiple elements",
			input:    []CustomString{"hello", "world", "test"},
			expected: []string{"hello", "world", "test"},
		},
		{
			name:     "empty strings",
			input:    []CustomString{"", "", ""},
			expected: []string{"", "", ""},
		},
		{
			name:     "mixed content",
			input:    []CustomString{"hello", "", "world", "123", "test"},
			expected: []string{"hello", "", "world", "123", "test"},
		},
		{
			name:     "special characters",
			input:    []CustomString{"hello!", "@world", "#test", "$123"},
			expected: []string{"hello!", "@world", "#test", "$123"},
		},
		{
			name:     "unicode characters",
			input:    []CustomString{"Hello", "世界", "🌍"},
			expected: []string{"Hello", "世界", "🌍"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := utils.ConvertToStringSlice(tt.input)

			if !reflect.DeepEqual(result, tt.expected) {
				t.Errorf("ConvertToStringSlice(%v) = %v, expected %v", tt.input, result, tt.expected)
			}

			// Check that the length matches
			if len(result) != len(tt.expected) {
				t.Errorf("ConvertToStringSlice returned slice of length %d, expected %d", len(result), len(tt.expected))
			}
		})
	}
}

func TestConvertToStringSliceWithNilSlice(t *testing.T) {
	var input []CustomString
	result := utils.ConvertToStringSlice(input)

	if result == nil {
		t.Error("ConvertToStringSlice returned nil for nil input, expected empty slice")
	}

	if len(result) != 0 {
		t.Errorf("ConvertToStringSlice returned slice of length %d for nil input, expected 0", len(result))
	}
}
