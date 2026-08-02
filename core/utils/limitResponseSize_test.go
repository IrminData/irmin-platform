package utils_test

import (
	"encoding/json"
	"fmt"
	"irmin-api/utils"
	"strings"
	"testing"
)

func TestLimitJSONResponseSize_NilData(t *testing.T) {
	result := utils.LimitJSONResponseSize(nil, utils.DefaultMaxJSONResponseSizeBytes)

	if result.Data != nil {
		t.Errorf("Expected nil data, got %v", result.Data)
	}
	if result.LogMessage != "" {
		t.Errorf("Expected empty log message, got %s", result.LogMessage)
	}
	if result.WasTrimmed {
		t.Errorf("Expected WasTrimmed to be false")
	}
}

func TestLimitJSONResponseSize_EmptySlice(t *testing.T) {
	data := []string{}
	result := utils.LimitJSONResponseSize(data, utils.DefaultMaxJSONResponseSizeBytes)

	if result.Data == nil {
		t.Errorf("Expected data to be returned, got nil")
	}
	if result.LogMessage != "" {
		t.Errorf("Expected empty log message, got %s", result.LogMessage)
	}
	if result.WasTrimmed {
		t.Errorf("Expected WasTrimmed to be false")
	}
}

func TestLimitJSONResponseSize_SmallSliceWithinLimit(t *testing.T) {
	data := []map[string]string{
		{"id": "1", "name": "test1"},
		{"id": "2", "name": "test2"},
		{"id": "3", "name": "test3"},
	}
	result := utils.LimitJSONResponseSize(data, utils.DefaultMaxJSONResponseSizeBytes)

	if result.Data == nil {
		t.Errorf("Expected data to be returned, got nil")
	}
	if result.LogMessage != "" {
		t.Errorf("Expected empty log message, got %s", result.LogMessage)
	}
	if result.WasTrimmed {
		t.Errorf("Expected WasTrimmed to be false")
	}
}

func TestLimitJSONResponseSize_LargeSliceNeedsTrimming(t *testing.T) {
	// Create a slice with many items to exceed 1KB limit
	data := make([]map[string]string, 100)
	for i := range data {
		data[i] = map[string]string{
			"id":          string(rune(i)),
			"name":        "test item with some content to make it larger",
			"description": "a longer description field to increase the size of each item",
		}
	}

	maxSize := int64(1024) // 1KB limit
	result := utils.LimitJSONResponseSize(data, maxSize)

	if result.Data == nil {
		t.Errorf("Expected trimmed data to be returned, got nil")
	}
	if result.LogMessage == "" {
		t.Errorf("Expected log message about trimming")
	}
	if !result.WasTrimmed {
		t.Errorf("Expected WasTrimmed to be true")
	}

	// Verify the result is a slice
	trimmedSlice, ok := result.Data.([]map[string]string)
	if !ok {
		t.Errorf("Expected result to be []map[string]string")
	}
	if len(trimmedSlice) >= len(data) {
		t.Errorf(
			"Expected trimmed slice to be smaller than original, got %d, original %d",
			len(trimmedSlice),
			len(data),
		)
	}
	if len(trimmedSlice) == 0 {
		t.Errorf("Expected at least some items in trimmed slice")
	}
}

func TestLimitJSONResponseSize_PointerToSlice(t *testing.T) {
	data := []string{"item1", "item2", "item3"}
	result := utils.LimitJSONResponseSize(&data, utils.DefaultMaxJSONResponseSizeBytes)

	if result.Data == nil {
		t.Errorf("Expected data to be returned, got nil")
	}
	if result.WasTrimmed {
		t.Errorf("Expected WasTrimmed to be false for small data")
	}
}

