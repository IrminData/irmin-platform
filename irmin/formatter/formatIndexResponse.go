package formatter

import "irmin-api/utils"

// FormatIndexResponse is a generic helper function to format index responses.
// It takes a slice of items, a formatter function, and returns a formatted response.
func FormatIndexResponse[T any, R any](
	items []T,
	formatter func(*T, *utils.SQIDManager) (*R, error),
	sqidManager *utils.SQIDManager,
) ([]R, error) {
	var response []R
	for _, item := range items {
		formattedItem, err := formatter(&item, sqidManager)
		if err != nil {
			return nil, err
		}
		response = append(response, *formattedItem)
	}
	if len(response) == 0 {
		return make([]R, 0), nil
	}
	return response, nil
}
