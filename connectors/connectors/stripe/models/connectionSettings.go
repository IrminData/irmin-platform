package stripemodels

import (
	"strings"

	"irmin-connectors/connectors/stripe/config"
	"irmin-connectors/utils"
)

// ConnectionSettings holds the configuration for a Stripe connection.
type ConnectionSettings struct {
	// APIVersion is the value stamped on the Stripe-Version header. The
	// empty-string case resolves to config.DefaultAPIVersion at use time
	// via ResolvedAPIVersion, so call sites don't have to duplicate the
	// fallback.
	APIVersion string `json:"api_version"`
}

// NewConnectionSettingsFromMap creates a ConnectionSettings from a map[string]any.
//
// Settings are optional for Stripe — an empty map is valid and resolves
// to the default API version. Returning (*ConnectionSettings, nil) for
// the empty case (rather than erroring) matches the pattern used by
// other connectors with all-optional settings.
func NewConnectionSettingsFromMap(settings map[string]any) (*ConnectionSettings, error) {
	cs := &ConnectionSettings{
		APIVersion: strings.TrimSpace(utils.GetStringFromMap(settings, "api_version", "")),
	}
	return cs, nil
}

// ResolvedAPIVersion returns the pinned API version with the default
// fallback applied. Use this at request time so call sites don't
// branch on the empty-string case.
func (cs *ConnectionSettings) ResolvedAPIVersion() string {
	if cs == nil || cs.APIVersion == "" {
		return config.DefaultAPIVersion
	}
	return cs.APIVersion
}