func TestLimitJSONResponseSize_NilPointer(t *testing.T) {
	var data *[]string
	result := utils.LimitJSONResponseSize(data, utils.DefaultMaxJSONResponseSizeBytes)

	if result.Data != data {
		t.Errorf("Expected original nil pointer to be returned")
	}
	if result.LogMessage != "" {
		t.Errorf("Expected empty log message, got %s", result.LogMessage)
	}
	if result.WasTrimmed {
		t.Errorf("Expected WasTrimmed to be false")
	}
}

func TestLimitJSONResponseSize_NonSliceWithinLimit(t *testing.T) {
	data := map[string]string{"key": "value"}
	result := utils.LimitJSONResponseSize(data, utils.DefaultMaxJSONResponseSizeBytes)

	if result.Data == nil {
		t.Errorf("Expected data to be returned, got nil")
	}
	if result.LogMessage != "" {
		t.Errorf("Expected empty log message, got %s", result.LogMessage)
	}
	if result.WasTrimmed {
		t.Errorf("Expected WasTrimmed to be false")
	}
}

func TestLimitJSONResponseSize_NonSliceExceedsLimit(t *testing.T) {
	// Create a large map that exceeds limit
	data := make(map[string]string)
	for i := range 10000 {
		data[string(rune(i))] = "some value with content to make it larger and exceed the limit"
	}

	maxSize := int64(1024) // 1KB limit
	result := utils.LimitJSONResponseSize(data, maxSize)

	if result.Data == nil {
		t.Errorf("Expected error data to be returned, got nil")
	}

	// Should return error structure instead of original data
	errorMap, ok := result.Data.(map[string]string)
	if !ok {
		t.Errorf("Expected result to be error map, got %T", result.Data)
	}
	if errorMap["error"] == "" {
		t.Errorf("Expected error field in result")
	}

	if result.LogMessage == "" {
		t.Errorf("Expected log message about blocking response")
	}
	if !result.WasTrimmed {
		t.Errorf("Expected WasTrimmed to be true when data is replaced with error")
	}
}

func TestLimitJSONResponseSize_SingleItemExceedsLimit(t *testing.T) {
	// Create a slice with one very large item
	largeString := make([]byte, 10000)
	for i := range largeString {
		largeString[i] = 'a'
	}

	data := []map[string]string{
		{"content": string(largeString)},
	}

	maxSize := int64(100) // 100 bytes limit
	result := utils.LimitJSONResponseSize(data, maxSize)

	if result.LogMessage == "" {
		t.Errorf("Expected log message about blocking response")
	}
	if !result.WasTrimmed {
		t.Errorf("Expected WasTrimmed to be true when data is replaced with empty slice")
	}

	// Should return empty slice instead of oversized data
	resultSlice, ok := result.Data.([]map[string]string)
	if !ok {
		t.Errorf("Expected result to be []map[string]string, got %T", result.Data)
	}
	if len(resultSlice) != 0 {
		t.Errorf("Expected empty slice when single item exceeds limit, got length %d", len(resultSlice))
	}
}

func TestLimitJSONResponseSize_HardLimitApplied(t *testing.T) {
	// Create a very large slice that exceeds maxRowsBeforeSizeCheck (10,000)
	// but with tiny rows that fit within the size limit
	data := make([]map[string]int, 15000)
	for i := range data {
		data[i] = map[string]int{"value": i}
	}

	result := utils.LimitJSONResponseSize(data, utils.DefaultMaxJSONResponseSizeBytes)

	if result.Data == nil {
		t.Errorf("Expected data to be returned, got nil")
	}

	// With tiny rows, the data should NOT be trimmed even though it exceeds maxRowsBeforeSizeCheck
	// because the estimated total size is within the limit
	trimmedSlice, ok := result.Data.([]map[string]int)
	if !ok {
		t.Errorf("Expected result to be []map[string]int")
	}

	// The fix ensures we don't apply row limit when size estimate shows data fits
	if len(trimmedSlice) != len(data) {
		t.Errorf("Expected all %d rows to be returned (tiny rows fit within size limit), got %d rows",
			len(data), len(trimmedSlice))
	}

	if result.WasTrimmed {
		t.Errorf("Expected WasTrimmed to be false - data fits within size limit despite high row count")
	}
}

