package utils

import (
	"fmt"
	"strconv"
)

// ConvertStringToType attempts to convert a string value to match the type of the reference value.
// Returns an error if the conversion fails, ensuring early failure detection.
func ConvertStringToType(stringValue string, referenceValue any) (any, error) {
	if referenceValue == nil {
		return stringValue, nil
	}

	switch referenceValue.(type) {
	case int:
		val, err := strconv.Atoi(stringValue)
		if err != nil {
			return nil, fmt.Errorf("cannot convert %q to int: %w", stringValue, err)
		}
		return val, nil
	case int32:
		val, err := strconv.ParseInt(stringValue, 10, 32)
		if err != nil {
			return nil, fmt.Errorf("cannot convert %q to int32: %w", stringValue, err)
		}
		return int32(val), nil
	case int64:
		val, err := strconv.ParseInt(stringValue, 10, 64)
		if err != nil {
			return nil, fmt.Errorf("cannot convert %q to int64: %w", stringValue, err)
		}
		return val, nil
	case float32:
		val, err := strconv.ParseFloat(stringValue, 32)
		if err != nil {
			return nil, fmt.Errorf("cannot convert %q to float32: %w", stringValue, err)
		}
		return float32(val), nil
	case float64:
		val, err := strconv.ParseFloat(stringValue, 64)
		if err != nil {
			return nil, fmt.Errorf("cannot convert %q to float64: %w", stringValue, err)
		}
		return val, nil
	case bool:
		val, err := strconv.ParseBool(stringValue)
		if err != nil {
			return nil, fmt.Errorf("cannot convert %q to bool: %w", stringValue, err)
		}
		return val, nil
	case string:
		// String to string conversion always succeeds
		return stringValue, nil
	}

	// For unknown/unsupported types, return the string value (no error for compatibility)
	return stringValue, nil
}
