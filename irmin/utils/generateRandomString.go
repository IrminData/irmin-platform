package utils

import (
	"crypto/rand"
	"encoding/hex"
)

// GenerateRandomString generates a random 64-character string.
// It does so by generating 32 random bytes and then encoding them in hexadecimal,
// as each byte produces two hexadecimal characters.
// Returns the random string or an error if one occurs.
func GenerateRandomString() (string, error) {
	// 32 bytes * 2 characters per byte = 64 characters
	bytes := make([]byte, 32)
	_, err := rand.Read(bytes)
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}