func TestLimitJSONResponseSize_HardLimitAppliedWithLargerRows(t *testing.T) {
	// Create a very large slice with larger rows that exceeds both maxRowsBeforeSizeCheck
	// AND has average row size > safeRowSizeThreshold
	data := make([]map[string]string, 15000)
	for i := range data {
		// Each row is ~200 bytes (above the 100 byte threshold)
		data[i] = map[string]string{
			"id":   fmt.Sprintf("item_%d", i),
			"data": strings.Repeat("x", 150),
		}
	}

	result := utils.LimitJSONResponseSize(data, utils.DefaultMaxJSONResponseSizeBytes)

	if result.Data == nil {
		t.Errorf("Expected data to be returned, got nil")
	}

	// With larger rows (>100 bytes avg) and >10,000 rows, should apply hard limit
	trimmedSlice, ok := result.Data.([]map[string]string)
	if !ok {
		t.Errorf("Expected result to be []map[string]string")
	}

	if len(trimmedSlice) >= len(data) {
		t.Errorf("Expected trimmed slice due to hard row limit with large rows, got %d rows", len(trimmedSlice))
	}

	if len(trimmedSlice) > 10000 {
		t.Errorf("Expected at most 10000 rows (hard limit), got %d rows", len(trimmedSlice))
	}

	if !result.WasTrimmed {
		t.Errorf("Expected WasTrimmed to be true for large dataset with substantial rows")
	}
}

func TestLimitJSONResponseSize_SliceComparisonSafe(t *testing.T) {
	// This test verifies the bug fix - comparing interface values with slice types
	// should not panic. This is a regression test for the slice comparison issue.
	data := []string{"item1", "item2", "item3"}

	// This should not panic
	defer func() {
		if r := recover(); r != nil {
			t.Errorf("LimitJSONResponseSize panicked: %v", r)
		}
	}()

	result := utils.LimitJSONResponseSize(data, utils.DefaultMaxJSONResponseSizeBytes)

	if result.Data == nil {
		t.Errorf("Expected data to be returned, got nil")
	}
}

func TestCheckByteSizeLimit_WithinLimit(t *testing.T) {
	content := []byte("small content")
	result := utils.CheckByteSizeLimit(content, utils.DefaultMaxBinaryResponseSizeBytes)

	if result != nil {
		t.Errorf("Expected nil for content within limit, got %s", string(result))
	}
}

func TestCheckByteSizeLimit_ExceedsLimit(t *testing.T) {
	content := make([]byte, 10000)
	for i := range content {
		content[i] = 'a'
	}

	maxSize := int64(1024) // 1KB limit
	result := utils.CheckByteSizeLimit(content, maxSize)

	if result == nil {
		t.Errorf("Expected error message for content exceeding limit")
	}

	message := string(result)
	if message == "" {
		t.Errorf("Expected non-empty error message")
	}
}

func TestCheckByteSizeLimit_ExactLimit(t *testing.T) {
	content := make([]byte, 1024)
	maxSize := int64(1024)
	result := utils.CheckByteSizeLimit(content, maxSize)

	if result != nil {
		t.Errorf("Expected nil for content at exact limit, got %s", string(result))
	}
}

func TestCheckByteSizeLimit_OneByteOver(t *testing.T) {
	content := make([]byte, 1025)
	maxSize := int64(1024)
	result := utils.CheckByteSizeLimit(content, maxSize)

	if result == nil {
		t.Errorf("Expected error message for content one byte over limit")
	}
}

func TestCheckByteSizeLimit_EmptyContent(t *testing.T) {
	content := []byte{}
	result := utils.CheckByteSizeLimit(content, utils.DefaultMaxBinaryResponseSizeBytes)

	if result != nil {
		t.Errorf("Expected nil for empty content, got %s", string(result))
	}
}

