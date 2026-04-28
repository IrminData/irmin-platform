// Internal test file — exercises unexported helpers (generateState,
// generatePKCE) that we deliberately keep package-private. Moving them to
// oauth_test would require making them public purely to satisfy the
// testpackage lint, which is not worth the API-surface bloat.
//
//nolint:testpackage // intentional internal test for unexported helpers
package connectionoauth

import (
	"crypto/sha256"
	"encoding/base64"
	"strings"
	"testing"
)

func TestGenerateStateIsUniqueAndRandom(t *testing.T) {
	seen := make(map[string]struct{}, 100)
	for i := range 100 {
		s, err := generateState()
		if err != nil {
			t.Fatalf("generateState: %v", err)
		}
		if len(s) < 40 {
			t.Fatalf("state too short: %q (len=%d)", s, len(s))
		}
		if strings.ContainsAny(s, "+/= ") {
			t.Fatalf("state must be URL-safe base64 without padding, got %q", s)
		}
		if _, dup := seen[s]; dup {
			t.Fatalf("state collision after %d iterations — RNG wired wrong?", i)
		}
		seen[s] = struct{}{}
	}
}

func TestGeneratePKCE_ChallengeIsS256OfVerifier(t *testing.T) {
	for range 20 {
		verifier, challenge, err := generatePKCE()
		if err != nil {
			t.Fatalf("generatePKCE: %v", err)
		}
		if len(verifier) < 43 || len(verifier) > 128 {
			t.Fatalf("verifier length out of RFC 7636 bounds [43,128]: %d", len(verifier))
		}
		// Challenge must be BASE64URL-ENCODE(SHA256(verifier)) per RFC 7636 §4.2.
		sum := sha256.Sum256([]byte(verifier))
		want := base64.RawURLEncoding.EncodeToString(sum[:])
		if challenge != want {
			t.Fatalf("challenge mismatch:\n got %q\nwant %q", challenge, want)
		}
		if strings.ContainsAny(challenge, "+/= ") {
			t.Fatalf("challenge must be URL-safe base64 without padding: %q", challenge)
		}
	}
}

func TestGeneratePKCE_VerifierIsUnique(t *testing.T) {
	seen := make(map[string]struct{}, 100)
	for range 100 {
		v, _, err := generatePKCE()
		if err != nil {
			t.Fatalf("generatePKCE: %v", err)
		}
		if _, dup := seen[v]; dup {
			t.Fatalf("verifier collision — RNG wired wrong?")
		}
		seen[v] = struct{}{}
	}
}
