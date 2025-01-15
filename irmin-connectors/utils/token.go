package utils

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
)

// GenerateToken creates a secure random token for system-level authentication.
// The token is base64 encoded to ensure it's a string that can be easily used in headers.
func GenerateToken(length int) (string, error) {
	// Create a byte slice to hold the random bytes
	tokenBytes := make([]byte, length)

	// Fill the byte slice with cryptographically secure random bytes
	_, err := rand.Read(tokenBytes)
	if err != nil {
		return "", fmt.Errorf("failed to generate random bytes: %w", err)
	}

	// Encode the random bytes as a base64 string to make it a secure, readable token
	token := base64.RawURLEncoding.EncodeToString(tokenBytes)

	return token, nil
}