func TestConstants(t *testing.T) {
	// Verify constants are as expected
	if utils.DefaultMaxJSONResponseSizeBytes != 5*1024*1024 {
		t.Errorf("DefaultMaxJSONResponseSizeBytes should be 5MB, got %d", utils.DefaultMaxJSONResponseSizeBytes)
	}

	if utils.DefaultMaxBinaryResponseSizeBytes != 20*1024*1024 {
		t.Errorf("DefaultMaxBinaryResponseSizeBytes should be 20MB, got %d", utils.DefaultMaxBinaryResponseSizeBytes)
	}

	if utils.DefaultMaxResponseSizeBytes != utils.DefaultMaxJSONResponseSizeBytes {
		t.Errorf("DefaultMaxResponseSizeBytes should equal DefaultMaxJSONResponseSizeBytes for backward compatibility")
	}

	if utils.BytesPerMB != 1024*1024 {
		t.Errorf("BytesPerMB should be 1048576, got %d", utils.BytesPerMB)
	}
}

func TestLimitJSONResponseSize_PointerToArray(t *testing.T) {
	// Test with pointer to array - this is addressable and works
	data := [3]string{"item1", "item2", "item3"}
	result := utils.LimitJSONResponseSize(&data, utils.DefaultMaxJSONResponseSizeBytes)

	if result.Data == nil {
		t.Errorf("Expected data to be returned, got nil")
	}
	if result.WasTrimmed {
		t.Errorf("Expected WasTrimmed to be false for small array")
	}
}

func TestLimitJSONResponseSize_ArrayByValue(t *testing.T) {
	// Test with array passed by value (unaddressable) - should not panic
	data := [5]string{"item1", "item2", "item3", "item4", "item5"}

	// This should not panic even though the array is unaddressable
	defer func() {
		if r := recover(); r != nil {
			t.Errorf("LimitJSONResponseSize panicked with unaddressable array: %v", r)
		}
	}()

	result := utils.LimitJSONResponseSize(data, utils.DefaultMaxJSONResponseSizeBytes)

	if result.Data == nil {
		t.Errorf("Expected data to be returned, got nil")
	}
	if result.WasTrimmed {
		t.Errorf("Expected WasTrimmed to be false for small array")
	}
}

func TestLimitJSONResponseSize_ArrayByValueNeedsTrimming(t *testing.T) {
	// Create an array with items that exceed the size limit when passed by value
	data := [50]map[string]string{}
	for i := range data {
		data[i] = map[string]string{
			"id":          string(rune(i)),
			"name":        "test item with some content to make it larger",
			"description": "a longer description field to increase the size of each item",
		}
	}

	maxSize := int64(1024) // 1KB limit

	// This should not panic
	defer func() {
		if r := recover(); r != nil {
			t.Errorf("LimitJSONResponseSize panicked with array needing trimming: %v", r)
		}
	}()

	result := utils.LimitJSONResponseSize(data, maxSize)

	if result.Data == nil {
		t.Errorf("Expected trimmed data to be returned, got nil")
	}
	if !result.WasTrimmed {
		t.Errorf("Expected WasTrimmed to be true for large array")
	}

	// Verify the result is properly converted to slice
	switch trimmed := result.Data.(type) {
	case []map[string]string:
		if len(trimmed) >= len(data) {
			t.Errorf("Expected trimmed result to be smaller than original array")
		}
	default:
		t.Errorf("Expected result to be []map[string]string, got %T", result.Data)
	}
}

func TestLimitJSONResponseSize_EmptyArray(t *testing.T) {
	// Test with empty array
	data := [0]string{}

	result := utils.LimitJSONResponseSize(data, utils.DefaultMaxJSONResponseSizeBytes)

	if result.Data == nil {
		t.Errorf("Expected data to be returned, got nil")
	}
	if result.LogMessage != "" {
		t.Errorf("Expected empty log message, got %s", result.LogMessage)
	}
	if result.WasTrimmed {
		t.Errorf("Expected WasTrimmed to be false for empty array")
	}
}

