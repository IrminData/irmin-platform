package utils

import (
	"crypto/rand"
	"encoding/hex"
)

const (
	// randomStringLength represents the length of the random string to generate.
	randomStringLength = 64
	// randomStringBytes represents the number of bytes to generate.
	randomStringBytes = randomStringLength / 2
)

// GenerateRandomString generates a random 64-character string.
// It does so by generating 32 random bytes and then encoding them in hexadecimal,
// as each byte produces two hexadecimal characters.
// Returns the random string or an error if one occurs.
func GenerateRandomString() (string, error) {
	bytes := make([]byte, randomStringBytes)
	_, err := rand.Read(bytes)
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}
