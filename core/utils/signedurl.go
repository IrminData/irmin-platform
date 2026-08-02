package utils

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

// signedTokenParts is the number of dot-separated parts in a signed token (payload.signature).
const signedTokenParts = 2

// SignedURLPayload contains the parameters encoded in a signed download URL.
type SignedURLPayload struct {
	Workspace string `json:"w"`
	Repo      string `json:"r"`
	Path      string `json:"p"`
	Ref       string `json:"ref"`
	ExpiresAt int64  `json:"exp"`
	Type      string `json:"t,omitempty"` // "" = single object (default), "zip" = repository zip
}

// GenerateSignedToken creates a signed token from a payload using HMAC-SHA256.
// The token format is: base64url(payload).base64url(hmac).
func GenerateSignedToken(secret []byte, payload SignedURLPayload) (string, error) {
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("failed to marshal signed URL payload: %w", err)
	}

	mac := hmac.New(sha256.New, secret)
	mac.Write(payloadJSON)
	sig := mac.Sum(nil)

	encodedPayload := base64.RawURLEncoding.EncodeToString(payloadJSON)
	encodedSig := base64.RawURLEncoding.EncodeToString(sig)

	return encodedPayload + "." + encodedSig, nil
}

// ValidateSignedToken verifies the HMAC signature and expiry of a signed token.
// Returns the decoded payload if valid, or an error if the token is invalid or expired.
func ValidateSignedToken(secret []byte, token string) (*SignedURLPayload, error) {
	parts := strings.SplitN(token, ".", signedTokenParts)
	if len(parts) != signedTokenParts {
		return nil, errors.New("invalid token format")
	}

	payloadBytes, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, fmt.Errorf("invalid token payload encoding: %w", err)
	}

	sigBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, fmt.Errorf("invalid token signature encoding: %w", err)
	}

	// Verify HMAC
	mac := hmac.New(sha256.New, secret)
	mac.Write(payloadBytes)
	expectedSig := mac.Sum(nil)

	if !hmac.Equal(sigBytes, expectedSig) {
		return nil, errors.New("invalid token signature")
	}

	// Decode payload
	var payload SignedURLPayload
	if unmarshalErr := json.Unmarshal(payloadBytes, &payload); unmarshalErr != nil {
		return nil, fmt.Errorf("invalid token payload: %w", unmarshalErr)
	}

	// Check expiry
	if time.Now().Unix() > payload.ExpiresAt {
		return nil, errors.New("token has expired")
	}

	return &payload, nil
}
