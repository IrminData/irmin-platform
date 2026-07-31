package irmincore

import "fmt"

// APIError is returned when the Irmin API responds with a non-success HTTP status code.
// Use errors.As to extract it from wrapped errors.
type APIError struct {
	StatusCode int
	Body       string
}

// Error implements the error interface.
func (e *APIError) Error() string {
	return fmt.Sprintf("API request failed with status %d. Body: %s", e.StatusCode, e.Body)
}
