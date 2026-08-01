package lib

import (
	"errors"
	"fmt"
	"irmin-api/db"
	"irmin-api/utils"
	"log/slog"

	"gorm.io/gorm"
)

// OAuthClientSeedConfig declares one connector that participates in the
// `-seed-oauth-clients` flow. Each entry maps a connector by its exact DB
// name to an env-var prefix; the loader reads `<PREFIX>_CLIENT_ID` and
// `<PREFIX>_CLIENT_SECRET` from the already-parsed CoreAPIEnv struct.
type OAuthClientSeedConfig struct {
	EnvPrefix     string
	ConnectorName string
}

// oauthClientSeedRegistry returns the connectors eligible for global
// admin-configured OAuth client seeding. Add a new entry here and surface
// the matching fields on CoreAPIEnv to enable seeding for another vendor.
func oauthClientSeedRegistry() []OAuthClientSeedConfig {
	return []OAuthClientSeedConfig{
		{EnvPrefix: "GOOGLE_DRIVE", ConnectorName: "Google Drive"},
	}
}

// defaultConnectorOAuthRedirectURI is used when CONNECTOR_OAUTH_REDIRECT_URI
// is unset. Kept in sync with the redirect URI registered with vendors in
// local development.
const defaultConnectorOAuthRedirectURI = "https://localhost:8082/api/v1/connectors/oauth/callback"

// SeedOAuthClients upserts a global (workspace_id = NULL)
// ConnectionOAuthClient row for every connector listed in oauthClientSeeds
// whose CLIENT_ID + CLIENT_SECRET env vars are both set. Connectors with
// missing credentials are skipped silently so the flag is a no-op in
// environments that don't have any admin-configured OAuth apps.
//
// Idempotent: re-running updates the client_id, redirect_uri and encrypted
// secret on the existing row instead of inserting a duplicate.
func SeedOAuthClients(d *db.Database, env *utils.CoreAPIEnv) error {
	redirectURI := env.ConnectorOAuthRedirectURI
	if redirectURI == "" {
		redirectURI = defaultConnectorOAuthRedirectURI
	}

	for _, seed := range oauthClientSeedRegistry() {
		clientID, clientSecret, credsErr := credsForSeed(env, seed)
		if credsErr != nil {
			return fmt.Errorf("connector %q: %w", seed.ConnectorName, credsErr)
		}
		if clientID == "" || clientSecret == "" {
			// No credentials configured for this connector — skip without
			// noise. The seed flag is intentionally opt-in per connector.
			continue
		}

		connector, lookupErr := lookupConnectorByName(d, seed.ConnectorName)
		if lookupErr != nil {
			return fmt.Errorf("lookup connector %q: %w", seed.ConnectorName, lookupErr)
		}

		if upsertErr := upsertGlobalOAuthClient(d, connector.ID, clientID, clientSecret, redirectURI); upsertErr != nil {
			return fmt.Errorf("upsert oauth client for %q: %w", seed.ConnectorName, upsertErr)
		}
		slog.Default().Info(
			"seeded global OAuth client",
			"connector", seed.ConnectorName,
			"connector_id", connector.ID,
			"client_id", clientID,
		)
	}
	return nil
}

// credsForSeed dispatches a seed config to the matching env-var pair on
// CoreAPIEnv. New connectors added to oauthClientSeedRegistry also need a
// case here — an unrecognised prefix returns an error at runtime so the
// omission is never silently skipped.
func credsForSeed(env *utils.CoreAPIEnv, seed OAuthClientSeedConfig) (string, string, error) {
	switch seed.EnvPrefix {
	case "GOOGLE_DRIVE":
		return env.GoogleDriveClientID, env.GoogleDriveClientSecret, nil
	default:
		return "", "", fmt.Errorf("no credential wiring for prefix %q — add a case to credsForSeed", seed.EnvPrefix)
	}
}

// lookupConnectorByName fetches a connector by its `name` column. Returns
// a descriptive error when the connector is not registered so operators
// know to run the connector-registration step first.
func lookupConnectorByName(d *db.Database, name string) (*db.Connector, error) {
	var connector db.Connector
	err := d.Where("name = ?", name).First(&connector).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("connector %q is not registered", name)
	}
	if err != nil {
		return nil, err
	}
	return &connector, nil
}

// upsertGlobalOAuthClient writes the (connector_id, NULL workspace_id)
// row, updating client_id / redirect_uri / secrets when one already exists.
// Uses the same find-then-update pattern as SeedRoles / SeedDefaultTags so
// the partial unique index on (connector_id) WHERE workspace_id IS NULL
// stays in charge of the invariant rather than a hand-rolled ON CONFLICT
// target.
func upsertGlobalOAuthClient(d *db.Database, connectorID uint, clientID, clientSecret, redirectURI string) error {
	secrets := db.CustomFieldValues{
		db.ConnectionOAuthSecretKeyClientSecret: clientSecret,
	}

	var existing db.ConnectionOAuthClient
	findErr := d.Where("connector_id = ? AND workspace_id IS NULL", connectorID).First(&existing).Error
	switch {
	case findErr != nil && !errors.Is(findErr, gorm.ErrRecordNotFound):
		return findErr
	case errors.Is(findErr, gorm.ErrRecordNotFound):
		row := &db.ConnectionOAuthClient{
			ConnectorID: connectorID,
			WorkspaceID: nil,
			ClientID:    clientID,
			RedirectURI: redirectURI,
			Secrets:     secrets,
			RegistrationMetadata: db.CustomFieldValues{
				"token_endpoint_auth_method": "client_secret_basic",
			},
		}
		return d.Create(row).Error
	default:
		existing.ClientID = clientID
		existing.RedirectURI = redirectURI
		existing.Secrets = secrets
		if existing.RegistrationMetadata == nil {
			existing.RegistrationMetadata = db.CustomFieldValues{}
		}
		existing.RegistrationMetadata["token_endpoint_auth_method"] = "client_secret_basic"
		return d.Save(&existing).Error
	}
}
