package utils

import (
	"encoding/json"
	"fmt"
	"reflect"
)

const (
	// DefaultMaxJSONResponseSizeBytes is the default maximum JSON response size (5MB)
	DefaultMaxJSONResponseSizeBytes = 5 * 1024 * 1024

	// DefaultMaxBinaryResponseSizeBytes is the default maximum binary response size (20MB)
	DefaultMaxBinaryResponseSizeBytes = 20 * 1024 * 1024

	// DefaultMaxResponseSizeBytes is deprecated, use DefaultMaxJSONResponseSizeBytes or DefaultMaxBinaryResponseSizeBytes
	DefaultMaxResponseSizeBytes = DefaultMaxJSONResponseSizeBytes

	// bytesPerKB represents bytes in a kilobyte
	bytesPerKB = 1024
	// BytesPerMB represents bytes in a megabyte
	BytesPerMB = bytesPerKB * 1024

	// maxRowsBeforeSizeCheck is the hard limit on rows to prevent OOM when marshaling
	maxRowsBeforeSizeCheck = 10000
	// sampleSizeForEstimate is the number of rows to sample for size estimation
	sampleSizeForEstimate = 100
	// safeRowSizeThreshold is the minimum avg bytes per row to apply hard row limit
	// If avg row size is below this, many rows are safe to marshal without OOM risk
	safeRowSizeThreshold = 100
)

// LimitJSONResponseSizeResult contains the result of limiting JSON response size
type LimitJSONResponseSizeResult struct {
	Data       any    // The trimmed data (or original if not trimmed)
	LogMessage string // Log message to add to response logs
	WasTrimmed bool   // Whether the data was actually trimmed
}

