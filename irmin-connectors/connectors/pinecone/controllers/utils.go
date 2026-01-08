package pineconecontrollers

import (
	"strconv"
	"strings"
)

// parseEmbeddingString parses a string representation of an embedding array.
// Returns nil if any value cannot be parsed to ensure dimension integrity.
func parseEmbeddingString(s string) []float32 {
	s = strings.TrimPrefix(s, "[")
	s = strings.TrimSuffix(s, "]")

	if s == "" {
		return nil
	}

	parts := strings.Split(s, ",")
	embedding := make([]float32, 0, len(parts))

	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		val, err := strconv.ParseFloat(part, 32)
		if err != nil {
			// Return nil instead of partial embedding to prevent dimension mismatch
			return nil
		}
		embedding = append(embedding, float32(val))
	}

	return embedding
}
