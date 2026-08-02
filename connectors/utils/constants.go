package utils

const (
	// MaxRetries defines how many times to retry the transaction on deadlock.
	MaxRetries = 3

	// BaseBackoff is the minimum jitter wait (in milliseconds) before retrying.
	BaseBackoff = 50

	// MaxJitter is the additional random backoff (in milliseconds).
	MaxJitter = 100

	// MaxPortNumber is the maximum valid port number (2^16 - 1).
	MaxPortNumber = 65535

	// DefaultTokenLength is the default length for generated tokens.
	DefaultTokenLength = 32

	// DefaultMultipartFormMemory is the default memory limit for multipart form parsing (32MB).
	DefaultMultipartFormMemory = 32 << 20
)
