package utils

import (
	"fmt"
	"net/http"

	"github.com/gorilla/mux"
)

// ParseRouteParams extracts and returns the route variables for the given keys.
//
// Parameters:
// - r: The current HTTP request.
// - keys: A list of keys that are required to be present in the route.
//
// Returns:
// - A map containing the required route variables.
// - An error if one or more required variables are missing.
func ParseRouteParams(r *http.Request, keys []string) (map[string]string, error) {
	vars := mux.Vars(r)
	result := make(map[string]string)
	for _, key := range keys {
		if value, ok := vars[key]; ok {
			result[key] = value
		} else {
			return nil, fmt.Errorf("missing required route variable: %s", key)
		}
	}
	return result, nil
}