func TestLimitJSONResponseSize_BinarySearch(t *testing.T) {
	// Create data that requires binary search to find optimal trim point
	data := make([]map[string]string, 50)
	for i := range data {
		// Create progressively larger items
		content := make([]byte, 100+i*10)
		for j := range content {
			content[j] = 'x'
		}
		data[i] = map[string]string{
			"id":      string(rune(i)),
			"content": string(content),
		}
	}

	maxSize := int64(5000) // 5KB limit
	result := utils.LimitJSONResponseSize(data, maxSize)

	if !result.WasTrimmed {
		t.Errorf("Expected data to be trimmed")
	}

	trimmedSlice, ok := result.Data.([]map[string]string)
	if !ok {
		t.Errorf("Expected result to be []map[string]string")
	}
	if len(trimmedSlice) == 0 {
		t.Errorf("Expected at least some items after binary search trim")
	}
	if len(trimmedSlice) >= len(data) {
		t.Errorf("Expected trimmed result to be smaller than original")
	}
}

func TestLimitJSONResponseSize_ByteSliceMarshalsAsBase64(t *testing.T) {
	// Binary data ([]byte) gets base64-encoded during JSON marshaling
	// This is expected JSON behavior and the limiter should handle it
	binaryData := make([]byte, 1000)
	for i := range binaryData {
		binaryData[i] = byte(i % 256)
	}

	// Wrap in a struct to simulate typical JSON response
	data := []map[string]any{
		{"content": binaryData},
	}

	result := utils.LimitJSONResponseSize(data, utils.DefaultMaxJSONResponseSizeBytes)

	if result.Data == nil {
		t.Errorf("Expected data to be returned, got nil")
	}
	// Should handle base64 encoding during marshal
}

func TestLimitJSONResponseSize_NonMarshallableStruct(t *testing.T) {
	// Create a type that cannot be JSON marshaled (contains channel)
	type NonMarshallable struct {
		Name    string
		Channel chan int
	}

	data := []NonMarshallable{
		{Name: "test", Channel: make(chan int)},
	}

	result := utils.LimitJSONResponseSize(data, utils.DefaultMaxJSONResponseSizeBytes)

	// Should return original data without error since marshaling fails
	if result.Data == nil {
		t.Errorf("Expected original data to be returned even if non-marshallable")
	}
	if result.WasTrimmed {
		t.Errorf("Expected WasTrimmed to be false for non-marshallable data")
	}
}

func TestLimitJSONResponseSize_MixedBinaryAndTextInSlice(t *testing.T) {
	// Slice with mix of text and binary-like data
	data := []map[string]any{
		{"type": "text", "content": "Hello World"},
		{"type": "binary", "content": []byte{0x00, 0x01, 0x02, 0xFF}},
		{"type": "text", "content": "Another text"},
	}

	result := utils.LimitJSONResponseSize(data, utils.DefaultMaxJSONResponseSizeBytes)

	if result.Data == nil {
		t.Errorf("Expected data to be returned, got nil")
	}
	// Should successfully handle mixed content
}

func TestLimitJSONResponseSize_LargeBinaryInSlice(t *testing.T) {
	// Create slice with large binary data that needs trimming
	data := make([]map[string]any, 100)
	for i := range data {
		// Each item has 10KB of binary data
		binaryContent := make([]byte, 10*1024)
		for j := range binaryContent {
			binaryContent[j] = byte(j % 256)
		}
		data[i] = map[string]any{
			"id":      i,
			"content": binaryContent,
		}
	}

	maxSize := int64(50 * 1024) // 50KB limit
	result := utils.LimitJSONResponseSize(data, maxSize)

	if result.Data == nil {
		t.Errorf("Expected data to be returned, got nil")
	}
	// Note: base64 encoding inflates size by ~33%, so trimming will account for that
	if result.WasTrimmed {
		trimmedSlice, ok := result.Data.([]map[string]any)
		if ok && len(trimmedSlice) >= len(data) {
			t.Errorf("Expected trimmed result to be smaller than original")
		}
	}
}

