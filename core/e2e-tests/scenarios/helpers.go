package scenarios

import (
	"math/rand/v2"
	"time"
)

// Common test constants.
const (
	defaultResultsPath   = "results"
	defaultResultsBranch = "main"
)

// randomSuffix generates a random suffix for unique naming.
func randomSuffix() int64 {
	return time.Now().UnixNano() + rand.Int64N(10000)
}