// LimitJSONResponseSize checks if JSON-serializable data exceeds the size limit and attempts to trim it.
// It works with slice/array types. If the data is not a slice or cannot be trimmed,
// it returns a warning message.
//
// Note: This function is designed specifically for JSON responses (queries, scripts).
// For binary content (images, files), use CheckByteSizeLimit instead.
//
// Size is measured using JSON marshaling, which approximates the API response size.
// This is intentional - we're measuring the serialized payload size that will be sent over the wire.
//
// To prevent pathological cases where marshaling huge datasets would cause OOM,
// this function applies a hard row limit (10,000) before checking size.
//
// Parameters:
//   - data: The JSON-serializable data to check and potentially trim (must be a slice/array)
//   - maxSizeBytes: Maximum size in bytes
//
// Returns:
//   - LimitJSONResponseSizeResult with trimmed data, log message, and trimming status
//
//nolint:gocognit,funlen // Complexity and length justified by comprehensive edge case handling.
func LimitJSONResponseSize(data any, maxSizeBytes int64) LimitJSONResponseSizeResult {
	if data == nil {
		return LimitJSONResponseSizeResult{
			Data:       data,
			LogMessage: "",
			WasTrimmed: false,
		}
	}

	// Check if data is a slice or array (or pointer to one)
	val := reflect.ValueOf(data)

	// Handle pointer to slice/array
	if val.Kind() == reflect.Ptr {
		if val.IsNil() {
			return LimitJSONResponseSizeResult{
				Data:       data,
				LogMessage: "",
				WasTrimmed: false,
			}
		}
		val = val.Elem()
	}

	if val.Kind() != reflect.Slice && val.Kind() != reflect.Array {
		// Not a slice/array, check size and return error if too large
		dataJSON, err := json.Marshal(data)
		if err != nil {
			return LimitJSONResponseSizeResult{
				Data:       data,
				LogMessage: "",
				WasTrimmed: false,
			}
		}

		if int64(len(dataJSON)) > maxSizeBytes {
			sizeMB := float64(len(dataJSON)) / BytesPerMB
			maxSizeMB := float64(maxSizeBytes) / BytesPerMB
			errorMsg := fmt.Sprintf(
				"Response size (%.2f MB) exceeds limit (%.2f MB) and cannot be trimmed automatically. "+
					"Please modify your query to return less data or restructure the response as an array.",
				sizeMB,
				maxSizeMB,
			)
			// Return an error structure instead of the oversized data
			return LimitJSONResponseSizeResult{
				Data: map[string]string{
					"error":   "Response size limit exceeded",
					"message": errorMsg,
				},
				LogMessage: fmt.Sprintf(
					"Response blocked: Non-array data exceeds %.2f MB limit (%.2f MB). Data cannot be trimmed automatically.",
					maxSizeMB,
					sizeMB,
				),
				WasTrimmed: true, // Mark as trimmed since we replaced the data
			}
		}

		return LimitJSONResponseSizeResult{
			Data:       data,
			LogMessage: "",
			WasTrimmed: false,
		}
	}

	// Convert array to slice to avoid unaddressable array issues
	// reflect.Value.Slice() only works on slices and addressable arrays
	if val.Kind() == reflect.Array {
		// Create a slice from the array
		slice := reflect.MakeSlice(reflect.SliceOf(val.Type().Elem()), val.Len(), val.Len())
		reflect.Copy(slice, val)
		val = slice
		data = val.Interface()
	}

	// It's a slice/array - apply sample-based pre-check to prevent OOM
	originalLength := val.Len()
	if originalLength == 0 {
		return LimitJSONResponseSizeResult{
			Data:       data,
			LogMessage: "",
			WasTrimmed: false,
		}
	}

	// Determine how much data to check based on sampling
	dataToCheck, hardLimitApplied := determineSizeCheckData(
		val,
		data,
		originalLength,
		sampleSizeForEstimate,
		maxRowsBeforeSizeCheck,
		maxSizeBytes,
	)
	if hardLimitApplied {
		val = reflect.ValueOf(dataToCheck)
	}

	// Update currentLength after potential truncation - this is the actual length we can work with
	currentLength := val.Len()

	// Serialize to check size
	dataJSON, err := json.Marshal(dataToCheck)
	if err != nil {
		return LimitJSONResponseSizeResult{
			Data:       data,
			LogMessage: "",
			WasTrimmed: false,
		}
	}

	originalSizeBytes := int64(len(dataJSON))
	if originalSizeBytes <= maxSizeBytes {
		// Within limit after hard truncation (if any)
		if hardLimitApplied {
			return LimitJSONResponseSizeResult{
				Data: dataToCheck,
				LogMessage: fmt.Sprintf(
					"Response trimmed: %d items returned (original: %d items). Adaptive limit applied based on row size.",
					currentLength,
					originalLength,
				),
				WasTrimmed: true,
			}
		}
		// Within limit, no trimming needed
		return LimitJSONResponseSizeResult{
			Data:       data,
			LogMessage: "",
			WasTrimmed: false,
		}
	}

	// Need to trim - use binary search to find maximum number of elements that fit
	// Use currentLength (actual val.Len()) not originalLength to avoid slicing past bounds
	left, right := 1, currentLength
	bestFit := 0
	var lastMarshalError error

	for left <= right {
		mid := (left + right) / 2 //nolint:mnd // binary search requires division by 2

		// Create a slice with mid elements
		testSlice := val.Slice(0, mid).Interface()
		testJSON, marshalErr := json.Marshal(testSlice)
		if marshalErr != nil {
			// Store the error and break - we can't serialize this data
			lastMarshalError = marshalErr
			break
		}

		if int64(len(testJSON)) <= maxSizeBytes {
			bestFit = mid
			left = mid + 1
		} else {
			right = mid - 1
		}
	}

	originalSizeMB := float64(originalSizeBytes) / BytesPerMB
	maxSizeMB := float64(maxSizeBytes) / BytesPerMB

	// Check if we encountered a serialization error during binary search
	if lastMarshalError != nil {
		return LimitJSONResponseSizeResult{
			Data: data,
			LogMessage: fmt.Sprintf(
				"Warning: Unable to trim response (%.2f MB). Data serialization failed during size check: %v",
				originalSizeMB, lastMarshalError,
			),
			WasTrimmed: false,
		}
	}

	if bestFit > 0 && bestFit < currentLength {
		// We can fit some elements within the limit
		trimmedSlice := val.Slice(0, bestFit).Interface()
		trimmedJSON, marshalErr := json.Marshal(trimmedSlice)
		if marshalErr != nil {
			// This shouldn't happen since we just successfully marshaled in the loop,
			// but handle it gracefully
			return LimitJSONResponseSizeResult{
				Data: data,
				LogMessage: fmt.Sprintf(
					"Warning: Unable to trim response (%.2f MB). Final trim serialization failed: %v",
					originalSizeMB, marshalErr,
				),
				WasTrimmed: false,
			}
		}
		trimmedSizeMB := float64(len(trimmedJSON)) / BytesPerMB

		return LimitJSONResponseSizeResult{
			Data: trimmedSlice,
			LogMessage: fmt.Sprintf(
				"Response trimmed: %d items returned (original: %d items, %.2f MB → %.2f MB). Data size limited to prevent large responses.",
				bestFit,
				originalLength,
				originalSizeMB,
				trimmedSizeMB,
			),
			WasTrimmed: true,
		}
	} else if bestFit == 0 && currentLength > 0 {
		// Even a single element exceeds the limit - return empty slice with error
		emptySlice := reflect.MakeSlice(val.Type(), 0, 0).Interface()
		return LimitJSONResponseSizeResult{
			Data: emptySlice,
			LogMessage: fmt.Sprintf(
				"Response blocked: Single item exceeds %.2f MB limit (total: %.2f MB). Returned empty array.",
				maxSizeMB, originalSizeMB,
			),
			WasTrimmed: true, // Mark as trimmed since we replaced with empty slice
		}
	}

	// Fallback: return empty slice with error message
	emptySlice := reflect.MakeSlice(val.Type(), 0, 0).Interface()
	return LimitJSONResponseSizeResult{
		Data: emptySlice,
		LogMessage: fmt.Sprintf(
			"Response blocked: Response size (%.2f MB) exceeds limit (%.2f MB). Unable to trim response, returned empty array.",
			originalSizeMB,
			maxSizeMB,
		),
		WasTrimmed: true, // Mark as trimmed since we replaced with empty slice
	}
}

