package services

import (
	"context"
	"fmt"

	"irmin-api/db"
	"irmin-api/services/oauth"

	"github.com/IrminData/irmin-sdk-go/connectorsclient"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// connectorsClientOAuthConfigProvider is the production ConfigProvider.
// It resolves a connector's ConnectionOAuthConfig by calling the connector
// service's /info endpoint via the SDK client and translating the SDK
// shape into the internal oauth.Config consumed by the flow.
//
// The struct holds no state — it exists as a named type so the oauth
// flow can inject a mock provider in tests.
type connectorsClientOAuthConfigProvider struct{}

// newConnectorsClientOAuthConfigProvider returns the provider.
func newConnectorsClientOAuthConfigProvider() *connectorsClientOAuthConfigProvider {
	return &connectorsClientOAuthConfigProvider{}
}

// GetOAuthConfig fetches the connector's /info response and extracts the
// OAuthConfig block. Returns oauth.ErrConfigUnavailable when either the
// fetch fails, or /info succeeds without an oauth_config block (meaning
// the connector isn't OAuth-backed).
func (p *connectorsClientOAuthConfigProvider) GetOAuthConfig(
	ctx context.Context,
	connector *db.Connector,
) (*oauth.Config, error) {
	if connector == nil || connector.APIBaseURL == "" || connector.SystemToken == "" {
		return nil, oauth.ErrConfigUnavailable
	}
	client := connectorsclient.NewClient(connector.APIBaseURL, connector.SystemToken)
	info, err := client.GetInfo(ctx)
	if err != nil {
		return nil, fmt.Errorf("%w: fetch /info: %w", oauth.ErrConfigUnavailable, err)
	}
	if info == nil || info.ConnectionOAuthConfig == nil {
		return nil, oauth.ErrConfigUnavailable
	}
	return sdkToServiceOAuthConfig(info.ConnectionOAuthConfig), nil
}

// sdkToServiceOAuthConfig maps the SDK ConnectionOAuthConfig to the
// internal one used by services/oauth. Pure — no I/O, no side effects —
// so unit-testable without standing up a network or a DB.
func sdkToServiceOAuthConfig(src *irminmodels.ConnectionOAuthConfig) *oauth.Config {
	if src == nil {
		return nil
	}
	return &oauth.Config{
		Provider:         src.Provider,
		AuthorizationURL: src.AuthorizationURL,
		TokenURL:         src.TokenURL,
		RevocationURL:    src.RevocationURL,
		DCREndpoint:      src.DCREndpoint,
		Scopes:           src.Scopes,
		PKCE:             src.PKCE,
		UserinfoURL:      src.UserinfoURL,
		ExtraParams:      src.ExtraParams,
	}
}
