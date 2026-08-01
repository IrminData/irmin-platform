// Package stripemodels holds the Stripe-specific typed views of the
// Connection's persisted details and settings. Mirrors the pattern used
// by every other static-credential connector so that controller code
// can unmarshal once and pass strongly-typed structs around.
package stripemodels

import (
	"errors"
	"strings"

	"irmin-connectors/utils"
)

// ConnectionDetails holds the sensitive authentication information for Stripe.
type ConnectionDetails struct {
	APIKey string `json:"api_key"`
}

// NewConnectionDetailsFromMap creates a ConnectionDetails from a map[string]any.
func NewConnectionDetailsFromMap(details map[string]any) (*ConnectionDetails, error) {
	cd := &ConnectionDetails{
		APIKey: strings.TrimSpace(utils.GetStringFromMap(details, "api_key", "")),
	}

	if cd.APIKey == "" {
		return nil, errors.New("api_key is required")
	}

	// Stripe keys always carry a prefix. Guard against obvious copy/paste
	// mistakes (e.g., pasting the publishable key `pk_...` which can't
	// call the REST API). Restricted keys start with `rk_`; secret keys
	// with `sk_`. The legacy test-key prefix `sk_test_` / `rk_test_` is
	// accepted implicitly because it matches the prefix check.
	if !strings.HasPrefix(cd.APIKey, "sk_") && !strings.HasPrefix(cd.APIKey, "rk_") {
		return nil, errors.New(
			"api_key must be a Stripe secret (sk_...) or restricted (rk_...) key; " +
				"publishable keys (pk_...) cannot call the Stripe REST API",
		)
	}

	return cd, nil
}
