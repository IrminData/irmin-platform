package utils_test

import (
	"irmin-api/utils"
	"math"
	"testing"
)

func TestAbs(t *testing.T) {
	tests := []struct {
		name     string
		input    float64
		expected float64
	}{
		{name: "positive number", input: 5.0, expected: 5.0},
		{name: "negative number", input: -5.0, expected: 5.0},
		{name: "zero", input: 0.0, expected: 0.0},
		{name: "negative zero", input: math.Copysign(0, -1), expected: 0.0},
		{name: "positive decimal", input: 3.14, expected: 3.14},
		{name: "negative decimal", input: -3.14, expected: 3.14},
		{name: "large positive", input: 1e10, expected: 1e10},
		{name: "large negative", input: -1e10, expected: 1e10},
		{name: "small positive", input: 1e-10, expected: 1e-10},
		{name: "small negative", input: -1e-10, expected: 1e-10},
		{name: "positive infinity", input: math.Inf(1), expected: math.Inf(1)},
		{name: "negative infinity", input: math.Inf(-1), expected: math.Inf(1)},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := utils.Abs(tt.input)
			if result != tt.expected {
				t.Errorf("Abs(%f) = %f, expected %f", tt.input, result, tt.expected)
			}
		})
	}
}

func TestAbsNaN(t *testing.T) {
	result := utils.Abs(math.NaN())
	if !math.IsNaN(result) {
		t.Errorf("Abs(NaN) = %f, expected NaN", result)
	}
}
