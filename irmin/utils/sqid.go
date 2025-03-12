package utils

import (
	"fmt"
	"hash/fnv"

	"github.com/sqids/sqids-go"
)

// Sqids wraps the sqids-go generator.
type Sqids struct {
	sqids *sqids.Sqids
}

// NewSQIDGenerator creates and returns a new SQID generator with custom options.
func NewSQIDGenerator() (*Sqids, error) {
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
	return &Sqids{
		sqids: s,
	}, nil
}

// hashStringToUint64 converts a string to a uint64 using the FNV-1a algorithm.
func hashStringToUint64(s string) uint64 {
	h := fnv.New64a()
	h.Write([]byte(s))
	return h.Sum64()
}

// EncodeWithType encodes the given ID with a content type identifier.
// The content type string is hashed to create a type code.
// - contentType: a string representing the type (e.g. "workspace")
// - id: the actual numeric ID to encode
// Returns the SQID string or an error if something goes wrong.
func (s Sqids) EncodeWithType(contentType string, id uint64) (string, error) {
	typeCode := hashStringToUint64(contentType)
	// Encode both the type code and the actual ID.
	return s.sqids.Encode([]uint64{typeCode, id})
}

// DecodeWithType decodes the given SQID and verifies it matches the expected content type.
// - contentType: a string representing the expected content type (e.g. "workspace")
// - sqid: the encoded SQID string
// Returns the original ID if the type code matches, or an error.
func (s Sqids) DecodeWithType(contentType string, sqid string) (uint64, error) {
	expectedTypeCode := hashStringToUint64(contentType)
	ids := s.sqids.Decode(sqid)
	if len(ids) < 2 {
		return 0, fmt.Errorf("invalid SQID")
	}
	if ids[0] != expectedTypeCode {
		return 0, fmt.Errorf("SQID content type mismatch")
	}
	return ids[1], nil
}
