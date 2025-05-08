package utils

import (
	"errors"
	"hash/fnv"

	"github.com/sqids/sqids-go"
)

// Sqids is a global handle to the SQID generator.
var Sqids *sqids.Sqids

// NewSQIDGenerator creates and returns a new SQID generator with custom options.
func NewSQIDGenerator() (*sqids.Sqids, error) {
	// Get the custom alphabet from the environment.
	env, err := LoadEnv() // LoadEnv should load your configuration from the environment.
	if err != nil {
		return nil, err
	}

	// Create a new SQID generator with a minimum length of 16 and the custom alphabet.
	s, err := sqids.New(sqids.Options{
		MinLength: 16,
		Alphabet:  env.SqidAlphabet,
	})
	if err != nil {
		return nil, err
	}

	// Store the instance globally.
	Sqids = s

	return s, nil
}

// hashStringToUint64 converts a string to a uint64 using the FNV-1a algorithm.
func hashStringToUint64(s string) uint64 {
	h := fnv.New64a()
	h.Write([]byte(s))
	return h.Sum64()
}

// EncodeSqids encodes the given ID with a content type identifier.
// The content type string is hashed to create a type code.
// - contentType: a string representing the type (e.g. "workspace")
// - id: the actual numeric ID to encode
// Returns the SQID string or an error if something goes wrong.
func EncodeSqids(contentType string, id uint64) (string, error) {
	// Create a new SQID generator if one doesn't exist.
	if Sqids == nil {
		NewSQIDGenerator()
	}
	// Create a type code from the content type.
	typeCode := hashStringToUint64(contentType)
	// Encode both the type code and the actual ID.
	return Sqids.Encode([]uint64{typeCode, id})
}

// DecodeSqids decodes the given SQID and verifies it matches the expected content type.
// - contentType: a string representing the expected content type (e.g. "workspace")
// - sqid: the encoded SQID string
// Returns the original ID if the type code matches, or an error.
func DecodeSqids(contentType string, sqid string) (uint64, error) {
	// Create a new SQID generator if one doesn't exist.
	if Sqids == nil {
		NewSQIDGenerator()
	}
	// Create a type code from the content type.
	expectedTypeCode := hashStringToUint64(contentType)
	// Decode the SQID and verify the type code.
	ids := Sqids.Decode(sqid)
	if len(ids) < 2 {
		return 0, errors.New("invalid SQID")
	}
	if ids[0] != expectedTypeCode {
		return 0, errors.New("SQID content type mismatch")
	}
	return ids[1], nil
}
