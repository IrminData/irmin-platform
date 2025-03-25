package utils

import (
	"fmt"

	"github.com/golang-jwt/jwt/v5"
)

// ValidateJWT validates a JWT token using the provided signing key and algorithm.
//
// Parameters:
// - tokenString: The JWT token string to be validated.
// - signingKey: The signing key used to sign the token.
// - signingAlg: The expected signing algorithm (e.g. "HS512").
//
// Returns:
// - A pointer to a jwt.Token if the token is valid.
// - An error if the token is invalid or token parsing fails.
func ValidateJWT(tokenString string, signingKey []byte, signingAlg string) (*jwt.Token, error) {
	// Parse the token using the provided signing key and expected algorithm.
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (any, error) {
		// Check that the token's signing method matches the expected algorithm.
		if token.Method.Alg() != signingAlg {
			return nil, fmt.Errorf("unexpected signing algorithm: %v, expected: %s", token.Header["alg"], signingAlg)
		}
		return signingKey, nil
	})
	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	// Validate the token.
	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	return token, nil
}
