package utils_test

import (
	"irmin-api/utils"
	"math"
	"testing"
)

func TestAverage(t *testing.T) {
	tests := []struct {
		name     string
		input    []float64
		expected float64
	}{
		{name: "single element", input: []float64{5.0}, expected: 5.0},
		{name: "two elements", input: []float64{2.0, 8.0}, expected: 5.0},
		{name: "three elements", input: []float64{1.0, 2.0, 3.0}, expected: 2.0},
		{name: "multiple elements", input: []float64{10.0, 20.0, 30.0, 40.0}, expected: 25.0},
		{name: "decimal numbers", input: []float64{1.5, 2.5, 3.5}, expected: 2.5},
		{name: "negative numbers", input: []float64{-1.0, -2.0, -3.0}, expected: -2.0},
		{name: "mixed positive and negative", input: []float64{-5.0, 0.0, 5.0}, expected: 0.0},
		{name: "zeros", input: []float64{0.0, 0.0, 0.0}, expected: 0.0},
		{name: "large numbers", input: []float64{1e6, 2e6, 3e6}, expected: 2e6},
		{name: "small numbers", input: []float64{1e-6, 2e-6, 3e-6}, expected: 2e-6},
		{name: "empty slice", input: []float64{}, expected: 0.0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := utils.Average(tt.input)

			const tolerance = 1e-10
			if math.Abs(result-tt.expected) > tolerance {
				t.Errorf("Average(%v) = %f, expected %f", tt.input, result, tt.expected)
			}
		})
	}
}

func TestAverageSpecialCases(t *testing.T) {
	t.Run("with infinity", func(t *testing.T) {
		input := []float64{math.Inf(1), 1.0, 2.0}
		result := utils.Average(input)
		if !math.IsInf(result, 1) {
			t.Errorf("Average(%v) = %f, expected +Inf", input, result)
		}
	})

	t.Run("with negative infinity", func(t *testing.T) {
		input := []float64{math.Inf(-1), 1.0, 2.0}
		result := utils.Average(input)
		if !math.IsInf(result, -1) {
			t.Errorf("Average(%v) = %f, expected -Inf", input, result)
		}
	})

	t.Run("with NaN", func(t *testing.T) {
		input := []float64{math.NaN(), 1.0, 2.0}
		result := utils.Average(input)
		if !math.IsNaN(result) {
			t.Errorf("Average(%v) = %f, expected NaN", input, result)
		}
	})

	t.Run("precision test", func(t *testing.T) {
		input := []float64{0.1, 0.2, 0.3}
		result := utils.Average(input)
		expected := 0.2

		const tolerance = 1e-10
		if math.Abs(result-expected) > tolerance {
			t.Errorf("Average(%v) = %.15f, expected %.15f", input, result, expected)
		}
	})
}
