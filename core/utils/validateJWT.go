package utils

import (
	"errors"
	"fmt"

	"github.com/golang-jwt/jwt/v5"
)

// getAllowedAlgorithms defines the whitelist of allowed JWT signing algorithms.
func getAllowedAlgorithms() map[string]jwt.SigningMethod {
	return map[string]jwt.SigningMethod{
		"HS256": jwt.SigningMethodHS256,
		"HS384": jwt.SigningMethodHS384,
		"HS512": jwt.SigningMethodHS512,
		"RS256": jwt.SigningMethodRS256,
		"RS384": jwt.SigningMethodRS384,
		"RS512": jwt.SigningMethodRS512,
		"ES256": jwt.SigningMethodES256,
		"ES384": jwt.SigningMethodES384,
		"ES512": jwt.SigningMethodES512,
		"PS256": jwt.SigningMethodPS256,
		"PS384": jwt.SigningMethodPS384,
		"PS512": jwt.SigningMethodPS512,
	}
}

// IsJWTAlgorithmSupported checks if the given JWT algorithm is supported by our validation.
func IsJWTAlgorithmSupported(algorithm string) bool {
	_, ok := getAllowedAlgorithms()[algorithm]
	return ok
}

// GetSupportedJWTAlgorithms returns a list of all supported JWT algorithms.
func GetSupportedJWTAlgorithms() []string {
	supportedAlgs := make([]string, 0, len(getAllowedAlgorithms()))
	for alg := range getAllowedAlgorithms() {
		supportedAlgs = append(supportedAlgs, alg)
	}
	return supportedAlgs
}

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
		// First, check if the algorithm is in our whitelist
		expectedMethod, ok := getAllowedAlgorithms()[signingAlg]
		if !ok {
			return nil, fmt.Errorf("algorithm %s is not in the allowed algorithms whitelist", signingAlg)
		}

		// Check that the token's signing method matches the expected algorithm exactly
		// This prevents algorithm confusion attacks by comparing the actual signing method objects
		if token.Method != expectedMethod {
			return nil, fmt.Errorf("unexpected signing algorithm: %v, expected: %s", token.Header["alg"], signingAlg)
		}

		// Additional validation: ensure the algorithm string in the header matches as well
		if token.Method.Alg() != signingAlg {
			return nil, fmt.Errorf("algorithm mismatch: token uses %s, expected %s", token.Method.Alg(), signingAlg)
		}

		return signingKey, nil
	})
	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	// Validate the token.
	if !token.Valid {
		return nil, errors.New("invalid token")
	}

	return token, nil
}
