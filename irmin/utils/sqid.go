package utils

import (
	"errors"
	"hash/fnv"
	"sync"

	"github.com/sqids/sqids-go"
)

const (
	// MinSQIDLength defines the minimum length for generated SQIDs.
	MinSQIDLength = 16
	// RequiredSQIDComponents defines the number of components required in a valid SQID
	// (type code + actual ID).
	RequiredSQIDComponents = 2
)

// SQIDManager handles the creation and management of SQID generators.
type SQIDManager struct {
	mu       sync.RWMutex
	instance *sqids.Sqids
	errInit  error
	env      *CoreAPIEnv
}

// NewSQIDManager creates a new SQID manager instance.
func NewSQIDManager(env *CoreAPIEnv) *SQIDManager {
	m := &SQIDManager{
		env: env,
	}
	return m
}

// getGenerator returns the singleton instance of the SQID generator,
// creating it if necessary.
func (m *SQIDManager) getGenerator() (*sqids.Sqids, error) {
	m.mu.RLock()
	if m.instance != nil {
		defer m.mu.RUnlock()
		return m.instance, nil
	}
	if m.errInit != nil {
		defer m.mu.RUnlock()
		return nil, m.errInit
	}
	m.mu.RUnlock()

	m.mu.Lock()
	defer m.mu.Unlock()

	// Double-check after acquiring write lock
	if m.instance != nil {
		return m.instance, nil
	}
	if m.errInit != nil {
		return nil, m.errInit
	}

	// Create a new SQID generator with a minimum length of 16 and the custom alphabet.
	s, err := sqids.New(sqids.Options{
		MinLength: MinSQIDLength,
		Alphabet:  m.env.SqidAlphabet,
	})
	if err != nil {
		m.errInit = err
		return nil, err
	}

	m.instance = s
	return s, nil
}

// hashStringToUint64 converts a string to a uint64 using the FNV-1a algorithm.
func hashStringToUint64(s string) uint64 {
	h := fnv.New64a()
	_, writeErr := h.Write([]byte(s))
	if writeErr != nil {
		return 0
	}
	return h.Sum64()
}

// Encode encodes the given ID with a content type identifier.
// The content type string is hashed to create a type code.
// - contentType: a string representing the type (e.g. "workspace")
// - id: the actual numeric ID to encode
// Returns the SQID string or an error if something goes wrong.
func (m *SQIDManager) Encode(contentType string, id uint64) (string, error) {
	s, err := m.getGenerator()
	if err != nil {
		return "", err
	}
	// Create a type code from the content type.
	typeCode := hashStringToUint64(contentType)
	// Encode both the type code and the actual ID.
	return s.Encode([]uint64{typeCode, id})
}

// Decode decodes the given SQID and verifies it matches the expected content type.
// - contentType: a string representing the expected content type (e.g. "workspace")
// - sqid: the encoded SQID string
// Returns the original ID if the type code matches, or an error.
func (m *SQIDManager) Decode(contentType string, sqid string) (uint64, error) {
	s, err := m.getGenerator()
	if err != nil {
		return 0, err
	}
	// Create a type code from the content type.
	expectedTypeCode := hashStringToUint64(contentType)
	// Decode the SQID and verify the type code.
	ids := s.Decode(sqid)
	if len(ids) < RequiredSQIDComponents {
		return 0, errors.New("invalid SQID")
	}
	if ids[0] != expectedTypeCode {
		return 0, errors.New("SQID content type mismatch")
	}
	return ids[1], nil
}