func TestLimitJSONResponseSize_EmptyByteSlice(t *testing.T) {
	data := []map[string]any{
		{"content": []byte{}},
		{"content": []byte{}},
	}

	result := utils.LimitJSONResponseSize(data, utils.DefaultMaxJSONResponseSizeBytes)

	if result.Data == nil {
		t.Errorf("Expected data to be returned, got nil")
	}
	if result.WasTrimmed {
		t.Errorf("Expected WasTrimmed to be false for empty byte slices")
	}
}

func TestLimitJSONResponseSize_NilByteSliceInStruct(t *testing.T) {
	type DataWithBytes struct {
		Name    string
		Content []byte
	}

	data := []DataWithBytes{
		{Name: "test1", Content: nil},
		{Name: "test2", Content: nil},
	}

	result := utils.LimitJSONResponseSize(data, utils.DefaultMaxJSONResponseSizeBytes)

	if result.Data == nil {
		t.Errorf("Expected data to be returned, got nil")
	}
	if result.WasTrimmed {
		t.Errorf("Expected WasTrimmed to be false")
	}
}

func TestLimitJSONResponseSize_JSONWithEscapedCharacters(t *testing.T) {
	// Test data that requires heavy escaping in JSON (affects size calculation)
	data := []map[string]string{
		{"content": "Line 1\nLine 2\nLine 3\nLine 4"},
		{"content": "Quotes: \"test\" and backslash: \\"},
		{"content": "Unicode: \u0000\u0001\u0002"},
	}

	result := utils.LimitJSONResponseSize(data, utils.DefaultMaxJSONResponseSizeBytes)

	if result.Data == nil {
		t.Errorf("Expected data to be returned, got nil")
	}
	// Should handle escaped characters during JSON marshaling
}

func TestLimitJSONResponseSize_NestedStructuresWithBinary(t *testing.T) {
	// Deeply nested structures with binary data
	type NestedData struct {
		Level1 map[string]any
	}

	binaryData := make([]byte, 500)
	for i := range binaryData {
		binaryData[i] = byte(i % 256)
	}

	data := []NestedData{
		{
			Level1: map[string]any{
				"level2": map[string]any{
					"level3": map[string]any{
						"binary": binaryData,
						"text":   "nested text",
					},
				},
			},
		},
	}

	result := utils.LimitJSONResponseSize(data, utils.DefaultMaxJSONResponseSizeBytes)

	if result.Data == nil {
		t.Errorf("Expected data to be returned, got nil")
	}
}

func TestCheckByteSizeLimit_BinaryContent(t *testing.T) {
	// Test with actual binary content (not text)
	content := make([]byte, 2048)
	for i := range content {
		content[i] = byte(i % 256)
	}

	maxSize := int64(1024)
	result := utils.CheckByteSizeLimit(content, maxSize)

	if result == nil {
		t.Errorf("Expected error message for binary content exceeding limit")
	}

	message := string(result)
	if message == "" {
		t.Errorf("Expected non-empty error message")
	}
}

func TestCheckByteSizeLimit_ImageLikeData(t *testing.T) {
	// Simulate image-like binary data with PNG header
	content := make([]byte, 10000)
	// PNG magic number
	content[0] = 0x89
	content[1] = 0x50
	content[2] = 0x4E
	content[3] = 0x47
	// Fill rest with binary data
	for i := 4; i < len(content); i++ {
		content[i] = byte(i % 256)
	}

	maxSize := int64(5000)
	result := utils.CheckByteSizeLimit(content, maxSize)

	if result == nil {
		t.Errorf("Expected error message for image-like content exceeding limit")
	}
}

