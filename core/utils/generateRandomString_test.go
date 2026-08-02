package utils_test

import (
	"irmin-api/utils"
	"regexp"
	"testing"
)

func TestGenerateRandomString(t *testing.T) {
	tests := []struct {
		name string
	}{
		{"generates random string"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := utils.GenerateRandomString()

			if err != nil {
				t.Errorf("GenerateRandomString() returned error: %v", err)
			}

			if len(result) != 64 {
				t.Errorf("GenerateRandomString() returned string of length %d, expected 64", len(result))
			}

			hexPattern := regexp.MustCompile("^[a-f0-9]{64}$")
			if !hexPattern.MatchString(result) {
				t.Errorf("GenerateRandomString() returned invalid hex string: %s", result)
			}
		})
	}
}

func TestGenerateRandomStringUniqueness(t *testing.T) {
	const iterations = 100
	results := make(map[string]bool)

	for range iterations {
		result, err := utils.GenerateRandomString()
		if err != nil {
			t.Fatalf("GenerateRandomString() returned error: %v", err)
		}

		if results[result] {
			t.Errorf("GenerateRandomString() returned duplicate string: %s", result)
		}
		results[result] = true
	}

	if len(results) != iterations {
		t.Errorf("Expected %d unique strings, got %d", iterations, len(results))
	}
}
