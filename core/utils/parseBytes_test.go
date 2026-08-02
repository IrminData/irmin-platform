package utils_test

import (
	"irmin-api/utils"
	"math"
	"testing"
)

func TestParseBytes(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected float64
		hasError bool
	}{
		// Basic cases
		{name: "empty string", input: "", expected: 0, hasError: false},
		{name: "plain number", input: "123", expected: 123, hasError: false},
		{name: "zero", input: "0", expected: 0, hasError: false},
		{name: "decimal number", input: "123.45", expected: 123.45, hasError: false},

		// Binary units (preferred)
		{name: "KiB", input: "1KiB", expected: 1024, hasError: false},
		{name: "MiB", input: "1MiB", expected: 1048576, hasError: false},
		{name: "GiB", input: "1GiB", expected: 1073741824, hasError: false},
		{name: "TiB", input: "1TiB", expected: 1099511627776, hasError: false},
		{name: "decimal KiB", input: "1.5KiB", expected: 1536, hasError: false},
		{name: "decimal MiB", input: "2.5MiB", expected: 2621440, hasError: false},

		// Binary unit shortcuts
		{name: "k", input: "1k", expected: 1024, hasError: false},
		{name: "mi", input: "1mi", expected: 1048576, hasError: false},

		// Decimal units
		{name: "KB", input: "1KB", expected: 1000, hasError: false},
		{name: "MB", input: "1MB", expected: 1000000, hasError: false},
		{name: "GB", input: "1GB", expected: 1000000000, hasError: false},
		{name: "TB", input: "1TB", expected: 1000000000000, hasError: false},
		{name: "decimal KB", input: "1.5KB", expected: 1500, hasError: false},

		// Single letter units (not supported in the arrays, would return errors)
		{name: "g", input: "1g", expected: 0, hasError: true},
		{name: "m", input: "1m", expected: 0, hasError: true},
		{name: "t", input: "1t", expected: 0, hasError: true},

		// Bytes
		{name: "bytes", input: "1b", expected: 1, hasError: false},
		{name: "B", input: "1B", expected: 1, hasError: false},

		// Case insensitive
		{name: "uppercase MIB", input: "1MIB", expected: 1048576, hasError: false},
		{name: "mixed case", input: "1gB", expected: 1000000000, hasError: false},

		// Negative numbers
		{name: "negative", input: "-1KB", expected: -1000, hasError: false},
		{name: "negative decimal", input: "-1.5MB", expected: -1500000, hasError: false},

		// Whitespace
		{name: "leading space", input: " 1KB", expected: 1000, hasError: false},
		{name: "trailing space", input: "1KB ", expected: 1000, hasError: false},
		{name: "spaces around", input: " 1KB ", expected: 1000, hasError: false},

		// Real-world Docker stats examples
		{name: "docker memory", input: "9.602MiB", expected: 10068426.752, hasError: false},
		{name: "docker cpu", input: "1.05k", expected: 1075.2, hasError: false},
		{name: "docker network", input: "53MB", expected: 53000000, hasError: false},
		{name: "docker disk", input: "185.4mi", expected: 194405990.4, hasError: false},
		{name: "docker large", input: "2.5GB", expected: 2500000000, hasError: false},

		// Large units
		{name: "PiB", input: "1PiB", expected: 1125899906842624, hasError: false},
		{name: "EiB", input: "1EiB", expected: 1152921504606846976, hasError: false},

		// Error cases
		{name: "invalid number", input: "abc", expected: 0, hasError: true},
		{name: "invalid unit", input: "1xyz", expected: 0, hasError: true},
		{name: "multiple numbers", input: "1 2 KB", expected: 0, hasError: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := utils.ParseBytes(tt.input)

			if tt.hasError {
				if err == nil {
					t.Errorf("ParseBytes(%q) expected error, got nil", tt.input)
				}
				return
			}

			if err != nil {
				t.Errorf("ParseBytes(%q) unexpected error: %v", tt.input, err)
				return
			}

			const tolerance = 0.1
			if math.Abs(result-tt.expected) > tolerance {
				t.Errorf("ParseBytes(%q) = %f, expected %f", tt.input, result, tt.expected)
			}
		})
	}
}

func TestParseBytesEdgeCases(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected float64
	}{
		{name: "very small decimal", input: "0.001KB", expected: 1},
		{name: "zero with unit", input: "0MB", expected: 0},
		{name: "negative zero", input: "-0", expected: 0},
		{name: "scientific notation fallback", input: "1e3", expected: 1000},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := utils.ParseBytes(tt.input)
			if err != nil {
				t.Errorf("ParseBytes(%q) unexpected error: %v", tt.input, err)
				return
			}

			const tolerance = 0.1
			if math.Abs(result-tt.expected) > tolerance {
				t.Errorf("ParseBytes(%q) = %f, expected %f", tt.input, result, tt.expected)
			}
		})
	}
}
