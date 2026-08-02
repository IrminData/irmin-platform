package utils

// ConvertToStringSlice converts a slice of ~string types to []string.
func ConvertToStringSlice[T ~string](source []T) []string {
	result := make([]string, len(source))
	for i, v := range source {
		result[i] = string(v)
	}
	return result
}
