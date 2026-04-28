package connectionoauth

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"irmin-api/db"
)

// dcrRequest is the RFC 7591 Section 3.1 client-registration request.
// Only the fields Irmin actually needs are included — the spec allows
// arbitrary extensions, and omitting them keeps the wire format clean.
type dcrRequest struct {
	RedirectURIs            []string `json:"redirect_uris"`
	TokenEndpointAuthMethod string   `json:"token_endpoint_auth_method"`
	GrantTypes              []string `json:"grant_types"`
	ResponseTypes           []string `json:"response_types"`
	ClientName              string   `json:"client_name"`
	Scope                   string   `json:"scope,omitempty"`
	// SoftwareID + SoftwareVersion let the vendor identify the caller
	// across multiple registrations from the same deployment.
	SoftwareID      string `json:"software_id,omitempty"`
	SoftwareVersion string `json:"software_version,omitempty"`
}

// dcrResponse is the RFC 7591 Section 3.2 success payload. We decode the
// documented fields plus the optional RFC 7592 management fields. Unknown
// fields are silently dropped.
type dcrResponse struct {
	ClientID                string   `json:"client_id"`
	ClientSecret            string   `json:"client_secret"`
	ClientIDIssuedAt        int64    `json:"client_id_issued_at"`
	ClientSecretExpiresAt   int64    `json:"client_secret_expires_at"`
	RegistrationAccessToken string   `json:"registration_access_token"`
	RegistrationClientURI   string   `json:"registration_client_uri"`
	TokenEndpointAuthMethod string   `json:"token_endpoint_auth_method"`
	GrantTypes              []string `json:"grant_types"`
	ResponseTypes           []string `json:"response_types"`
	Scope                   string   `json:"scope"`
}

// dcrSoftwareID is a stable identifier for the Irmin Core. Vendors that
// run long enough to correlate registrations across versions can see this
// same value for every DCR request we make, regardless of deployment.
const dcrSoftwareID = "irmin-core"

// registerClientViaDCR performs RFC 7591 Dynamic Client Registration for
// the given connector + workspace pair, inserting a new
// ConnectionOAuthClient row on success. Called lazily from
// resolveConnectorOAuth when a flow starts for a DCR-capable vendor that
// has no client registered yet.
//
// Concurrency: two simultaneous first-time calls for the same
// (connector, workspace) can both POST to the vendor and both INSERT,
// producing one orphan registration at the vendor. We accept this rare
// race because it only happens once per workspace per connector lifetime
// and both rows are functionally identical from the flow's perspective.
// A partial unique index is a future migration concern.
func (s *Service) registerClientViaDCR(
	ctx context.Context,
	connector *db.Connector,
	workspaceID uint,
	cfg *Config,
) (*db.ConnectionOAuthClient, error) {
	if cfg.DCREndpoint == "" {
		return nil, ErrClientUnconfigured
	}
	if workspaceID == 0 {
		// DCR always produces workspace-scoped registrations. A zero ID
		// means the caller is flowing a global connection, which is not
		// how DCR-capable connectors are meant to be used.
		return nil, errors.New("oauth: DCR requires a workspace ID")
	}

	req := dcrRequest{
		RedirectURIs:            []string{s.RedirectURI},
		TokenEndpointAuthMethod: "client_secret_basic",
		GrantTypes:              []string{"authorization_code", "refresh_token"},
		ResponseTypes:           []string{"code"},
		ClientName:              buildClientName(connector),
		Scope:                   strings.Join(cfg.Scopes, " "),
		SoftwareID:              dcrSoftwareID,
	}

	resp, err := s.postDCR(ctx, cfg.DCREndpoint, req)
	if err != nil {
		return nil, err
	}
	if resp.ClientID == "" {
		return nil, errors.New("oauth: DCR response missing client_id")
	}

	row := &db.ConnectionOAuthClient{
		ConnectorID:          connector.ID,
		WorkspaceID:          &workspaceID,
		ClientID:             resp.ClientID,
		RedirectURI:          s.RedirectURI,
		Secrets:              dcrSecrets(resp),
		RegistrationMetadata: dcrMetadata(resp),
	}
	if createErr := s.db.CreateConnectionOAuthClient(s.db.DB, row); createErr != nil {
		// The partial unique index on (connector_id, workspace_id) turns
		// a concurrent DCR race into a clean conflict: another caller
		// won, and their row is the one we should use. Fetch it; the
		// vendor may still have a stray orphan registration, but that's
		// a background-cleanup concern, not a flow-blocking one.
		if existing, lookupErr := s.db.GetConnectionOAuthClientForConnector(
			connector.ID, workspaceID,
		); lookupErr == nil {
			return existing, nil
		}
		return nil, fmt.Errorf("oauth: persist DCR client: %w", createErr)
	}
	return row, nil
}

