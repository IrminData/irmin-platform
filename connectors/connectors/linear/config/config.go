// Package config declares Linear's DynamicField schema and the
// ConnectorDetails payload served from the /info endpoint.
//
// Auth is OAuth 2.1 with Dynamic Client Registration against Linear's
// MCP OAuth server (https://mcp.linear.app). There is no admin-
// configured static OAuth app per environment, so the connector ships
// with no `details` form fields: the user clicks Connect, Core creates
// a per-workspace OAuth client via DCR, the user approves the grant,
// and every vendor call from that point on uses a transparently-
// refreshed bearer token resolved from Core at request time.
package config

import (
	"irmin-connectors/connectors/common"
	linearclient "irmin-connectors/connectors/linear/client"
	"irmin-connectors/models"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

// GetDetailsFieldDefinitions returns the connection details schema.
//
// Linear is OAuth-backed so there are no user-entered detail fields
// — the credential is the OAuth bearer token Core mints on behalf of
// the workspace, and the console renders a Connect button instead of
// a form. The empty map keeps the embed uniform with the static-
// credential connectors and lets common helpers no-op cleanly.
func GetDetailsFieldDefinitions() map[string]irminmodels.DynamicField {
	return map[string]irminmodels.DynamicField{}
}

// GetSettingsFieldDefinitions returns the per-Connection settings.
// Settings are user-tunable knobs that don't carry auth material.
func GetSettingsFieldDefinitions() map[string]irminmodels.DynamicField {
	return map[string]irminmodels.DynamicField{
		"team_key": {
			Type:     "text",
			Label:    "Team key",
			Required: false,
			Example:  "IRM",
			HelpText: "Optional Linear team key (e.g., `IRM`). When set, " +
				"pulls of `issues` and `cycles` are filtered to this team " +
				"and pushes default to it. Leave empty to operate across " +
				"every team the OAuth grant has access to.",
		},
		"max_records_per_resource": {
			Type:     "text",
			Label:    "Max records per resource",
			Required: false,
			Example:  "100000",
			HelpText: "Cap the number of records pulled per resource " +
				"(issues, projects, cycles, teams). Protects the connector " +
				"from OOM on workspaces with very large issue counts. " +
				"Leave empty to use the default cap of 100,000 records. " +
				"Set explicitly to a higher number for workspaces that " +
				"exceed the default. Positive integer only; non-numeric " +
				"or non-positive values fall back to the default.",
		},
		"mcp_endpoint": {
			Type:     "text",
			Label:    "MCP endpoint override",
			Required: false,
			Example:  linearclient.DefaultMCPEndpoint,
			HelpText: "Override the Linear MCP server endpoint. Defaults to " +
				linearclient.DefaultMCPEndpoint + ". Only set this if " +
				"you are pointing at a self-hosted Linear MCP instance " +
				"or a test fixture. The host must be in the connector's " +
				"allowlist (*.linear.app or loopback by default); to allow " +
				"other hosts, set LINEAR_ALLOWED_API_HOSTS on the " +
				"connectors service.",
		},
	}
}

// GetRequiredFields returns the union of required detail and settings
// field names. Linear has no required fields today — OAuth supplies
// the credential and every setting defaults sensibly — so this
// returns an empty slice; the helper exists so the
// OperationConfigProvider contract (GetOperationFormFields) is met
// uniformly with sibling connectors.
func GetRequiredFields() []string {
	details := GetDetailsFieldDefinitions()
	settings := GetSettingsFieldDefinitions()
	return common.GetRequiredFieldNames(details, settings)
}

// GetOptionalFields returns optional field names from both maps.
func GetOptionalFields() []string {
	details := GetDetailsFieldDefinitions()
	settings := GetSettingsFieldDefinitions()
	return common.GetOptionalFieldNames(details, settings)
}

// GetRequiredDetailsFields returns only the required detail field
// names (none today; reserved for future extensions).
func GetRequiredDetailsFields() []string {
	return common.GetRequiredDetailsFieldNames(GetDetailsFieldDefinitions())
}

// GetConnectorInfo returns the static connector metadata. The
// embedded ConnectionOAuthConfig is what makes the console render a
// Connect button on the Connection wizard — Core reads it through
// the registration call and the DynamicForm path on the frontend
// branches off `connection_oauth_config != nil`.
func GetConnectorInfo() models.ConnectorDetails {
	return models.ConnectorDetails{
		Name:             "Linear",
		Description:      "Pull Linear issues, projects, cycles, and teams as JSON snapshots, and push or patch issues back to Linear via OAuth-backed MCP tool calls against mcp.linear.app.",
		Version:          "1.0.0",
		StructureVersion: "1.0.0",
		Author:           "Tim Borovkov / Irmin",
		APIBaseURL:       "/linear",
		LogoURL:          "/public/linear.png",
		Capabilities: []irminmodels.ConnectorCapability{
			irminmodels.ConnectorCapabilityPull,
			irminmodels.ConnectorCapabilityPush,
			irminmodels.ConnectorCapabilityApplyPatch,
		},
		PrimaryCategory: irminmodels.ConnectorCategoryProjectManagement,
		Categories: []irminmodels.ConnectorCategory{
			irminmodels.ConnectorCategoryProjectManagement,
			irminmodels.ConnectorCategoryAnalytics,
		},
		AuthorEmail: "hello@irmin.co",
		ReadMoreURL: "/linear/details",
		ConnectionOAuthConfig: &irminmodels.ConnectionOAuthConfig{
			Provider:         "linear",
			AuthorizationURL: linearclient.AuthorizationURL,
			TokenURL:         linearclient.TokenURL,
			DCREndpoint:      linearclient.DCREndpoint,
			RevocationURL:    linearclient.RevocationURL,
			Scopes:           linearclient.DefaultScopes(),
			PKCE:             true,
		},
	}
}
