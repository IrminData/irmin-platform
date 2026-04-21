// Package config declares Stripe's DynamicField schema and the
// ConnectorDetails payload served from the /info endpoint.
//
// Auth is **restricted API key**, not OAuth — Stripe's OAuth (Stripe
// Connect) requires pre-registered platform apps and doesn't support
// RFC 7591 dynamic client registration, which adds ops overhead
// without exercising the DCR path the OAuth roadmap wants to prove.
// Users generate a restricted key scoped to the resources they want
// Irmin to touch; the merchant picks the least-privilege scopes in
// their Stripe dashboard.
package config

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/models"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// DefaultAPIVersion pins the Stripe API version Irmin stamps on every
// outbound request when the Connection's settings don't override it.
// Kept current-ish and advertised in the field help text so users know
// which shape to expect in pulled parquet. Bump deliberately; a bump
// can silently rename fields in downstream schemas.
const DefaultAPIVersion = "2026-03-25.dahlia"

// GetDetailsFieldDefinitions returns all detail fields with their metadata.
func GetDetailsFieldDefinitions() map[string]irminmodels.DynamicField {
	details, _ := initializeFieldDefinitions()
	return details
}

// GetSettingsFieldDefinitions returns settings fields.
func GetSettingsFieldDefinitions() map[string]irminmodels.DynamicField {
	_, settings := initializeFieldDefinitions()
	return settings
}

// GetRequiredFields returns the mandatory form fields for Stripe.
func GetRequiredFields() []string {
	details, settings := initializeFieldDefinitions()
	return common.GetRequiredFieldNames(details, settings)
}

// GetOptionalFields returns the optional form fields for Stripe.
func GetOptionalFields() []string {
	details, settings := initializeFieldDefinitions()
	return common.GetOptionalFieldNames(details, settings)
}

// GetDetailsFields returns the detail-specific fields.
func GetDetailsFields() []string {
	details, _ := initializeFieldDefinitions()
	return common.GetDetailsFieldNames(details)
}

// GetRequiredDetailsFields returns only the required detail-specific fields.
func GetRequiredDetailsFields() []string {
	details, _ := initializeFieldDefinitions()
	return common.GetRequiredDetailsFieldNames(details)
}

// GetSettingsFields returns the settings-specific fields.
func GetSettingsFields() []string {
	_, settings := initializeFieldDefinitions()
	return common.GetSettingsFieldNames(settings)
}

// GetRequiredSettingsFields returns only the required settings-specific fields.
func GetRequiredSettingsFields() []string {
	_, settings := initializeFieldDefinitions()
	return common.GetRequiredSettingsFieldNames(settings)
}

func initializeFieldDefinitions() (
	map[string]irminmodels.DynamicField,
	map[string]irminmodels.DynamicField,
) {
	detailsFieldDefinitions := map[string]irminmodels.DynamicField{
		"api_key": {
			Type:     "password",
			Label:    "Stripe API key",
			Required: true,
			Secret:   true,
			Example:  "rk_live_...",
			HelpText: "A Stripe **restricted API key**. Generate one at " +
				"https://dashboard.stripe.com/apikeys with the minimum " +
				"resource permissions this Connection needs (e.g., " +
				"Read for Customers/Charges if you only pull; add Write " +
				"for resources you intend to push to). Using the default " +
				"secret key (`sk_...`) works but grants full account " +
				"access; prefer a restricted key.",
		},
	}

	settingsFieldDefinitions := map[string]irminmodels.DynamicField{
		"api_version": {
			Type:     "text",
			Label:    "Stripe API version",
			Required: false,
			Example:  DefaultAPIVersion,
			HelpText: "Pin the Stripe API version stamped on every " +
				"outbound request via the `Stripe-Version` header. Leave " +
				"empty to use Irmin's default (" + DefaultAPIVersion +
				"). Set explicitly if you need schema stability across " +
				"Stripe releases — bumping silently can change field " +
				"shapes in pulled JSON.",
		},
		"max_records_per_resource": {
			Type:     "text",
			Label:    "Max records per resource",
			Required: false,
			Example:  "50000",
			HelpText: "Cap the number of records pulled per resource " +
				"type (customers, charges, …). Protects the connector " +
				"from OOM on Stripe accounts with millions of records. " +
				"Leave empty for no cap. Positive integer only; negative " +
				"or non-numeric values are ignored.",
		},
	}

	return detailsFieldDefinitions, settingsFieldDefinitions
}

// GetConnectorInfo returns the default connector information for Stripe.
func GetConnectorInfo() models.ConnectorDetails {
	return models.ConnectorDetails{
		Name:             "Stripe",
		Description:      "Pull Stripe resources (customers, charges, invoices, subscriptions, payouts) as JSON snapshots, and push/patch customers, invoices, products, and prices.",
		Version:          "1.0.0",
		StructureVersion: "1.0.0",
		Author:           "Tim Borovkov / Irmin",
		APIBaseURL:       "/stripe",
		LogoURL:          "/public/stripe.png",
		Capabilities: []irminmodels.ConnectorCapability{
			irminmodels.ConnectorCapabilityPull,
			irminmodels.ConnectorCapabilityPush,
			irminmodels.ConnectorCapabilityApplyPatch,
		},
		Locales:         []string{"en"},
		PrimaryCategory: irminmodels.ConnectorCategoryPayment,
		Categories: []irminmodels.ConnectorCategory{
			irminmodels.ConnectorCategoryPayment,
			irminmodels.ConnectorCategoryAnalytics,
			irminmodels.ConnectorCategoryECommerce,
		},
		AuthorEmail: "hello@irmin.co",
		ReadMoreURL: "/stripe/details",
	}
}
