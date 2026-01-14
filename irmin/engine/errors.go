package engine

import "errors"

// Sentinel errors for connector capabilities
var (
	ErrConnectorMissingPullCapability    = errors.New("connector does not support pull operations")
	ErrConnectorMissingPushCapability    = errors.New("connector does not support push operations")
	ErrConnectorMissingPatchCapability   = errors.New("connector does not support patch operations")
	ErrConnectorMissingWebhookCapability = errors.New("connector does not support webhook operations")
)
