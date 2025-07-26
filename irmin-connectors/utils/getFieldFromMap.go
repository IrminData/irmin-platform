package utils

import "strconv"

// GetStringFromMap extracts a string value from a map with type conversion.
func GetStringFromMap(m map[string]any, key string, defaultValue string) string {
	if val, exists := m[key]; exists && val != nil {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return defaultValue
}

// GetIntFromMap extracts an integer value from a map with type conversion.
func GetIntFromMap(m map[string]any, key string, defaultValue int) int {
	val, exists := m[key]
	if !exists || val == nil {
		return defaultValue
	}

	if str, ok := val.(string); ok {
		if intVal, err := strconv.Atoi(str); err == nil {
			return intVal
		}
	}

	if intVal, ok := val.(int); ok {
		return intVal
	}

	if floatVal, ok := val.(float64); ok {
		return int(floatVal)
	}

	return defaultValue
}
