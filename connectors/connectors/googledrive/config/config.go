// Package config declares Google Drive's DynamicField schema and the
// ConnectorDetails payload served from the /info endpoint.
//
// Auth is OAuth 2.0 + PKCE as a static-client connector (no RFC 7591
// Dynamic Client Registration — Google does not support DCR). An admin
// must register one OAuth app per environment in Google Cloud Console;
// the resulting client_id/client_secret are stored in Core's
// connection_oauth_clients table as a global (workspace_id = NULL) row.
//
// Users only see a "Connect with Google" button — they never touch
// Google Cloud Console.
//
// Google's OAuth has two quirks the flow must handle:
//   - Refresh tokens in testing mode expire after 7 days (production
//     mode issues indefinite refresh tokens). The scheduled refresh
//     path handles this transparently.
//   - The consent screen must be set to "External" (or "Internal" for
//     Google Workspace domains) and published, or refresh tokens
//     expire after 7 days regardless of mode.
package config

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/models"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

// OAuth constants for Google's endpoints.
const (
	// AuthorizationURL is where the user-agent goes to approve the grant.
	AuthorizationURL = "https://accounts.google.com/o/oauth2/auth"

	// TokenURL exchanges authorization codes and refresh tokens.
	TokenURL = "https://oauth2.googleapis.com/token" //nolint:gosec // OAuth endpoint URL, not a credential

	// RevocationURL is where Core POSTs the token on disconnect.
	RevocationURL = "https://oauth2.googleapis.com/revoke"

	// Google Drive API base URL.
	APIBaseURL = "https://www.googleapis.com"

	// DefaultMaxRecords is the default cap on files pulled per operation.
	DefaultMaxRecords = "100000"
)

// DefaultScopes returns the OAuth scopes the connector requests.
// drive.readonly is sufficient for pulling file metadata + contents.
// drive.file is needed for push (creating app-owned files).
// drive provides full access (read/write all files).
// Returned as a fresh slice each call (lint disallows package-level slices).
func DefaultScopes() []string {
	return []string{
		"https://www.googleapis.com/auth/drive.readonly",
		"https://www.googleapis.com/auth/drive.file",
	}
}

// GetDetailsFieldDefinitions returns the connection details schema.
//
// Google Drive is OAuth-backed so there are no user-entered detail
// fields — the credential is the OAuth bearer token Core mints on
// behalf of the workspace. The empty map keeps the embed uniform.
func GetDetailsFieldDefinitions() map[string]irminmodels.DynamicField {
	return map[string]irminmodels.DynamicField{}
}

// GetSettingsFieldDefinitions returns the per-Connection settings.
func GetSettingsFieldDefinitions() map[string]irminmodels.DynamicField {
	return map[string]irminmodels.DynamicField{
		"scope": {
			Type:     "select",
			Label:    "OAuth scope",
			Required: false,
			Options: []irminmodels.SelectOption{
				{
					Key:   "https://www.googleapis.com/auth/drive.readonly",
					Value: "Read only (file metadata + contents)",
				},
				{
					Key:   "https://www.googleapis.com/auth/drive.file",
					Value: "App-specific (files created by Irmin)",
				},
				{
					Key:   "https://www.googleapis.com/auth/drive",
					Value: "Full access (all files, read + write)",
				},
			},
			HelpText: "Google Drive OAuth scope. Read-only is safe for imports." +
				" App-specific allows creating files via push." +
				" Full access allows reading and writing any file the user can access." +
				" Changing the scope on an existing connection forces re-authorisation.",
		},
		"max_records_per_resource": {
			Type:     "text",
			Label:    "Max records per resource",
			Required: false,
			Example:  DefaultMaxRecords,
			HelpText: "Cap the number of files pulled per resource type." +
				" Leave empty for default (" + DefaultMaxRecords + ")." +
				" Positive integer only.",
		},
		"max_file_size_mb": {
			Type:     "text",
			Label:    "Max file size (MB)",
			Required: false,
			Example:  "50",
			HelpText: "Per-file size cap in megabytes. Files larger than this" +
				" are recorded in files.json with skipped=true. Default 50." +
				" Maximum 500 (the worker buffers blobs in memory before" +
				" zipping, so the total folder-walk budget is also bounded).",
		},
		"mime_type_filter": {
			Type:     "text",
			Label:    "MIME type filter",
			Required: false,
			Example:  "application/pdf, image/*",
			HelpText: "Comma-separated MIME types to include (supports trailing" +
				" /* wildcard). Leave empty to include all types. Folders are" +
				" always traversed regardless of this filter.",
		},
		"google_native_export": {
			Type:     "select",
			Label:    "Google-native files",
			Required: false,
			Options: []irminmodels.SelectOption{
				{Key: "skip", Value: "Skip — metadata only, no bytes"},
				{Key: "pdf", Value: "Export as PDF"},
				{Key: "office", Value: "Export as Office (docx / xlsx / pptx)"},
			},
			HelpText: "How to handle Google Docs, Sheets, and Slides. They have" +
				" no native binary form, so pulling their contents requires" +
				" exporting through Drive. Default: skip.",
		},
		"recursive": {
			Type:     "checkbox",
			Label:    "Walk subfolders",
			Required: false,
			HelpText: "When the pull path points at a folder, also walk its" +
				" subfolders. Off by default to keep pulls focused.",
		},
	}
}

// GetRequiredFields returns the union of required detail and settings field names.
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

// GetRequiredDetailsFields returns only the required detail field names.
func GetRequiredDetailsFields() []string {
	return common.GetRequiredDetailsFieldNames(GetDetailsFieldDefinitions())
}

// GetConnectorInfo returns the static connector metadata.
//
// The ConnectionOAuthConfig block (without DCREndpoint) tells Core to
// use the global admin-configured connection_oauth_clients row for this
// connector — Google does not support Dynamic Client Registration.
func GetConnectorInfo() models.ConnectorDetails {
	return models.ConnectorDetails{
		Name:             "Google Drive",
		Description:      "Pull Google Drive files and metadata as JSON + byte-blob snapshots, and push files back as new Drive files — via OAuth-backed calls against the Google Drive v3 API.",
		Version:          "1.0.0",
		StructureVersion: "1.0.0",
		Author:           "Irmin",
		APIBaseURL:       "/googledrive",
		LogoURL:          "/public/googledrive.png",
		Capabilities: []irminmodels.ConnectorCapability{
			irminmodels.ConnectorCapabilityPull,
			irminmodels.ConnectorCapabilityPush,
		},
		PrimaryCategory: irminmodels.ConnectorCategoryStorage,
		Categories: []irminmodels.ConnectorCategory{
			irminmodels.ConnectorCategoryStorage,
			irminmodels.ConnectorCategoryAnalytics,
		},
		AuthorEmail: "hello@irmin.co",
		ReadMoreURL: "/googledrive/details",
		ConnectionOAuthConfig: &irminmodels.ConnectionOAuthConfig{
			Provider:         "google_drive",
			AuthorizationURL: AuthorizationURL,
			TokenURL:         TokenURL,
			RevocationURL:    RevocationURL,
			// No DCREndpoint — Google requires manual app registration.
			Scopes: DefaultScopes(),
			PKCE:   true,
			ExtraParams: map[string]string{
				"access_type": "offline",
				"prompt":      "consent",
			},
		},
	}
}
