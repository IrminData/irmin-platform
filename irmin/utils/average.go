package utils

// Average computes the average value of a slice of float64 numbers.
// It returns an error if the slice is empty.
//
// Params:
//   - numbers: slice of float64 numbers
//
// Returns:
//   - float64: the average of the numbers
func Average(numbers []float64) float64 {
	// Check if the slice is empty
	if len(numbers) == 0 {
		return 0
	}

	sum := 0.0 // initialise sum
	// Loop over each number in the slice
	for _, num := range numbers {
		sum += num
	}
	// Calculate the average
	avg := sum / float64(len(numbers))
	return avg
}