// TestLimitJSONResponseSize_NonSliceOverLimitDoesNotReturnOversizedData verifies the fix for:
// "When LimitJSONResponseSize can't reduce size (e.g., non-slice data over limit),
// it should not return the original oversized data"
func TestLimitJSONResponseSize_NonSliceOverLimitDoesNotReturnOversizedData(t *testing.T) {
	// Create oversized non-slice data
	largeMap := make(map[string]string)
	for i := range 5000 {
		key := fmt.Sprintf("key_%d", i)
		largeMap[key] = "some long value that takes up space in the JSON representation to exceed the limit"
	}

	maxSize := int64(1024) // 1KB limit
	result := utils.LimitJSONResponseSize(largeMap, maxSize)

	// Verify the result is an error structure, not the original oversized data
	errorData, ok := result.Data.(map[string]string)
	if !ok {
		t.Fatalf("Expected error map structure, got %T", result.Data)
	}

	if errorData["error"] != "Response size limit exceeded" {
		t.Errorf("Expected error field with correct message, got: %s", errorData["error"])
	}

	if !result.WasTrimmed {
		t.Errorf("Expected WasTrimmed to be true when oversized data is replaced")
	}

	// Verify the replacement data is within limit
	resultJSON, err := json.Marshal(result.Data)
	if err != nil {
		t.Fatalf("Failed to marshal result data: %v", err)
	}

	if int64(len(resultJSON)) > maxSize {
		t.Errorf("Result data still exceeds limit: %d bytes > %d bytes limit", len(resultJSON), maxSize)
	}
}

// TestLimitJSONResponseSize_SingleItemOverLimitReturnsEmptySlice verifies the fix for:
// "When bestFit == 0 (single item too large), should return empty slice instead of oversized data"
func TestLimitJSONResponseSize_SingleItemOverLimitReturnsEmptySlice(t *testing.T) {
	// Create a slice with a single oversized item
	largeContent := strings.Repeat("x", 50000) // 50KB of data
	data := []map[string]string{
		{"content": largeContent},
	}

	maxSize := int64(1024) // 1KB limit
	result := utils.LimitJSONResponseSize(data, maxSize)

	// Should return empty slice, not the oversized data
	resultSlice, ok := result.Data.([]map[string]string)
	if !ok {
		t.Fatalf("Expected slice type, got %T", result.Data)
	}

	if len(resultSlice) != 0 {
		t.Errorf("Expected empty slice, got %d items", len(resultSlice))
	}

	if !result.WasTrimmed {
		t.Errorf("Expected WasTrimmed to be true when data is replaced with empty slice")
	}

	// Verify the replacement data is within limit
	resultJSON, err := json.Marshal(result.Data)
	if err != nil {
		t.Fatalf("Failed to marshal result data: %v", err)
	}

	if int64(len(resultJSON)) > maxSize {
		t.Errorf("Result data exceeds limit: %d bytes > %d bytes limit", len(resultJSON), maxSize)
	}
}

