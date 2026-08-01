package connectionoauth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"io"
)

// State parameter and PKCE verifier sizes.
//
//   - The state parameter is 32 random bytes → 43 URL-safe base64 chars.
//     RFC 6749 recommends the state parameter be "unguessable"; 256 bits
//     from crypto/rand satisfies that by orders of magnitude.
//   - The PKCE verifier is 64 random bytes → 86 URL-safe base64 chars.
//     RFC 7636 requires [43, 128] chars. 86 gives us comfortable headroom
//     without flirting with any vendor-specific maximums.
const (
	stateNumRandomBytes        = 32
	pkceVerifierNumRandomBytes = 64
)

// generateState returns a cryptographically-random, URL-safe string that
// is unguessable and unique per authorization attempt. The value is
// returned as-is to the caller — it is both stored in the session row and
// passed to the vendor as the `state` parameter.
func generateState() (string, error) {
	return randomURLSafeString(stateNumRandomBytes)
}

// generatePKCE returns (verifier, challenge) where challenge is the S256
// transform of verifier per RFC 7636. The verifier is the secret we stash
// in the session; the challenge is what we send to the vendor in the
// authorization request.
func generatePKCE() (string, string, error) {
	verifier, err := randomURLSafeString(pkceVerifierNumRandomBytes)
	if err != nil {
		return "", "", fmt.Errorf("generate PKCE verifier: %w", err)
	}
	// RFC 7636 §4.2: challenge = BASE64URL-ENCODE(SHA256(verifier))
	sum := sha256.Sum256([]byte(verifier))
	challenge := base64.RawURLEncoding.EncodeToString(sum[:])
	return verifier, challenge, nil
}

// randomURLSafeString returns n bytes from crypto/rand, encoded as
// unpadded base64url. The result is safe to include in URL query params
// without further escaping.
func randomURLSafeString(n int) (string, error) {
	buf := make([]byte, n)
	if _, err := io.ReadFull(rand.Reader, buf); err != nil {
		return "", fmt.Errorf("read random bytes: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}
