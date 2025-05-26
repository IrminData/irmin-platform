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
	TiB = 1 << 40 // 1099511627776
	PiB = 1 << 50 // 1125899906842624
	EiB = 1 << 60 // 1152921504606846976
	ZiB = 1 << 70 // 1180591620717411303424
	YiB = 1 << 80 // 1208925819614629174706176

	// Decimal units.

	KB = 1000                      // 10^3
	MB = 1000000                   // 10^6
	GB = 1000000000                // 10^9
	TB = 1000000000000             // 10^12
	PB = 1000000000000000          // 10^15
	EB = 1000000000000000000       // 10^18
	ZB = 1000000000000000000000    // 10^21
	YB = 1000000000000000000000000 // 10^24
)

// parseNumberWithUnit parses a number string with an optional unit suffix.
// It handles both integer and decimal numbers.
func parseNumberWithUnit(s string) (float64, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return 1, nil // Handle case of just "B"
	}

	// Handle negative numbers
	negative := false
	if strings.HasPrefix(s, "-") {
		negative = true
		s = strings.TrimPrefix(s, "-")
	}

	// Parse the number
	val, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return 0, err
	}

	if negative {
		val = -val
	}
	return val, nil
}

// findUnitAndValue attempts to find a unit suffix in the string and returns the unit and remaining number string.
func findUnitAndValue(s string, units []string) (string, string, bool) {
	for _, unit := range units {
		if strings.HasSuffix(s, unit) {
			return unit, strings.TrimSuffix(s, unit), true
		}
	}
	return "", s, false
}

// parseWithUnit attempts to parse a string with a given unit multiplier.
func parseWithUnit(numberStr string, unitMultiplier float64, negative bool) (float64, error) {
	val, err := parseNumberWithUnit(numberStr)
	if err != nil {
		// If parsing fails, try parsing the entire string as a number
		val, err = strconv.ParseFloat(numberStr, 64)
		if err != nil {
			return 0, err
		}
		return val, nil
	}
	if negative {
		val = -val
	}
	return val * unitMultiplier, nil
}

// ParseBytes converts a string with a unit (e.g. "9.602MiB", "1.05k", "53m", "1.05kb", "185.4mi", "2.5GB") to bytes.
// It supports both binary (e.g. KiB, MiB, GiB) and decimal units (e.g. k, m, gb, mi).
//
// Parameters:
//   - s: the string representing the number and its unit.
//
// Returns:
//   - The number of bytes as a float64.
//   - An error if the conversion fails.
func ParseBytes(s string) (float64, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0, nil
	}

	// Handle negative numbers
	negative := false
	if strings.HasPrefix(s, "-") {
		negative = true
		s = strings.TrimPrefix(s, "-")
	}

	lower := strings.ToLower(s)

	// unitMap maps unit suffixes to their byte multipliers.
	var unitMap = map[string]float64{
		// Binary units (preferred for Docker stats)
		"yib": YiB, "zib": ZiB, "eib": EiB, "pib": PiB, "tib": TiB,
		"gib": GiB, "mib": MiB, "kib": KiB, "mi": MiB, "k": KiB,

		// Decimal units (fallback)
		"yb": YB, "zb": ZB, "eb": EB, "pb": PB, "tb": TB,
		"gb": GB, "mb": MB, "kb": KB, "y": YB, "z": ZB,
		"e": EB, "p": PB, "t": TB, "g": GB, "m": MB, "b": 1,
	}

	// Try binary units first (more common in Docker stats)
	binaryUnits := []string{"mi", "k", "kib", "mib", "gib", "tib", "pib", "eib", "zib", "yib"}
	if unit, numberStr, found := findUnitAndValue(lower, binaryUnits); found {
		return parseWithUnit(numberStr, unitMap[unit], negative)
	}

	// Try decimal units
	decimalUnits := []string{"kb", "mb", "gb", "tb", "pb", "eb", "zb", "yb", "b"}
	if unit, numberStr, found := findUnitAndValue(lower, decimalUnits); found {
		return parseWithUnit(numberStr, unitMap[unit], negative)
	}

	// No recognised unit, assume the number is already in bytes
	val, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return 0, err
	}
	if negative {
		val = -val
	}
	return val, nil
}
