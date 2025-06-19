package utils

import "fmt"

// ConvertToStringMap converts a map[string]any to map[string]string for database compatibility.
func ConvertToStringMap(source map[string]any) map[string]string {
	result := make(map[string]string)
	for k, v := range source {
		if str, ok := v.(string); ok {
			result[k] = str
		} else {
			result[k] = fmt.Sprintf("%v", v)
		}
	}
	return result
}