// postDCR handles the JSON request/response round-trip with the vendor's
// registration endpoint. Non-2xx responses are wrapped as VendorError with
// stage="dcr" for consistent upstream handling.
func (s *Service) postDCR(
	ctx context.Context,
	endpoint string,
	payload dcrRequest,
) (*dcrResponse, error) {
	body, marshalErr := json.Marshal(payload)
	if marshalErr != nil {
		return nil, fmt.Errorf("oauth: marshal DCR request: %w", marshalErr)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("oauth: build DCR request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	httpResp, doErr := s.httpClient.Do(req)
	if doErr != nil {
		return nil, fmt.Errorf("oauth: DCR transport: %w", doErr)
	}
	defer func() { _ = httpResp.Body.Close() }()

	respBody, readErr := io.ReadAll(io.LimitReader(httpResp.Body, bodyReadLimit))
	if readErr != nil {
		return nil, fmt.Errorf("oauth: DCR read body: %w", readErr)
	}
	// RFC 7591 §3.2.1 says 201 Created on success, but some vendors
	// (including common MCP servers) return 200 OK. Accept either.
	if httpResp.StatusCode < 200 || httpResp.StatusCode >= 300 {
		return nil, &VendorError{
			Stage:      "dcr",
			StatusCode: httpResp.StatusCode,
			Snippet:    asciiSnippet(respBody, snippetLimit),
		}
	}

	var parsed dcrResponse
	if unmarshalErr := json.Unmarshal(respBody, &parsed); unmarshalErr != nil {
		return nil, fmt.Errorf("oauth: parse DCR response: %w", unmarshalErr)
	}
	return &parsed, nil
}

// buildClientName is the `client_name` metadata we advertise at the vendor.
// Keep it short and stable — some vendor UIs render this string verbatim.
func buildClientName(connector *db.Connector) string {
	if connector != nil && connector.Name != "" {
		return fmt.Sprintf("Irmin (%s)", connector.Name)
	}
	return "Irmin"
}

// dcrSecrets pulls the sensitive fields out of a DCR response into the
// encrypted Secrets map. Empty values are omitted so the map only contains
// keys whose values are real material.
func dcrSecrets(resp *dcrResponse) db.CustomFieldValues {
	secrets := db.CustomFieldValues{}
	if resp.ClientSecret != "" {
		secrets[db.ConnectionOAuthSecretKeyClientSecret] = resp.ClientSecret
	}
	if resp.RegistrationAccessToken != "" {
		secrets[db.ConnectionOAuthSecretKeyRegistrationToken] = resp.RegistrationAccessToken
	}
	return secrets
}

// dcrMetadata captures the non-sensitive registration fields worth keeping
// around for diagnostics and future RFC 7592 management calls. Stored as
// plain jsonb (no encryption) — none of these values are confidential.
func dcrMetadata(resp *dcrResponse) db.CustomFieldValues {
	md := db.CustomFieldValues{}
	if resp.ClientIDIssuedAt != 0 {
		md["client_id_issued_at"] = strconv.FormatInt(resp.ClientIDIssuedAt, 10)
	}
	if resp.ClientSecretExpiresAt != 0 {
		md["client_secret_expires_at"] = strconv.FormatInt(resp.ClientSecretExpiresAt, 10)
	}
	if resp.RegistrationClientURI != "" {
		md["registration_client_uri"] = resp.RegistrationClientURI
	}
	if resp.TokenEndpointAuthMethod != "" {
		md["token_endpoint_auth_method"] = resp.TokenEndpointAuthMethod
	}
	if resp.Scope != "" {
		md["scope"] = resp.Scope
	}
	if len(md) == 0 {
		return nil
	}
	return md
}

// Ensure the DCR-failed VendorError shape is documented alongside the
// existing sentinels so callers can errors.As against it.
var _ error = (*VendorError)(nil)

// ErrDCRUnavailable is returned when DCR is attempted but the Config's
// DCREndpoint is empty. Callers should surface a "please ask your admin to
// configure an OAuth client" message — this is the non-DCR-capable path.
var ErrDCRUnavailable = errors.New("oauth: dynamic client registration is not supported by this connector")
