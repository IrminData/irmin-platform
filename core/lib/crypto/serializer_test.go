package crypto_test

import (
	"context"
	"encoding/json"
	"reflect"
	"strings"
	"testing"

	"irmin-api/lib/crypto"
)

func newTestSerializer(t *testing.T) crypto.EncryptedJSONSerializer {
	t.Helper()
	raw, genErr := crypto.GenerateKey()
	if genErr != nil {
		t.Fatalf("GenerateKey: %v", genErr)
	}
	kr, krErr := crypto.NewKeyring([]crypto.Key{{ID: "t1", KeyB64: raw}})
	if krErr != nil {
		t.Fatalf("NewKeyring: %v", krErr)
	}
	return crypto.EncryptedJSONSerializer{Keyring: kr}
}

func TestEncryptStringMapRoundtrip(t *testing.T) {
	s := newTestSerializer(t)
	in := map[string]string{
		"host":     "db.example.com",
		"user":     "root",
		"password": "hunter2",
		"blank":    "",
	}
	encrypted, encErr := s.EncryptStringMap(in)
	if encErr != nil {
		t.Fatalf("EncryptStringMap: %v", encErr)
	}
	for k, v := range encrypted {
		if k == "blank" {
			if v != "" {
				t.Fatalf("empty string should stay empty, got %q", v)
			}
			continue
		}
		if !strings.HasPrefix(v, crypto.CiphertextPrefix) {
			t.Fatalf("key %q not encrypted: %q", k, v)
		}
	}
	if decErr := s.DecryptStringMap(encrypted); decErr != nil {
		t.Fatalf("DecryptStringMap: %v", decErr)
	}
	if !reflect.DeepEqual(encrypted, in) {
		t.Fatalf("roundtrip mismatch:\n got %#v\nwant %#v", encrypted, in)
	}
}

func TestEncryptStringMapPreservesPrefixedPlaintext(t *testing.T) {
	// Regression test: if a user's secret legitimately starts with the
	// ciphertext prefix, EncryptStringMap must encrypt it (not mistake it
	// for already-encrypted data). The round-trip should return the exact
	// original plaintext.
	s := newTestSerializer(t)
	plaintext := crypto.CiphertextPrefix + "looks-like-ciphertext-but-isnt"
	encrypted, encErr := s.EncryptStringMap(map[string]string{"k": plaintext})
	if encErr != nil {
		t.Fatalf("EncryptStringMap: %v", encErr)
	}
	if encrypted["k"] == plaintext {
		t.Fatalf("prefix-matching plaintext was stored unencrypted — would be unreadable after round-trip")
	}
	if decErr := s.DecryptStringMap(encrypted); decErr != nil {
		t.Fatalf("DecryptStringMap: %v", decErr)
	}
	if encrypted["k"] != plaintext {
		t.Fatalf("round-trip mismatch: got %q, want %q", encrypted["k"], plaintext)
	}
}

func TestDecryptStringMapPassthroughLegacy(t *testing.T) {
	s := newTestSerializer(t)
	m := map[string]string{"user": "alice", "pass": "plain"}
	if decErr := s.DecryptStringMap(m); decErr != nil {
		t.Fatalf("DecryptStringMap: %v", decErr)
	}
	if m["user"] != "alice" || m["pass"] != "plain" {
		t.Fatalf("passthrough failed: %#v", m)
	}
}

func TestValueProducesEncryptedJSON(t *testing.T) {
	s := newTestSerializer(t)
	// Value ignores the field arg for map[string]string shapes, so passing
	// nil here is safe — the reflection path doesn't need a real schema.Field.
	got, valErr := s.Value(context.Background(), nil, reflect.Value{}, map[string]string{"a": "b"})
	if valErr != nil {
		t.Fatalf("Value: %v", valErr)
	}
	raw, ok := got.([]byte)
	if !ok {
		t.Fatalf("expected []byte, got %T", got)
	}
	var decoded map[string]string
	if unmarshalErr := json.Unmarshal(raw, &decoded); unmarshalErr != nil {
		t.Fatalf("unmarshal: %v", unmarshalErr)
	}
	if !strings.HasPrefix(decoded["a"], crypto.CiphertextPrefix) {
		t.Fatalf("expected value to be encrypted, got %q", decoded["a"])
	}
}

func TestValueHandlesNilInput(t *testing.T) {
	s := newTestSerializer(t)
	cases := []struct {
		name string
		in   any
	}{
		{"untyped nil", nil},
		{"typed nil map", map[string]string(nil)},
		{"nil pointer to map", (*map[string]string)(nil)},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, valErr := s.Value(context.Background(), nil, reflect.Value{}, tc.in)
			if valErr != nil {
				t.Fatalf("Value: %v", valErr)
			}
			raw, ok := got.([]byte)
			if !ok {
				t.Fatalf("expected []byte, got %T", got)
			}
			if string(raw) != "null" {
				t.Fatalf("expected JSON null, got %q", raw)
			}
		})
	}
}
