package utils_test

import (
	"irmin-api/utils"
	"testing"
)

func TestStringPtr(t *testing.T) {
	tests := []struct {
		name  string
		input string
	}{
		{
			name:  "empty string",
			input: "",
		},
		{
			name:  "simple string",
			input: "hello",
		},
		{
			name:  "string with spaces",
			input: "hello world",
		},
		{
			name:  "string with special characters",
			input: "hello!@#$%^&*()",
		},
		{
			name:  "unicode string",
			input: "Hello 世界 🌍",
		},
		{
			name:  "long string",
			input: "this is a very long string that contains many characters to test the function",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := utils.StringPtr(tt.input)

			// Check that result is not nil
			if result == nil {
				t.Fatal("StringPtr returned nil")
			}

			// Check that dereferenced value equals input
			if *result != tt.input {
				t.Errorf("StringPtr(%q) = %q, expected %q", tt.input, *result, tt.input)
			}

			// Check that the pointer is different from the original
			// (i.e., it's a new allocation)
			if &tt.input == result {
				t.Error("StringPtr returned pointer to the original string, expected a new allocation")
			}
		})
	}
}
