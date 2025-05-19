package sandbox

import "time"

const (
	// tokenExpiryDuration defines how long API tokens created for sandbox execution should be valid.
	tokenExpiryDuration = 60 * time.Minute
)
