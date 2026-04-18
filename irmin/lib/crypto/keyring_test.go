package crypto_test

import (
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"strings"
	"testing"

	"irmin-api/lib/crypto"
)

func makeKey(t *testing.T, id string) crypto.Key {
	t.Helper()
	raw, err := crypto.GenerateKey()
	if err != nil {
		t.Fatalf("GenerateKey: %v", err)
	}
	return crypto.Key{ID: id, KeyB64: raw}
}

func newKeyring(t *testing.T, ids ...string) *crypto.Keyring {
	t.Helper()
	entries := make([]crypto.Key, 0, len(ids))
	for _, id := range ids {
		entries = append(entries, makeKey(t, id))
	}
	kr, err := crypto.NewKeyring(entries)
	if err != nil {
		t.Fatalf("NewKeyring: %v", err)
	}
	return kr
}

func TestEncryptDecryptRoundtrip(t *testing.T) {
	kr := newKeyring(t, "k1")
	plaintexts := []string{
		"",
		"hello",
		"a very long secret with spaces and symbols !@#$%^&*()_+-=",
		strings.Repeat("x", 10_000),
		"\x00\x01binary\xff",
	}
	for _, p := range plaintexts {
		ct, err := kr.Encrypt(p)
		if err != nil {
			t.Fatalf("Encrypt(%q): %v", p, err)
		}
		if p != "" && !strings.HasPrefix(ct, crypto.CiphertextPrefix) {
			t.Fatalf("ciphertext missing prefix: %q", ct)
		}
		got, err := kr.Decrypt(ct)
		if err != nil {
			t.Fatalf("Decrypt: %v", err)
		}
		if got != p {
			t.Fatalf("roundtrip mismatch: got %q, want %q", got, p)
		}
	}
}

func TestEncryptUsesActiveKey(t *testing.T) {
	kr := newKeyring(t, "active", "old")
	ct, err := kr.Encrypt("x")
	if err != nil {
		t.Fatalf("Encrypt: %v", err)
	}
	if !strings.HasPrefix(ct, crypto.CiphertextPrefix+"active:") {
		t.Fatalf("expected prefix with active key id, got %q", ct)
	}
	if kr.ActiveKeyID() != "active" {
		t.Fatalf("ActiveKeyID = %q, want %q", kr.ActiveKeyID(), "active")
	}
}

func TestDecryptAcceptsAnyKey(t *testing.T) {
	// Simulate rotation: encrypt with keyring A (only "old"), then decrypt
	// with keyring B which has "new" as active plus "old" still valid.
	oldKey := makeKey(t, "old")
	newKey := makeKey(t, "new")
	oldOnly, err := crypto.NewKeyring([]crypto.Key{oldKey})
	if err != nil {
		t.Fatalf("NewKeyring old: %v", err)
	}
	ct, err := oldOnly.Encrypt("classified")
	if err != nil {
		t.Fatalf("Encrypt: %v", err)
	}
	rotated, err := crypto.NewKeyring([]crypto.Key{newKey, oldKey})
	if err != nil {
		t.Fatalf("NewKeyring rotated: %v", err)
	}
	plain, err := rotated.Decrypt(ct)
	if err != nil {
		t.Fatalf("Decrypt after rotation: %v", err)
	}
	if plain != "classified" {
		t.Fatalf("got %q, want %q", plain, "classified")
	}
	// And new encryptions use the new active key.
	newCT, err := rotated.Encrypt("fresh")
	if err != nil {
		t.Fatalf("Encrypt fresh: %v", err)
	}
	if !strings.HasPrefix(newCT, crypto.CiphertextPrefix+"new:") {
		t.Fatalf("new ciphertext not using active key: %q", newCT)
	}
}

func TestDecryptPassthroughUnprefixed(t *testing.T) {
	kr := newKeyring(t, "k1")
	got, err := kr.Decrypt("legacy-plaintext-from-before-encryption")
	if err != nil {
		t.Fatalf("Decrypt: %v", err)
	}
	if got != "legacy-plaintext-from-before-encryption" {
		t.Fatalf("expected passthrough, got %q", got)
	}
}

func TestDecryptRejectsTampered(t *testing.T) {
	kr := newKeyring(t, "k1")
	ct, err := kr.Encrypt("hello")
	if err != nil {
		t.Fatalf("Encrypt: %v", err)
	}
	// Flip a byte inside the base64 payload.
	sep := strings.LastIndexByte(ct, ':')
	payload, err := base64.StdEncoding.DecodeString(ct[sep+1:])
	if err != nil {
		t.Fatalf("decode ct payload: %v", err)
	}
	payload[len(payload)-1] ^= 0x01
	tampered := ct[:sep+1] + base64.StdEncoding.EncodeToString(payload)
	if _, decErr := kr.Decrypt(tampered); decErr == nil {
		t.Fatalf("expected decrypt to fail on tampered ciphertext")
	}
}

func TestDecryptRejectsUnknownKeyID(t *testing.T) {
	kr := newKeyring(t, "k1")
	ct, err := kr.Encrypt("hello")
	if err != nil {
		t.Fatalf("Encrypt: %v", err)
	}
	// Swap the key ID to one the keyring doesn't know.
	rewritten := strings.Replace(ct, crypto.CiphertextPrefix+"k1:", crypto.CiphertextPrefix+"k999:", 1)
	if _, decErr := kr.Decrypt(rewritten); decErr == nil {
		t.Fatalf("expected decrypt to fail for unknown key id")
	}
}

