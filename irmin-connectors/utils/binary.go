package utils

import (
	"encoding/base64"
	"strings"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// binaryContentTypes is a list of MIME types that should be treated as binary data.
//
//nolint:gochecknoglobals // Package-level lookup table for efficiency
var binaryContentTypes = map[string]bool{
	// Images
	"image/png":     true,
	"image/jpeg":    true,
	"image/gif":     true,
	"image/webp":    true,
	"image/svg+xml": true,
	"image/bmp":     true,
	"image/tiff":    true,
	"image/x-icon":  true,

	// Documents
	"application/pdf":    true,
	"application/msword": true,
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
	"application/vnd.ms-excel": true,
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":         true,
	"application/vnd.ms-powerpoint":                                             true,
	"application/vnd.openxmlformats-officedocument.presentationml.presentation": true,

	// Archives
	"application/zip":     true,
	"application/gzip":    true,
	"application/x-tar":   true,
	"application/x-rar":   true,
	"application/x-7z":    true,
	"application/x-bzip":  true,
	"application/x-bzip2": true,

	// Audio/Video
	"audio/mpeg":      true,
	"audio/wav":       true,
	"audio/ogg":       true,
	"video/mp4":       true,
	"video/webm":      true,
	"video/ogg":       true,
	"video/mpeg":      true,
	"video/x-msvideo": true,

	// Other binary
	"application/octet-stream": true,
	"application/x-binary":     true,
}

// IsBinaryContentType checks if the given content type indicates binary data.
// Returns true if the content type should be treated as binary.
func IsBinaryContentType(contentType *string) bool {
	if contentType == nil || *contentType == "" {
		return false
	}

	// Normalize the content type (remove parameters like charset)
	ct := strings.ToLower(*contentType)
	if idx := strings.Index(ct, ";"); idx != -1 {
		ct = strings.TrimSpace(ct[:idx])
	}

	// Check exact match
	if binaryContentTypes[ct] {
		return true
	}

	// Check prefix patterns
	if strings.HasPrefix(ct, "image/") ||
		strings.HasPrefix(ct, "audio/") ||
		strings.HasPrefix(ct, "video/") {
		return true
	}

	return false
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
