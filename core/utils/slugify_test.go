package utils_test

import (
	"irmin-api/utils"
	"testing"
)

func TestSlugify(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "basic string",
			input:    "Hello World",
			expected: "hello-world",
		},
		{
			name:     "string with special characters",
			input:    "Hello, World!",
			expected: "hello-world",
		},
		{
			name:     "string with numbers",
			input:    "Product 123",
			expected: "product-123",
		},
		{
			name:     "string with multiple spaces",
			input:    "Hello    World",
			expected: "hello-world",
		},
		{
			name:     "string with hyphens",
			input:    "hello-world",
			expected: "hello-world",
		},
		{
			name:     "string with multiple hyphens",
			input:    "hello--world",
			expected: "hello-world",
		},
		{
			name:     "string with mixed spaces and hyphens",
			input:    "hello - world",
			expected: "hello-world",
		},
		{
			name:     "string with leading and trailing spaces",
			input:    "  hello world  ",
			expected: "hello-world",
		},
		{
			name:     "string with leading and trailing hyphens",
			input:    "-hello-world-",
			expected: "hello-world",
		},
		{
			name:     "empty string",
			input:    "",
			expected: "",
		},
		{
			name:     "string with only special characters",
			input:    "!@#$%^&*()",
			expected: "",
		},
		{
			name:     "string with only spaces",
			input:    "   ",
			expected: "",
		},
		{
			name:     "string with only hyphens",
			input:    "---",
			expected: "",
		},
		{
			name:     "string with unicode characters",
			input:    "Héllo Wörld",
			expected: "hllo-wrld",
		},
		{
			name:     "complex string",
			input:    "This is a Test! With @#$% Special Characters & Numbers 123",
			expected: "this-is-a-test-with-special-characters-numbers-123",
		},
		{
			name:     "string with underscores",
			input:    "hello_world_test",
			expected: "helloworldtest",
		},
		{
			name:     "already lowercase alphanumeric",
			input:    "abc123",
			expected: "abc123",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := utils.Slugify(tt.input)
			if result != tt.expected {
				t.Errorf("Slugify(%q) = %q, expected %q", tt.input, result, tt.expected)
			}
		})
	}
}
