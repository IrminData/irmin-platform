// Package crypto provides envelope encryption for sensitive values stored in
// the Core database — connection credentials today, OAuth refresh tokens
// tomorrow.
//
// It lives under lib/ alongside the other domain-agnostic helpers. Callers
// construct a Keyring from configuration at boot and pass it into GORM
// serializers or services that need to wrap/unwrap values.
package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strings"
)

// CiphertextPrefix marks a string that was produced by this package.
// The full on-wire format is: CiphertextPrefix + keyID + ":" + base64(nonce || ciphertext).
//
// The prefix is deliberately distinctive ("irmin-enc-v1:") so the Decrypt
// passthrough path can treat any value lacking the prefix as legacy plaintext
// without realistic risk of a user-supplied secret colliding by accident.
// Keep this constant stable — rotating it would invalidate every row already
// encrypted under the old value.
const CiphertextPrefix = "irmin-enc-v1:"

const aesKeyLen = 32

// Key is a single entry in the keyring as it appears in configuration.
// KeyB64 is the standard base64 encoding of a 32-byte AES-256 key.
type Key struct {
	ID     string `json:"id"`
	KeyB64 string `json:"key_b64"`
}

type parsedKey struct {
	id   string
	aead cipher.AEAD
}

// Keyring holds one or more AES-256-GCM keys. The first key in the input
// ordering is the active key used for new encryptions; all keys remain valid
// for decryption so older rows keep working across a key rotation.
//
// A Keyring constructed via NewPassthroughKeyring performs no encryption and
// exists to let non-production deployments run without a configured keyring.
type Keyring struct {
	keys        []parsedKey
	lookup      map[string]cipher.AEAD
	active      parsedKey
	passthrough bool
}

// NewKeyringFromJSON parses a JSON array of {id, key_b64} entries.
func NewKeyringFromJSON(raw string) (*Keyring, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, errors.New("empty keyring")
	}
	var entries []Key
	if err := json.Unmarshal([]byte(raw), &entries); err != nil {
		return nil, fmt.Errorf("parse keyring: %w", err)
	}
	return NewKeyring(entries)
}

// NewKeyring builds a Keyring from parsed entries.
func NewKeyring(entries []Key) (*Keyring, error) {
	if len(entries) == 0 {
		return nil, errors.New("keyring must contain at least one key")
	}
	kr := &Keyring{lookup: make(map[string]cipher.AEAD, len(entries))}
	for i, e := range entries {
		if e.ID == "" {
			return nil, fmt.Errorf("key at index %d has empty id", i)
		}
		if strings.ContainsAny(e.ID, ":") {
			return nil, fmt.Errorf("key id %q must not contain ':'", e.ID)
		}
		raw, err := base64.StdEncoding.DecodeString(e.KeyB64)
		if err != nil {
			return nil, fmt.Errorf("key %q: base64 decode: %w", e.ID, err)
		}
		if len(raw) != aesKeyLen {
			return nil, fmt.Errorf("key %q: expected %d-byte AES-256 key, got %d", e.ID, aesKeyLen, len(raw))
		}
		block, err := aes.NewCipher(raw)
		if err != nil {
			return nil, fmt.Errorf("key %q: new cipher: %w", e.ID, err)
		}
		aead, err := cipher.NewGCM(block)
		if err != nil {
			return nil, fmt.Errorf("key %q: new gcm: %w", e.ID, err)
		}
		if _, ok := kr.lookup[e.ID]; ok {
			return nil, fmt.Errorf("duplicate key id %q", e.ID)
		}
		parsed := parsedKey{id: e.ID, aead: aead}
		kr.lookup[e.ID] = aead
		kr.keys = append(kr.keys, parsed)
		if i == 0 {
			kr.active = parsed
		}
	}
	return kr, nil
}

// NewPassthroughKeyring returns a keyring that does not encrypt or decrypt.
// It exists so callers have a uniform type to hand to serializers; real
// encryption kicks in once a keyring is configured via environment.
func NewPassthroughKeyring() *Keyring {
	return &Keyring{passthrough: true}
}

// IsPassthrough reports whether this keyring performs real encryption.
func (k *Keyring) IsPassthrough() bool {
	return k.passthrough
}

// ActiveKeyID returns the ID of the key currently used for new encryptions,
// or "" for a passthrough keyring.
func (k *Keyring) ActiveKeyID() string {
	if k.passthrough {
		return ""
	}
	return k.active.id
}

// Encrypt wraps plaintext. Empty input is returned as empty (empty strings
// are not secrets and we keep them empty on disk to avoid storing noise).
// Passthrough keyrings return input unchanged.
func (k *Keyring) Encrypt(plaintext string) (string, error) {
	if plaintext == "" || k.passthrough {
		return plaintext, nil
	}
	nonce := make([]byte, k.active.aead.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("generate nonce: %w", err)
	}
	sealed := k.active.aead.Seal(nil, nonce, []byte(plaintext), nil)
	payload := make([]byte, 0, len(nonce)+len(sealed))
	payload = append(payload, nonce...)
	payload = append(payload, sealed...)
	return CiphertextPrefix + k.active.id + ":" + base64.StdEncoding.EncodeToString(payload), nil
}

// Decrypt inverts Encrypt. Values that do not carry CiphertextPrefix are
// returned as-is — this is the backward-compatibility path for rows written
// before encryption was enabled.
func (k *Keyring) Decrypt(s string) (string, error) {
	if s == "" {
		return "", nil
	}
	if !strings.HasPrefix(s, CiphertextPrefix) {
		return s, nil
	}
	if k.passthrough {
		return "", errors.New("received ciphertext but keyring is passthrough")
	}
	rest := strings.TrimPrefix(s, CiphertextPrefix)
	sep := strings.IndexByte(rest, ':')
	if sep <= 0 {
		return "", errors.New("invalid ciphertext: missing key id")
	}
	keyID := rest[:sep]
	aead, ok := k.lookup[keyID]
	if !ok {
		return "", fmt.Errorf("unknown key id %q", keyID)
	}
	payload, err := base64.StdEncoding.DecodeString(rest[sep+1:])
	if err != nil {
		return "", fmt.Errorf("invalid ciphertext: base64: %w", err)
	}
	nonceSize := aead.NonceSize()
	if len(payload) < nonceSize {
		return "", errors.New("invalid ciphertext: payload shorter than nonce")
	}
	nonce, ct := payload[:nonceSize], payload[nonceSize:]
	plain, err := aead.Open(nil, nonce, ct, nil)
	if err != nil {
		return "", fmt.Errorf("decrypt: %w", err)
	}
	return string(plain), nil
}

// GenerateKey produces a base64-encoded random 32-byte AES-256 key, intended
// for bootstrapping a new deployment's CREDENTIAL_ENCRYPTION_KEYS env var.
func GenerateKey() (string, error) {
	raw := make([]byte, aesKeyLen)
	if _, err := io.ReadFull(rand.Reader, raw); err != nil {
		return "", fmt.Errorf("generate key: %w", err)
	}
	return base64.StdEncoding.EncodeToString(raw), nil
}