// CheckByteSizeLimit checks if byte content exceeds the size limit and returns
// an error message if it does. Returns nil if within limit.
//
// Parameters:
//   - content: The byte content to check
//   - maxSizeBytes: Maximum size in bytes
//
// Returns:
//   - []byte: Error message as bytes if limit exceeded, nil if within limit
func CheckByteSizeLimit(content []byte, maxSizeBytes int64) []byte {
	if int64(len(content)) <= maxSizeBytes {
		return nil
	}

	sizeMB := float64(len(content)) / BytesPerMB
	maxSizeMB := float64(maxSizeBytes) / BytesPerMB
	message := fmt.Sprintf(
		"File too large to display (%.2f MB). Maximum size: %.2f MB. Please download the file instead.",
		sizeMB,
		maxSizeMB,
	)
	return []byte(message)
}

// determineSizeCheckData samples data to estimate size and determines how much data to pre-check
// to avoid marshaling huge datasets. Returns the data to check and whether hard limit was applied.
func determineSizeCheckData(
	val reflect.Value,
	originalData any,
	originalLength int,
	sampleSize int,
	maxRows int,
	maxSizeBytes int64,
) (any, bool) {
	// First, check a small sample to detect extremely large rows
	if sampleSize > originalLength {
		sampleSize = originalLength
	}

	sampleData := val.Slice(0, sampleSize).Interface()
	sampleJSON, err := json.Marshal(sampleData)
	if err != nil {
		return originalData, false
	}

	sampleSizeBytes := int64(len(sampleJSON))

	// If even the sample exceeds the limit, return just the sample for aggressive trimming
	if sampleSizeBytes > maxSizeBytes {
		return sampleData, true
	}

	// Estimate total size based on sample
	avgBytesPerRow := float64(sampleSizeBytes) / float64(sampleSize)
	estimatedTotalSize := int64(avgBytesPerRow * float64(originalLength))

	// If estimated size suggests we'd exceed limits, pre-truncate based on size
	if estimatedTotalSize > maxSizeBytes {
		targetRows := calculateTargetRows(originalLength, maxRows, avgBytesPerRow, maxSizeBytes)
		return val.Slice(0, targetRows).Interface(), true
	}

	// Only apply hard row limit if the data is truly massive AND the estimated size is reasonable
	// This prevents OOM during marshaling while avoiding unnecessary truncation of many small rows
	// We only truncate when we have a huge row count (>maxRows) AND large average row size
	// indicating potential memory pressure during marshaling
	if originalLength > maxRows && avgBytesPerRow > safeRowSizeThreshold {
		return val.Slice(0, maxRows).Interface(), true
	}

	return originalData, false
}

// calculateTargetRows determines how many rows to include based on estimated size
func calculateTargetRows(originalLength, maxRows int, avgBytesPerRow float64, maxSizeBytes int64) int {
	targetRows := originalLength
	if originalLength > maxRows {
		targetRows = maxRows
	}
	// If even maxRows would be too large based on estimate, reduce further
	if avgBytesPerRow > 0 {
		estimatedRowsForLimit := int(float64(maxSizeBytes) / avgBytesPerRow)
		if estimatedRowsForLimit < targetRows {
			targetRows = max(estimatedRowsForLimit, 1)
		}
	}
	return targetRows
}
