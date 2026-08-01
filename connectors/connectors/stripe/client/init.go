package client

import (
	"encoding/json"
	"fmt"
	"log/slog"

	stripemodels "irmin-connectors/connectors/stripe/models"
	"irmin-connectors/db"
)

// InitFromOperation builds a Stripe Client from the persisted
// Connection details + settings on a db.Operation. Mirrors the helper
// other connectors expose (e.g., pineconeclient.InitPineconeClient);
// the pull / push / patch handlers all start from this single seam.
//
// The logger argument is accepted for parity with other connectors
// even though the client itself is logger-free — operation logging
// lives in the controllers. Extra Options let controllers attach
// observability hooks (notably WithProgressHandler) without every
// caller having to re-parse the connection details.
func InitFromOperation(
	_ *slog.Logger,
	operation *db.Operation,
	opts ...Option,
) (*Client, *stripemodels.ConnectionDetails, *stripemodels.ConnectionSettings, error) {
	var detailsMap map[string]any
	if err := json.Unmarshal(operation.Details, &detailsMap); err != nil {
		return nil, nil, nil, fmt.Errorf("stripe: decode details: %w", err)
	}
	details, err := stripemodels.NewConnectionDetailsFromMap(detailsMap)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("stripe: invalid details: %w", err)
	}

	var settingsMap map[string]any
	if unmarshalErr := json.Unmarshal(operation.Settings, &settingsMap); unmarshalErr != nil {
		return nil, nil, nil, fmt.Errorf("stripe: decode settings: %w", unmarshalErr)
	}
	settings, err := stripemodels.NewConnectionSettingsFromMap(settingsMap)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("stripe: invalid settings: %w", err)
	}

	return NewClient(details.APIKey, settings.ResolvedAPIVersion(), opts...), details, settings, nil
}