func TestNewKeyringValidation(t *testing.T) {
	goodKey, err := crypto.GenerateKey()
	if err != nil {
		t.Fatalf("GenerateKey: %v", err)
	}
	shortKey := base64.StdEncoding.EncodeToString(make([]byte, 16))

	cases := []struct {
		name    string
		entries []crypto.Key
	}{
		{"empty", nil},
		{"empty id", []crypto.Key{{ID: "", KeyB64: goodKey}}},
		{"id has colon", []crypto.Key{{ID: "a:b", KeyB64: goodKey}}},
		{"bad base64", []crypto.Key{{ID: "k", KeyB64: "not base 64!"}}},
		{"wrong length", []crypto.Key{{ID: "k", KeyB64: shortKey}}},
		{"duplicate ids", []crypto.Key{{ID: "k", KeyB64: goodKey}, {ID: "k", KeyB64: goodKey}}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if _, caseErr := crypto.NewKeyring(tc.entries); caseErr == nil {
				t.Fatalf("expected error for %q", tc.name)
			}
		})
	}
}

func TestNewKeyringFromJSON(t *testing.T) {
	entries := []crypto.Key{makeKey(t, "k1"), makeKey(t, "k2")}
	raw, err := json.Marshal(entries)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	kr, err := crypto.NewKeyringFromJSON(string(raw))
	if err != nil {
		t.Fatalf("NewKeyringFromJSON: %v", err)
	}
	if kr.ActiveKeyID() != "k1" {
		t.Fatalf("ActiveKeyID = %q, want k1", kr.ActiveKeyID())
	}
	if _, emptyErr := crypto.NewKeyringFromJSON(""); emptyErr == nil {
		t.Fatalf("expected error for empty input")
	}
	if _, badErr := crypto.NewKeyringFromJSON("not json"); badErr == nil {
		t.Fatalf("expected error for malformed input")
	}
}

func TestPassthroughKeyring(t *testing.T) {
	kr := crypto.NewPassthroughKeyring()
	if !kr.IsPassthrough() {
		t.Fatalf("expected passthrough")
	}
	if kr.ActiveKeyID() != "" {
		t.Fatalf("passthrough should have empty ActiveKeyID")
	}
	got, err := kr.Encrypt("hello")
	if err != nil {
		t.Fatalf("Encrypt: %v", err)
	}
	if got != "hello" {
		t.Fatalf("passthrough Encrypt modified value: %q", got)
	}
	got, err = kr.Decrypt("hello")
	if err != nil {
		t.Fatalf("Decrypt: %v", err)
	}
	if got != "hello" {
		t.Fatalf("passthrough Decrypt modified value: %q", got)
	}
	// Passthrough refuses to decrypt a real ciphertext — prevents silent data loss.
	live := newKeyring(t, "k1")
	ct, _ := live.Encrypt("secret")
	if _, decErr := kr.Decrypt(ct); decErr == nil {
		t.Fatalf("passthrough must reject real ciphertext")
	}
}

func TestKeyMaterialAcceptsVariants(t *testing.T) {
	// The same 32-byte key encoded five different ways that operators
	// realistically paste into env vars.
	raw := make([]byte, 32)
	for i := range raw {
		raw[i] = byte(i * 7)
	}
	variants := map[string]string{
		"std base64 padded":           base64.StdEncoding.EncodeToString(raw),
		"std base64 raw":              base64.RawStdEncoding.EncodeToString(raw),
		"URL base64 padded":           base64.URLEncoding.EncodeToString(raw),
		"URL base64 raw":              base64.RawURLEncoding.EncodeToString(raw),
		"hex":                         hex.EncodeToString(raw),
		"std base64 trailing newline": base64.StdEncoding.EncodeToString(raw) + "\n",
		"std base64 leading spaces":   "  " + base64.StdEncoding.EncodeToString(raw),
		"std base64 tabs and newline": "\t" + base64.StdEncoding.EncodeToString(raw) + "\r\n",
	}
	for name, encoded := range variants {
		t.Run(name, func(t *testing.T) {
			kr, err := crypto.NewKeyring([]crypto.Key{{ID: "k1", KeyB64: encoded}})
			if err != nil {
				t.Fatalf("NewKeyring rejected %s variant: %v", name, err)
			}
			ct, err := kr.Encrypt("hello")
			if err != nil {
				t.Fatalf("Encrypt: %v", err)
			}
			got, err := kr.Decrypt(ct)
			if err != nil {
				t.Fatalf("Decrypt: %v", err)
			}
			if got != "hello" {
				t.Fatalf("roundtrip mismatch for %s: %q", name, got)
			}
		})
	}
}

func TestKeyMaterialRejectsGarbage(t *testing.T) {
	key := crypto.Key{ID: "k1", KeyB64: "not base64 or hex!!"}
	if _, err := crypto.NewKeyring([]crypto.Key{key}); err == nil {
		t.Fatalf("expected error for garbage key material")
	}
}

func TestEncryptProducesDifferentCiphertexts(t *testing.T) {
	kr := newKeyring(t, "k1")
	a, _ := kr.Encrypt("same")
	b, _ := kr.Encrypt("same")
	if a == b {
		t.Fatalf("two encryptions of same plaintext produced identical ciphertext — nonce reuse?")
	}
}
