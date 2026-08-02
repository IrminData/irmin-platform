package utils

import (
	"encoding/base64"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	irminutils "github.com/IrminData/irmin-platform/sdks/go/utils"
)

// IsBinaryContentType checks if the given content type indicates binary data.
// Returns true if the content type should be treated as binary.
// It delegates to the unified MIME utility in the Go SDK.
func IsBinaryContentType(contentType *string) bool {
	if contentType == nil || *contentType == "" {
		return false
	}
	return irminutils.IsBinaryMimeType(*contentType)
}

// DecodePatchValue decodes the value of a patch operation.
// If the patch has a binary content type, it decodes the base64-encoded value.
// Returns:
//   - decoded: the decoded bytes (or original value bytes for non-binary)
//   - isBinary: true if this was binary content
//   - err: any error that occurred during decoding
func DecodePatchValue(op irminmodels.PatchOperation) ([]byte, bool, error) {
	if op.Value == nil {
		return nil, false, nil
	}

	// Check if this is binary content
	if IsBinaryContentType(op.ContentType) {
		// Value should be a base64-encoded string
		strValue, ok := (*op.Value).(string)
		if !ok {
			// If not a string, return the value as-is
			return nil, false, nil
		}

		// Decode base64
		decoded, err := base64.StdEncoding.DecodeString(strValue)
		if err != nil {
			return nil, true, err
		}

		return decoded, true, nil
	}

	return nil, false, nil
}

// DecodeBinaryValue decodes a base64-encoded binary value from a patch operation.
// It first checks if the content type indicates binary data. If not binary,
// returns the original value unchanged.
// Returns:
//   - decoded: the decoded value ([]byte for binary, original value otherwise)
//   - isBinary: true if this was binary content that was decoded
//   - err: any error that occurred during decoding
func DecodeBinaryValue(contentType *string, value any) (any, bool, error) {
	// Only decode if content type indicates binary data
	if !IsBinaryContentType(contentType) {
		return value, false, nil
	}

	// Value should be a base64-encoded string for binary content
	strValue, ok := value.(string)
	if !ok {
		// If not a string, return as-is (might be already decoded or a different format)
		return value, false, nil
	}

	// Decode the base64 string to bytes
	decoded, err := base64.StdEncoding.DecodeString(strValue)
	if err != nil {
		return nil, true, err
	}

	return decoded, true, nil
}
