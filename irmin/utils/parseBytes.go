package utils

import (
	"strconv"
	"strings"
)

const (
	// Binary units.

	KiB = 1 << 10 // 1024
	MiB = 1 << 20 // 1048576
	GiB = 1 << 30 // 1073741824

	// Decimal units.

	KB = 1000    // 10^3
	MB = 1000000 // 10^6
)

// parseNumberWithUnit parses a number string with an optional unit suffix.
func parseNumberWithUnit(s string) (float64, error) {
	if s == "" {
		return 1, nil // Handle case of just "B"
	}
	return strconv.ParseFloat(s, 64)
}

// ParseBytes converts a string with a unit (e.g. "9.602MiB", "1.05k", "53m", "1.05kb") to bytes.
// It supports both binary (e.g. KiB, MiB, GiB) and decimal units (e.g. k, m, gb).
//
// Parameters:
//   - s: the string representing the number and its unit.
//
// Returns:
//   - The number of bytes as a float64.
//   - An error if the conversion fails.
func ParseBytes(s string) (float64, error) {
	s = strings.TrimSpace(s)
	lower := strings.ToLower(s)

	// unitMap maps unit suffixes to their byte multipliers.
	var unitMap = map[string]float64{
		"gib": GiB,
		"mib": MiB,
		"kib": KiB,
		"kb":  KB,
		"k":   KB,
		"mb":  MB,
		"m":   MB,
		"b":   1,
	}

	// Check for known units
	for suffix, multiplier := range unitMap {
		if strings.HasSuffix(lower, suffix) {
			numberStr := strings.TrimSuffix(lower, suffix)
			val, err := parseNumberWithUnit(numberStr)
			if err != nil {
				return 0, err
			}
			return val * multiplier, nil
		}
	}

	// No recognised unit, assume the number is already in bytes
	return strconv.ParseFloat(s, 64)
}
