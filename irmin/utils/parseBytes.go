package utils

import (
	"strconv"
	"strings"
)

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
	switch {
	case strings.HasSuffix(lower, "gib"):
		numberStr := strings.TrimSuffix(lower, "gib")
		val, err := strconv.ParseFloat(numberStr, 64) // Parse the numeric part.
		if err != nil {
			return 0, err
		}
		return val * 1073741824, nil // Multiply by 2^30.
	case strings.HasSuffix(lower, "mib"):
		numberStr := strings.TrimSuffix(lower, "mib")
		val, err := strconv.ParseFloat(numberStr, 64)
		if err != nil {
			return 0, err
		}
		return val * 1048576, nil // Multiply by 2^20.
	case strings.HasSuffix(lower, "kib"):
		numberStr := strings.TrimSuffix(lower, "kib")
		val, err := strconv.ParseFloat(numberStr, 64)
		if err != nil {
			return 0, err
		}
		return val * 1024, nil // Multiply by 2^10.
	case strings.HasSuffix(lower, "kb"):
		numberStr := strings.TrimSuffix(lower, "kb")
		val, err := strconv.ParseFloat(numberStr, 64)
		if err != nil {
			return 0, err
		}
		return val * 1000, nil // Decimal multiplier.
	case strings.HasSuffix(lower, "k"):
		numberStr := strings.TrimSuffix(lower, "k")
		val, err := strconv.ParseFloat(numberStr, 64)
		if err != nil {
			return 0, err
		}
		return val * 1000, nil
	// New case for megabytes (decimal)
	case strings.HasSuffix(lower, "mb"):
		numberStr := strings.TrimSuffix(lower, "mb")
		val, err := strconv.ParseFloat(numberStr, 64)
		if err != nil {
			return 0, err
		}
		return val * 1000000, nil // Decimal multiplier for megabytes.
	// New case for "m" suffix, also treated as megabytes.
	case strings.HasSuffix(lower, "m"):
		numberStr := strings.TrimSuffix(lower, "m")
		val, err := strconv.ParseFloat(numberStr, 64)
		if err != nil {
			return 0, err
		}
		return val * 1000000, nil
	case strings.HasSuffix(lower, "b"):
		numberStr := strings.TrimSuffix(lower, "b")
		// If empty, assume it's "1B"
		if numberStr == "" {
			return 1, nil
		}
		return strconv.ParseFloat(numberStr, 64)
	default:
		// No recognised unit, assume the number is already in bytes.
		return strconv.ParseFloat(s, 64)
	}
}