// TestLimitJSONResponseSize_AlwaysRespectsLimit verifies that the function never returns
// data exceeding maxSizeBytes when limitResponse is enabled
func TestLimitJSONResponseSize_AlwaysRespectsLimit(t *testing.T) {
	testCases := []struct {
		name     string
		data     any
		maxSize  int64
		dataType string
	}{
		{
			name: "Large map",
			data: func() map[string]string {
				m := make(map[string]string)
				for i := range 10000 {
					m[fmt.Sprintf("key_%d", i)] = "value with some content"
				}
				return m
			}(),
			maxSize:  1024,
			dataType: "non-slice",
		},
		{
			name: "Single oversized item in slice",
			data: []map[string]string{
				{"data": strings.Repeat("x", 100000)},
			},
			maxSize:  1024,
			dataType: "slice with large item",
		},
		{
			name: "Multiple oversized items",
			data: []map[string]any{
				{"data": strings.Repeat("a", 10000)},
				{"data": strings.Repeat("b", 10000)},
				{"data": strings.Repeat("c", 10000)},
			},
			maxSize:  1024,
			dataType: "slice with multiple large items",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := utils.LimitJSONResponseSize(tc.data, tc.maxSize)

			// Marshal the result to check actual size
			resultJSON, err := json.Marshal(result.Data)
			if err != nil {
				t.Fatalf("Failed to marshal result: %v", err)
			}

			resultSize := int64(len(resultJSON))
			if resultSize > tc.maxSize {
				t.Errorf(
					"%s: Result size %d bytes exceeds limit %d bytes. "+
						"LimitJSONResponseSize must always respect the size limit.",
					tc.dataType, resultSize, tc.maxSize,
				)
			}

			// Log for visibility
			t.Logf("%s: Original would exceed %d bytes, result is %d bytes (WasTrimmed: %v)",
				tc.dataType, tc.maxSize, resultSize, result.WasTrimmed)
		})
	}
}

// TestLimitJSONResponseSize_ManyTinyRowsWithinSizeLimit verifies the fix for:
// "LimitJSONResponseSize should not truncate data based solely on row count
// if the full dataset would serialize under maxSizeBytes"
// This test ensures that many tiny rows (e.g., 15,000 rows that serialize to 2MB)
// are not truncated to 10,000 rows when the size limit is 5MB.
func TestLimitJSONResponseSize_ManyTinyRowsWithinSizeLimit(t *testing.T) {
	// Create 15,000 tiny rows - each row is just {"i": N}
	// This creates about ~160KB of JSON (well under 5MB), but exceeds maxRowsBeforeSizeCheck (10,000)
	data := make([]map[string]int, 15000)
	for i := range data {
		data[i] = map[string]int{"i": i}
	}

	// Marshal to verify actual size
	originalJSON, err := json.Marshal(data)
	if err != nil {
		t.Fatalf("Failed to marshal test data: %v", err)
	}
	originalSize := int64(len(originalJSON))

	// Verify our test data is actually under the limit
	if originalSize > utils.DefaultMaxJSONResponseSizeBytes {
		t.Fatalf(
			"Test data is too large (%d bytes). This test requires data under %d bytes.",
			originalSize, utils.DefaultMaxJSONResponseSizeBytes,
		)
	}

	t.Logf("Test data: 15,000 rows, %d bytes (limit: %d bytes)",
		originalSize, utils.DefaultMaxJSONResponseSizeBytes)

	// Call LimitJSONResponseSize with the default 5MB limit
	result := utils.LimitJSONResponseSize(data, utils.DefaultMaxJSONResponseSizeBytes)

	// The function should NOT trim the data because the estimated size is within the limit
	if result.WasTrimmed {
		resultSlice, ok := result.Data.([]map[string]int)
		if !ok {
			t.Fatalf("Expected result to be []map[string]int, got %T", result.Data)
		}

		t.Errorf(
			"Data was incorrectly trimmed: returned %d rows instead of %d rows. "+
				"Original size (%d bytes) is well under limit (%d bytes). "+
				"The function should not apply row-based truncation when size-based limit is satisfied.",
			len(resultSlice),
			len(data),
			originalSize,
			utils.DefaultMaxJSONResponseSizeBytes,
		)

		t.Logf("Log message: %s", result.LogMessage)
	}

	// Verify the full dataset was returned
	resultSlice, ok := result.Data.([]map[string]int)
	if !ok {
		t.Fatalf("Expected result to be []map[string]int, got %T", result.Data)
	}

	if len(resultSlice) != len(data) {
		t.Errorf(
			"Expected all %d rows to be returned, got %d rows. "+
				"Data should not be truncated when it fits within size limit.",
			len(data),
			len(resultSlice),
		)
	}

	t.Logf("✓ Correctly returned all %d rows without trimming", len(resultSlice))
}
