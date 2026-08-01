package stripecontrollers

import (
	"log/slog"

	"irmin-connectors/connectors/common"
	stripeclient "irmin-connectors/connectors/stripe/client"
	"irmin-connectors/connectors/stripe/config"
	"irmin-connectors/db"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	"github.com/gofiber/fiber/v3"
)

// operationTypePull is the string token the common operation layer
// uses for read/pull operations. Extracted so the schema-direction
// switch reads as a named predicate instead of a bare literal in
// multiple files.
const operationTypePull = "pull"

// StripeSchemaProvider advertises the branch-layout the connector
// produces on pull and the paths it accepts on push/patch. Each
// resource gets a dedicated JSON-Schema describing the fields Stripe's
// create/update endpoints accept, matching the official API reference.
// Stripe records can carry even more fields on response than we
// enumerate — `additionalProperties: true` keeps the schema permissive
// so Stripe-Version bumps don't invalidate pulled snapshots or rejected
// push files.
type StripeSchemaProvider struct{}

// InitializeClient is required by the common provider interface but
// does no real work for Stripe — the schema is static and derived
// from the resource map, not from a live API call.
func (p *StripeSchemaProvider) InitializeClient(
	_ fiber.Ctx,
	_ *slog.Logger,
	_ *db.Operation,
) (any, *string, func(), error) {
	return nil, nil, func() {}, nil
}

// GetSchema returns an Irmin ObjectSchema describing the emitted pull
// files and the accepted push paths.
func (p *StripeSchemaProvider) GetSchema(
	_ fiber.Ctx,
	_ any,
	operationType string,
	_ *string,
) (*irminmodels.ObjectSchema, error) {
	jsonCT := "application/json"
	var children []irminmodels.ObjectSchema

	if operationType == operationTypePull {
		// Pull emits one JSON array per pull-enabled resource.
		for _, resource := range stripeclient.KnownResources() {
			if !resource.Pull {
				continue
			}
			recordSchema := resourceRecordSchema(resource.Name, operationType)
			arraySchema := irminmodels.JSONSchema{
				Type:        "array",
				Description: strPtr(pullArrayDescription(resource.Name)),
				Items:       &recordSchema,
			}
			children = append(children, irminmodels.ObjectSchema{
				Name:        resource.Name + ".json",
				Path:        resource.Name + ".json",
				Type:        irminmodels.ObjectTypeStructured,
				ContentType: &jsonCT,
				Schema:      &arraySchema,
			})
		}
	} else {
		// Push / patch: advertise the `<resource>/` directories users
		// write individual record files into. Only write-enabled
		// resources appear.
		for _, resource := range stripeclient.KnownResources() {
			if !resource.Write {
				continue
			}
			recordSchema := resourceRecordSchema(resource.Name, operationType)
			children = append(children, irminmodels.ObjectSchema{
				Name: resource.Name,
				Path: resource.Name,
				Type: irminmodels.ObjectTypeGroup,
				Children: []irminmodels.ObjectSchema{
					{
						Name:        "{id-or-new-*}.json",
						Path:        resource.Name + "/{id-or-new-*}.json",
						Type:        irminmodels.ObjectTypeStructured,
						ContentType: &jsonCT,
						Schema:      &recordSchema,
					},
				},
			})
		}
	}

	root := &irminmodels.ObjectSchema{
		Type:     irminmodels.ObjectTypeGroup,
		Name:     "stripe",
		Path:     "",
		Children: children,
	}
	return root, nil
}

// GetSupportedOperationTypes returns the list of supported operation types.
func (p *StripeSchemaProvider) GetSupportedOperationTypes() []string {
	return common.CapabilitiesToOperationTypes(config.GetConnectorInfo().Capabilities)
}

// resourceRecordSchema builds the JSON schema for a single Stripe
// resource record. `kind` is the resource slug (customers, charges,
// …); `operationType` is "pull" or one of the write operations —
// server-assigned fields are tagged readOnly when the schema is being
// rendered for a write path so the console can hide them from forms.
//
// Stripe records have far more fields than we list; we keep
// `AdditionalProperties: true` so Stripe-Version bumps adding new
// fields don't invalidate pulled snapshots or rejected push files.
func resourceRecordSchema(kind, operationType string) irminmodels.JSONSchema {
	props := map[string]irminmodels.JSONSchema{}
	for k, v := range baseStripeFields(operationType) {
		props[k] = v
	}
	for k, v := range resourceSpecificFields(kind) {
		props[k] = v
	}
	required := baseStripeRequired(operationType)
	required = append(required, resourceSpecificRequired(kind, operationType)...)

	return irminmodels.JSONSchema{
		Type:                 "object",
		Description:          strPtr(recordDescription(kind, operationType)),
		Properties:           props,
		Required:             required,
		AdditionalProperties: true,
	}
}

// baseStripeFields returns the common fields present on every Stripe
// resource record. On write operations, server-assigned fields (id,
// object, created) are omitted from the schema entirely — sending
// them on create/update is either rejected or silently ignored by
// Stripe, and hiding them keeps the console's generated forms clean.
func baseStripeFields(operationType string) map[string]irminmodels.JSONSchema {
	metadataSchema := irminmodels.JSONSchema{
		Type: "object",
		Description: strPtr(
			"Set of key-value pairs you can attach to the record. Individual keys can be unset by posting an empty value to them; all keys can be unset by posting an empty object to metadata.",
		),
		AdditionalProperties: true,
	}

	if operationType != operationTypePull {
		return map[string]irminmodels.JSONSchema{
			"metadata": metadataSchema,
		}
	}

	return map[string]irminmodels.JSONSchema{
		"id": {
			Type:        "string",
			Description: strPtr("Stripe-assigned unique identifier (e.g., cus_…, ch_…)."),
		},
		"object": {
			Type:        "string",
			Description: strPtr("Resource type name (e.g., 'customer', 'charge')."),
		},
		"created": {
			Type:        "integer",
			Description: strPtr("Unix timestamp (seconds) of record creation."),
		},
		"livemode": {
			Type:        "boolean",
			Description: strPtr("true if the record was created in live mode; false for test mode."),
		},
		"metadata": metadataSchema,
	}
}

// baseStripeRequired returns the base required fields. Pull responses
// always include id + object + created + livemode; writes require
// nothing at the base level (resource-specific required fields are
// merged in by the caller).
func baseStripeRequired(operationType string) []string {
	if operationType != operationTypePull {
		return nil
	}
	return []string{"id", "object", "created", "livemode"}
}

// resourceSpecificFields returns the resource-specific top-level
// properties. Covers the full set of fields Stripe's create / update
// endpoints accept (for writable resources) or returns (for pull-only
// resources), so the console can generate complete forms instead of
// forcing users to fall back on `additionalProperties` for anything
// beyond a handful of curated fields.
//
// When Stripe adds new fields, `additionalProperties: true` on the
// parent schema keeps them accessible without a connector bump.
func resourceSpecificFields(kind string) map[string]irminmodels.JSONSchema {
	switch kind {
	case stripeclient.ResourceCustomers:
		return customersFields()
	case stripeclient.ResourceCharges:
		return chargesFields()
	case stripeclient.ResourceSubscriptions:
		return subscriptionsFields()
	case stripeclient.ResourceInvoices:
		return invoicesFields()
	case stripeclient.ResourcePayouts:
		return payoutsFields()
	case stripeclient.ResourceProducts:
		return productsFields()
	case stripeclient.ResourcePrices:
		return pricesFields()
	default:
		return map[string]irminmodels.JSONSchema{}
	}
}

// resourceSpecificRequired returns the fields Stripe requires on
// create for a given resource. Updates never require any specific
// field, so we only emit requireds when we know the caller is on a
// create path (best-effort: patch/push files without the `new-*`
// convention are treated as updates and we skip the required checks
// at the schema level; Stripe will surface the error if the user
// sends an incomplete create).
//
// For pull responses we don't enforce resource-specific required
// fields beyond the base set — Stripe's response shape varies by
// permission scope and API version, so being strict here would
// reject valid snapshots.
func resourceSpecificRequired(kind, operationType string) []string {
	if operationType == operationTypePull {
		return nil
	}
	switch kind {
	case stripeclient.ResourcePrices:
		// Stripe requires currency + product (or product_data) +
		// (unit_amount or custom_unit_amount or billing_scheme=tiered)
		// on create. We list the simplest subset here; users hitting
		// the more exotic paths get a clear Stripe-side error.
		return []string{"currency", "product"}
	case stripeclient.ResourceProducts:
		return []string{"name"}
	case stripeclient.ResourceInvoices:
		// Stripe's POST /v1/invoices requires `customer`. Without it
		// the API returns a 400; pre-validating in the console saves
		// the round-trip.
		return []string{"customer"}
	default:
		return nil
	}
}

// customersFields is the full top-level property set for Stripe
// customer records. Mirrors POST/UPDATE /v1/customers plus the
// response-only fields Stripe returns on GET.
func customersFields() map[string]irminmodels.JSONSchema {
	return map[string]irminmodels.JSONSchema{
		"email": emailField(
			"The customer's email address. Up to 512 characters. Displayed in Stripe dashboard and used for receipts.",
		),
		"name":  stringField("The customer's full name or business name. Max 256 characters."),
		"phone": stringField("The customer's phone number. Max 20 characters."),
		"description": stringField(
			"Arbitrary internal description, shown alongside the customer in the dashboard.",
		),
		"currency": currencyField(
			"Three-letter ISO currency code (lowercase), pinning the customer's default currency.",
		),
		"balance": integerField(
			"Current balance in the smallest currency unit (negative = credit the customer has; positive = debt owed).",
		),
		"delinquent": booleanField(
			"true if the last invoice is overdue. Read-only on create — derived from the customer's invoice history.",
		),
		"default_source": stringField("ID of the default payment source (card or bank account)."),
		"invoice_prefix": stringField(
			"Prefix for invoice numbers assigned to this customer. Must be at least 3 uppercase letters/digits.",
		),
		"next_invoice_sequence": integerField(
			"The sequence number of the next invoice to be generated for this customer.",
		),
		"preferred_locales": arrayOfStringsField(
			"Customer's preferred languages, ordered by preference. Used for localized emails and receipts.",
		),
		"tax_exempt": enumField(
			"Describes the customer's tax exemption status.",
			"none",
			"exempt",
			"reverse",
		),
		"address":  addressSchema(),
		"shipping": shippingSchema(),
		"cash_balance": objectField(
			"Customer's cash balance configuration. Advanced usage; see Stripe's Cash Balance docs.",
		),
		"invoice_settings": customerInvoiceSettingsSchema(),
		"tax":              customerTaxSchema(),
		"tax_id_data":      customerTaxIDDataSchema(),
		"test_clock": stringField(
			"ID of a test clock for this customer. Test-mode only; simulates time progression for subscription testing.",
		),
		"payment_method": stringField("ID of an existing PaymentMethod to attach to the customer on creation."),
		"source": stringField(
			"Tokenized source or source ID to attach. Legacy — prefer `payment_method`.",
		),
		"validate": booleanField(
			"If true, validate address and card details before creating. Defaults to true.",
		),
	}
}

// chargesFields is the top-level schema for charge records. Charges
// are pull-only in the connector, so this schema describes Stripe's
// response shape on GET /v1/charges.
func chargesFields() map[string]irminmodels.JSONSchema {
	return map[string]irminmodels.JSONSchema{
		"amount": integerField(
			"Amount intended to be collected by this charge, in the smallest currency unit.",
		),
		"amount_captured": integerField("Amount captured so far (<= amount)."),
		"amount_refunded": integerField("Amount refunded back to the customer."),
		"currency":        currencyField("Three-letter ISO currency code (lowercase)."),
		"customer":        stringField("ID of the customer this charge is for."),
		"description":     stringField("Free-form description."),
		"paid":            booleanField("true if the charge succeeded or was successfully authorized."),
		"captured": booleanField(
			"true if the full amount was captured. False for authorize-only charges.",
		),
		"refunded": booleanField("true if the charge has been fully refunded."),
		"status":   enumField("Charge status.", "succeeded", "pending", "failed"),
		"receipt_email": emailField(
			"Email to send the receipt to, if different from the customer's email.",
		),
		"receipt_number": stringField("Receipt number generated by Stripe for this charge."),
		"receipt_url":    uriField("URL of the receipt page for this charge."),
		"payment_method": stringField("ID of the PaymentMethod used in this charge."),
		"payment_intent": stringField("ID of the PaymentIntent associated with this charge."),
		"invoice":        stringField("ID of the invoice this charge is for, if any."),
		"balance_transaction": stringField(
			"ID of the balance transaction that describes the impact on your Stripe balance.",
		),
		"failure_code": stringField(
			"Error code explaining the reason for failure, if the charge failed.",
		),
		"failure_message": stringField("Human-readable message for the failure."),
		"outcome": objectField(
			"Risk assessment and network response details from the payment network.",
		),
		"billing_details": billingDetailsSchema(),
		"shipping":        shippingSchema(),
		"statement_descriptor": stringField(
			"Static text appearing on customer's credit card statement (max 22 chars).",
		),
		"statement_descriptor_suffix": stringField("Dynamic suffix appended to the merchant's static prefix."),
		"application_fee_amount":      integerField("Amount of the application fee collected, if applicable."),
		"transfer_data":               objectField("Data about the transfer made by Stripe Connect for this charge."),
		"disputed":                    booleanField("true if the charge has been disputed by the cardholder."),
		"dispute":                     stringField("ID of the dispute, if disputed."),
	}
}

// subscriptionsFields is the top-level schema for subscription
// records. Subscriptions are pull-only in the MVP; if writes are
// added later, items[] and default_tax_rates need their own required
// enumeration.
func subscriptionsFields() map[string]irminmodels.JSONSchema {
	return map[string]irminmodels.JSONSchema{
		"customer": stringField("ID of the customer on this subscription."),
		"status": enumField(
			"Current lifecycle status.",
			"active",
			"past_due",
			"unpaid",
			"canceled",
			"incomplete",
			"incomplete_expired",
			"trialing",
			"paused",
		),
		"current_period_start": integerField("Unix timestamp for the start of the current billing period."),
		"current_period_end":   integerField("Unix timestamp for the end of the current billing period."),
		"cancel_at_period_end": booleanField("true if the subscription will cancel at current_period_end."),
		"canceled_at":          integerField("Unix timestamp of cancellation, if canceled."),
		"cancel_at":            integerField("Unix timestamp of the scheduled cancellation, if set."),
		"trial_start":          integerField("Unix timestamp of the trial start, if any."),
		"trial_end":            integerField("Unix timestamp of the trial end, if any."),
		"start_date":           integerField("Unix timestamp the subscription was first created."),
		"ended_at":             integerField("Unix timestamp the subscription was fully ended."),
		"items": {
			Type:        "object",
			Description: strPtr("List of subscription items. Each item links a price to a quantity."),
			Properties: map[string]irminmodels.JSONSchema{
				"data": {
					Type:                 "array",
					Description:          strPtr("The subscription's items."),
					AdditionalProperties: true,
				},
			},
			AdditionalProperties: true,
		},
		"collection_method":      enumField("How Stripe collects payment.", "charge_automatically", "send_invoice"),
		"default_payment_method": stringField("ID of the default PaymentMethod for this subscription."),
		"default_source": stringField(
			"ID of the default payment source (legacy — prefer default_payment_method).",
		),
		"default_tax_rates":    arrayOfStringsField("IDs of tax rates applied to the subscription."),
		"latest_invoice":       stringField("ID of the most recent invoice this subscription has generated."),
		"pending_setup_intent": stringField("ID of a SetupIntent requiring additional action from the customer."),
		"billing_cycle_anchor": integerField(
			"Unix timestamp determining the day of the month invoice cycles anchor to.",
		),
		"days_until_due": integerField(
			"Days between invoice creation and due date (for send_invoice collection).",
		),
		"description":      stringField("Internal description for the subscription."),
		"pause_collection": objectField("Pause configuration: mode + resumes_at. Null if not paused."),
		"schedule":         stringField("ID of the subscription schedule, if any."),
	}
}

// invoicesFields is the full top-level property set for invoices.
// Mirrors POST /v1/invoices + UPDATE /v1/invoices/{id} request bodies
// and Stripe's GET response shape.
func invoicesFields() map[string]irminmodels.JSONSchema {
	return map[string]irminmodels.JSONSchema{
		"customer": stringField("ID of the customer this invoice is for. REQUIRED on create."),
		"currency": currencyField("Three-letter ISO currency code (lowercase)."),
		"status": enumField(
			"Invoice status.",
			"draft",
			"open",
			"paid",
			"uncollectible",
			"void",
		),
		"number": stringField(
			"Unique human-readable invoice number. Auto-assigned if omitted.",
		),
		"description":          stringField("Free-form description shown on the invoice."),
		"footer":               stringField("Footer displayed on the invoice."),
		"statement_descriptor": stringField("Static text on customer's bank statement (max 22 chars)."),
		"subscription":         stringField("ID of the subscription this invoice was generated for."),
		"auto_advance": booleanField(
			"If true, Stripe will attempt to finalize the draft automatically. Defaults to false for manually-created invoices.",
		),
		"automatically_finalizes_at": integerField(
			"Unix timestamp after which a draft will be automatically finalized.",
		),
		"collection_method": enumField(
			"How Stripe collects payment.",
			"charge_automatically",
			"send_invoice",
		),
		"days_until_due": integerField(
			"Days between finalization and due date (for send_invoice collection).",
		),
		"due_date": integerField(
			"Unix timestamp for the invoice due date. Only applicable when collection_method=send_invoice.",
		),
		"effective_at": integerField(
			"Unix timestamp the invoice is considered effective (for revenue recognition).",
		),
		"default_payment_method": stringField("ID of the default PaymentMethod for this invoice."),
		"default_source": stringField(
			"ID of the default payment source (legacy — prefer default_payment_method).",
		),
		"default_tax_rates": arrayOfStringsField("IDs of tax rates applied to all line items."),
		"account_tax_ids": arrayOfStringsField(
			"IDs of tax IDs on your account that apply to this invoice.",
		),
		"application_fee_amount": integerField("Application fee collected, in the smallest currency unit."),
		"on_behalf_of":           stringField("Account the invoice is on behalf of (for Connect)."),
		"automatic_tax": objectField(
			"Automatic tax calculation config: { enabled: boolean, liability?: object }.",
		),
		"pending_invoice_items_behavior": enumField(
			"What to do with pending invoice items on the customer when this invoice is finalized.",
			"exclude",
			"include",
		),
		"custom_fields": customFieldsSchema(),
		"discounts": arrayOfObjectsField(
			"List of discount IDs or coupon objects to apply to the invoice.",
		),
		"payment_settings": objectField(
			"Payment method and collection behavior: { payment_method_types?: [], default_mandate?, payment_method_options? }.",
		),
		"rendering": objectField(
			"PDF/email rendering options: { amount_tax_display?, pdf?, template_version? }.",
		),
		"shipping_cost": objectField(
			"Shipping cost: { shipping_rate?: string, shipping_rate_data?: object }.",
		),
		"shipping_details": shippingSchema(),
		"transfer_data": objectField(
			"Transfer data for Connect: { destination: string, amount?: integer }.",
		),
		"issuer": objectField(
			"Issuer account: { type: 'self' | 'account', account?: string }.",
		),
		"from_invoice":         objectField("Revision source: { action: 'revision', invoice: string }."),
		"amount_due":           integerField("Final amount due (computed). Smallest currency unit."),
		"amount_paid":          integerField("Amount paid (computed). Smallest currency unit."),
		"amount_remaining":     integerField("Remaining amount due (computed)."),
		"subtotal":             integerField("Total before taxes and discounts."),
		"total":                integerField("Final total after taxes and discounts."),
		"paid":                 booleanField("true when the invoice has been fully paid."),
		"attempted":            booleanField("true if Stripe has attempted to collect payment."),
		"attempt_count":        integerField("Number of payment attempts Stripe has made."),
		"next_payment_attempt": integerField("Unix timestamp of the next scheduled collection attempt."),
	}
}

// payoutsFields is the top-level schema for payout records. Payouts
// are pull-only; this describes Stripe's GET /v1/payouts shape.
func payoutsFields() map[string]irminmodels.JSONSchema {
	return map[string]irminmodels.JSONSchema{
		"amount":   integerField("Payout amount in the smallest currency unit."),
		"currency": currencyField("Three-letter ISO currency code (lowercase)."),
		"status": enumField(
			"Payout status.",
			"pending",
			"in_transit",
			"paid",
			"failed",
			"canceled",
		),
		"arrival_date":                integerField("Unix timestamp when funds are expected to arrive."),
		"method":                      enumField("Payout method.", "standard", "instant"),
		"type":                        enumField("Payout destination type.", "bank_account", "card"),
		"description":                 stringField("Free-form description."),
		"statement_descriptor":        stringField("Description that appears on the recipient's bank statement."),
		"destination":                 stringField("ID of the bank account or card the payout was sent to."),
		"source_type":                 enumField("Source of funds.", "card", "fpx", "bank_account"),
		"failure_code":                stringField("Error code explaining failure, if failed."),
		"failure_message":             stringField("Human-readable failure message."),
		"failure_balance_transaction": stringField("ID of the balance transaction reversing this payout on failure."),
		"balance_transaction":         stringField("ID of the balance transaction reflecting this payout."),
		"automatic":                   booleanField("true if this was an automatic payout."),
		"reconciliation_status":       stringField("Reconciliation status for Stripe's internal accounting."),
		"original_payout":             stringField("ID of the original payout this one replaces, if reissued."),
		"reversed_by":                 stringField("ID of the payout that reverses this one, if reversed."),
	}
}

// productsFields is the full top-level property set for product
// records. Mirrors POST /v1/products request body.
func productsFields() map[string]irminmodels.JSONSchema {
	return map[string]irminmodels.JSONSchema{
		"name":        stringField("Product name, meant to be displayed to customers. REQUIRED on create."),
		"description": stringField("Product description, meant to be displayed to customers."),
		"active": booleanField(
			"true if the product is currently available for purchase. Defaults to true.",
		),
		"id": stringField(
			"Optional user-supplied ID. Must be unique across your Stripe account. If omitted, Stripe generates one.",
		),
		"default_price":      stringField("ID of the default Price for this product."),
		"default_price_data": productDefaultPriceDataSchema(),
		"url":                uriField("URL of a publicly accessible webpage for this product."),
		"statement_descriptor": stringField(
			"Appears on the customer's credit card statement for purchases of this product.",
		),
		"tax_code":           stringField("Tax code ID (e.g., 'txcd_10000000') for automatic tax calculation."),
		"unit_label":         stringField("Label for unit of measure (e.g., 'seat', 'minute'). Max 12 chars."),
		"shippable":          booleanField("Whether this product is shipped (physical goods)."),
		"package_dimensions": packageDimensionsSchema(),
		"images":             imagesArraySchema(),
		"marketing_features": marketingFeaturesSchema(),
	}
}

// pricesFields is the full top-level property set for price records.
// Mirrors POST /v1/prices request body including recurring, tiered,
// and custom-unit-amount pricing schemes.
func pricesFields() map[string]irminmodels.JSONSchema {
	return map[string]irminmodels.JSONSchema{
		"product": stringField(
			"ID of the Product this price belongs to. REQUIRED on create unless `product_data` is supplied.",
		),
		"product_data": objectField(
			"Inline product creation data (alternative to `product`): { name: string, ...optional }.",
		),
		"currency": currencyField("Three-letter ISO currency code (lowercase). REQUIRED on create."),
		"unit_amount": integerField(
			"Price per unit in the smallest currency unit. Required unless billing_scheme=tiered or custom_unit_amount is set.",
		),
		"unit_amount_decimal": stringField(
			"Same as unit_amount but as decimal string with up to 12 decimal places. Mutually exclusive with unit_amount.",
		),
		"custom_unit_amount": customUnitAmountSchema(),
		"active":             booleanField("true if the price is currently available. Defaults to true."),
		"type":               enumField("Price type.", "one_time", "recurring"),
		"billing_scheme":     enumField("How to compute price per period.", "per_unit", "tiered"),
		"tax_behavior": enumField(
			"Whether the price is inclusive or exclusive of taxes.",
			"inclusive",
			"exclusive",
			"unspecified",
		),
		"nickname": stringField("Short brief description shown in internal UIs (not shown to customers)."),
		"lookup_key": stringField(
			"Customer-facing key used to retrieve a price for a given product + configuration.",
		),
		"recurring": priceRecurringSchema(),
		"tiers":     priceTiersSchema(),
		"tiers_mode": enumField(
			"How tiered pricing is computed. Required when billing_scheme=tiered.",
			"graduated",
			"volume",
		),
		"transform_quantity": priceTransformQuantitySchema(),
		"transfer_lookup_key": booleanField(
			"If true, atomically move the lookup_key from an existing price to this one.",
		),
		"currency_options": objectField("Per-currency price overrides. Map of currency-code to override object."),
	}
}

// addressSchema is the Stripe-standard address object reused by
// customers, shipping, and billing_details.
func addressSchema() irminmodels.JSONSchema {
	return irminmodels.JSONSchema{
		Type:        "object",
		Description: strPtr("Postal address."),
		Properties: map[string]irminmodels.JSONSchema{
			"line1":       stringField("Address line 1 (street, P.O. box)."),
			"line2":       stringField("Address line 2 (apartment, suite, unit)."),
			"city":        stringField("City or locality."),
			"state":       stringField("State, province, or region."),
			"postal_code": stringField("ZIP or postal code."),
			"country":     stringField("Two-letter ISO country code (uppercase)."),
		},
		AdditionalProperties: true,
	}
}

// shippingSchema is the shipping-details object (address + name +
// optional phone + tracking) reused across customers, charges, and
// invoices.
func shippingSchema() irminmodels.JSONSchema {
	return irminmodels.JSONSchema{
		Type:        "object",
		Description: strPtr("Shipping information. Appears on invoices emailed to this customer."),
		Properties: map[string]irminmodels.JSONSchema{
			"address":         addressSchema(),
			"name":            stringField("Recipient name."),
			"phone":           stringField("Recipient phone number."),
			"carrier":         stringField("Shipping carrier name (e.g., 'Fedex')."),
			"tracking_number": stringField("Carrier-assigned tracking number."),
		},
		AdditionalProperties: true,
	}
}

// billingDetailsSchema is the billing-details object returned on
// charges (name, email, phone, address).
func billingDetailsSchema() irminmodels.JSONSchema {
	return irminmodels.JSONSchema{
		Type:        "object",
		Description: strPtr("Billing information associated with the payment method."),
		Properties: map[string]irminmodels.JSONSchema{
			"name":    stringField("Full name."),
			"email":   emailField("Email address."),
			"phone":   stringField("Phone number."),
			"address": addressSchema(),
		},
		AdditionalProperties: true,
	}
}

// customerInvoiceSettingsSchema describes the customer-level invoice
// defaults (custom fields, default PM, footer, rendering options).
func customerInvoiceSettingsSchema() irminmodels.JSONSchema {
	return irminmodels.JSONSchema{
		Type:        "object",
		Description: strPtr("Default invoice settings applied to invoices created for this customer."),
		Properties: map[string]irminmodels.JSONSchema{
			"default_payment_method": stringField("ID of the default PaymentMethod for future invoices."),
			"footer":                 stringField("Default footer on customer invoices."),
			"custom_fields":          customFieldsSchema(),
			"rendering_options": objectField(
				"PDF rendering options: { amount_tax_display?: 'exclude_tax' | 'include_inclusive_tax' | null }.",
			),
		},
		AdditionalProperties: true,
	}
}

// customerTaxSchema describes the customer-level tax-calculation
// inputs (IP address for location, validation behavior).
func customerTaxSchema() irminmodels.JSONSchema {
	return irminmodels.JSONSchema{
		Type:        "object",
		Description: strPtr("Tax calculation config for this customer."),
		Properties: map[string]irminmodels.JSONSchema{
			"ip_address": stringField("Customer's IP address for location-based tax calculation."),
			"validate_location": enumField(
				"When to validate the customer's location for tax.",
				"deferred",
				"immediately",
			),
		},
		AdditionalProperties: true,
	}
}

// customerTaxIDDataSchema describes the tax_id_data array supplied on
// customer create. Each entry has a type and value.
func customerTaxIDDataSchema() irminmodels.JSONSchema {
	return irminmodels.JSONSchema{
		Type: "array",
		Description: strPtr(
			"Tax IDs to attach to the customer on creation. Each entry is { type, value } where type is a Stripe-supported tax-ID type (e.g., 'eu_vat', 'us_ein').",
		),
		Items: &irminmodels.JSONSchema{
			Type:        "object",
			Description: strPtr("Tax ID entry."),
			Properties: map[string]irminmodels.JSONSchema{
				"type":  stringField("Tax ID type. See Stripe's tax_id_type reference for the full list."),
				"value": stringField("Tax ID value as a string (e.g., 'DE123456789')."),
			},
			Required:             []string{"type", "value"},
			AdditionalProperties: true,
		},
	}
}

// customFieldsSchema describes the invoice custom-fields array used
// on both invoices and customer invoice_settings.
func customFieldsSchema() irminmodels.JSONSchema {
	return irminmodels.JSONSchema{
		Type: "array",
		Description: strPtr(
			"Up to 4 custom fields displayed on the invoice. Pass an empty array to remove all fields.",
		),
		Items: &irminmodels.JSONSchema{
			Type:        "object",
			Description: strPtr("Custom field entry."),
			Properties: map[string]irminmodels.JSONSchema{
				"name":  stringField("Field name. Max 40 chars."),
				"value": stringField("Field value. Max 140 chars."),
			},
			Required:             []string{"name", "value"},
			AdditionalProperties: true,
		},
	}
}

// packageDimensionsSchema describes the product package-dimensions
// object used for shipping-cost calculations.
func packageDimensionsSchema() irminmodels.JSONSchema {
	return irminmodels.JSONSchema{
		Type: "object",
		Description: strPtr(
			"Physical dimensions of the product, used for shipping-cost calculation. All values in their respective imperial units.",
		),
		Properties: map[string]irminmodels.JSONSchema{
			"height": {Type: "number", Description: strPtr("Height in inches. Max 2 decimal places.")},
			"length": {Type: "number", Description: strPtr("Length in inches. Max 2 decimal places.")},
			"weight": {Type: "number", Description: strPtr("Weight in ounces. Max 2 decimal places.")},
			"width":  {Type: "number", Description: strPtr("Width in inches. Max 2 decimal places.")},
		},
		Required:             []string{"height", "length", "weight", "width"},
		AdditionalProperties: true,
	}
}

// imagesArraySchema is the product images array (up to 8 URLs).
func imagesArraySchema() irminmodels.JSONSchema {
	return irminmodels.JSONSchema{
		Type:        "array",
		Description: strPtr("List of up to 8 image URLs for this product, displayed to customers."),
		Items: &irminmodels.JSONSchema{
			Type:   "string",
			Format: strPtr("uri"),
		},
	}
}

// marketingFeaturesSchema is the product marketing-features array
// (up to 15 bullet points shown in checkout/portal).
func marketingFeaturesSchema() irminmodels.JSONSchema {
	return irminmodels.JSONSchema{
		Type:        "array",
		Description: strPtr("Up to 15 marketing features displayed in customer-facing pages."),
		Items: &irminmodels.JSONSchema{
			Type:        "object",
			Description: strPtr("Marketing feature entry."),
			Properties: map[string]irminmodels.JSONSchema{
				"name": stringField("Feature name. Up to 80 characters."),
			},
			Required:             []string{"name"},
			AdditionalProperties: true,
		},
	}
}

// productDefaultPriceDataSchema describes the default_price_data
// inline-price-creation object on products.
func productDefaultPriceDataSchema() irminmodels.JSONSchema {
	return irminmodels.JSONSchema{
		Type:        "object",
		Description: strPtr("Inline Price creation. Creates a default Price for this product in the same request."),
		Properties: map[string]irminmodels.JSONSchema{
			"currency":            currencyField("Three-letter ISO currency code (lowercase). Required."),
			"unit_amount":         integerField("Price per unit in the smallest currency unit."),
			"unit_amount_decimal": stringField("Decimal string alternative to unit_amount."),
			"recurring":           priceRecurringSchema(),
			"tax_behavior":        enumField("Tax inclusion.", "inclusive", "exclusive", "unspecified"),
			"custom_unit_amount":  customUnitAmountSchema(),
			"metadata": {
				Type:                 "object",
				Description:          strPtr("Key-value metadata for the inline price."),
				AdditionalProperties: true,
			},
		},
		Required:             []string{"currency"},
		AdditionalProperties: true,
	}
}

// priceRecurringSchema describes the recurring-billing config on
// prices (interval, usage_type, aggregate_usage, etc.).
func priceRecurringSchema() irminmodels.JSONSchema {
	return irminmodels.JSONSchema{
		Type:        "object",
		Description: strPtr("Recurring billing configuration. Only valid for type='recurring'."),
		Properties: map[string]irminmodels.JSONSchema{
			"interval": enumField("Billing frequency.", "day", "week", "month", "year"),
			"interval_count": integerField(
				"Number of intervals between billings (e.g., interval=month, interval_count=3 → every 3 months).",
			),
			"usage_type": enumField("How usage is reported.", "licensed", "metered"),
			"aggregate_usage": enumField(
				"How metered usage is aggregated across the period.",
				"sum",
				"last_during_period",
				"last_ever",
				"max",
			),
			"trial_period_days": integerField("Default trial length in days for subscriptions at this price."),
			"meter":             stringField("ID of the Meter tracking the usage, when usage_type=metered."),
		},
		Required:             []string{"interval"},
		AdditionalProperties: true,
	}
}

// priceTiersSchema describes the tiered-pricing array on prices.
func priceTiersSchema() irminmodels.JSONSchema {
	return irminmodels.JSONSchema{
		Type:        "array",
		Description: strPtr("Tier definitions for tiered pricing. Required when billing_scheme=tiered."),
		Items: &irminmodels.JSONSchema{
			Type:        "object",
			Description: strPtr("Pricing tier."),
			Properties: map[string]irminmodels.JSONSchema{
				"up_to": stringField(
					"Upper bound of this tier. Either an integer, or the string 'inf' for the fallback tier.",
				),
				"flat_amount":         integerField("Flat fee for the entire tier, regardless of quantity."),
				"flat_amount_decimal": stringField("Decimal-string alternative to flat_amount."),
				"unit_amount":         integerField("Per-unit price within this tier."),
				"unit_amount_decimal": stringField("Decimal-string alternative to unit_amount."),
			},
			Required:             []string{"up_to"},
			AdditionalProperties: true,
		},
	}
}

// priceTransformQuantitySchema describes the transform_quantity
// object on prices (usage rounding before billing).
func priceTransformQuantitySchema() irminmodels.JSONSchema {
	return irminmodels.JSONSchema{
		Type:        "object",
		Description: strPtr("Usage transformation applied before billing. Cannot be combined with `tiers`."),
		Properties: map[string]irminmodels.JSONSchema{
			"divide_by": integerField("Divide reported usage by this number."),
			"round":     enumField("Rounding direction after dividing.", "up", "down"),
		},
		Required:             []string{"divide_by", "round"},
		AdditionalProperties: true,
	}
}

// customUnitAmountSchema describes the customer-chooses-amount
// configuration on prices (e.g., pay-what-you-want).
func customUnitAmountSchema() irminmodels.JSONSchema {
	return irminmodels.JSONSchema{
		Type:        "object",
		Description: strPtr("Configuration for customer-specified pricing (pay-what-you-want)."),
		Properties: map[string]irminmodels.JSONSchema{
			"enabled": booleanField("Whether customer-specified amounts are enabled."),
			"maximum": integerField("Maximum amount the customer may specify (smallest currency unit)."),
			"minimum": integerField(
				"Minimum amount the customer may specify (smallest currency unit). At least Stripe's minimum charge amount.",
			),
			"preset": integerField("Starting amount suggested to the customer."),
		},
		Required:             []string{"enabled"},
		AdditionalProperties: true,
	}
}

// stringField is a shorthand for `{"type":"string","description":d}`.
// Most of the resource-specific fields are plain strings with a
// description; this removes the ceremony.
func stringField(description string) irminmodels.JSONSchema {
	return irminmodels.JSONSchema{
		Type:        "string",
		Description: strPtr(description),
	}
}

// integerField is a shorthand for `{"type":"integer","description":d}`.
func integerField(description string) irminmodels.JSONSchema {
	return irminmodels.JSONSchema{
		Type:        "integer",
		Description: strPtr(description),
	}
}

// booleanField is a shorthand for `{"type":"boolean","description":d}`.
func booleanField(description string) irminmodels.JSONSchema {
	return irminmodels.JSONSchema{
		Type:        "boolean",
		Description: strPtr(description),
	}
}

// objectField is a shorthand for a free-form object with
// additionalProperties:true. Used when Stripe's shape is too variable
// to enumerate (or when listing every sub-field would bloat the
// schema without adding form value).
func objectField(description string) irminmodels.JSONSchema {
	return irminmodels.JSONSchema{
		Type:                 "object",
		Description:          strPtr(description),
		AdditionalProperties: true,
	}
}

// arrayOfStringsField is a shorthand for a string-array.
func arrayOfStringsField(description string) irminmodels.JSONSchema {
	return irminmodels.JSONSchema{
		Type:        "array",
		Description: strPtr(description),
		Items: &irminmodels.JSONSchema{
			Type: "string",
		},
	}
}

// arrayOfObjectsField is a shorthand for an object-array with
// permissive sub-shape.
func arrayOfObjectsField(description string) irminmodels.JSONSchema {
	return irminmodels.JSONSchema{
		Type:        "array",
		Description: strPtr(description),
		Items: &irminmodels.JSONSchema{
			Type:                 "object",
			AdditionalProperties: true,
		},
	}
}

// enumField produces a constrained-string field. The allowed values
// become `enum` entries so the console can render a dropdown instead
// of a free-text input.
func enumField(description string, values ...string) irminmodels.JSONSchema {
	enumValues := make([]any, len(values))
	for i, v := range values {
		enumValues[i] = v
	}
	return irminmodels.JSONSchema{
		Type:        "string",
		Description: strPtr(description),
		Enum:        enumValues,
	}
}

// emailField is a string field with format:"email" so the console
// renders an email input and validates basic shape client-side.
func emailField(description string) irminmodels.JSONSchema {
	return irminmodels.JSONSchema{
		Type:        "string",
		Description: strPtr(description),
		Format:      strPtr("email"),
	}
}

// uriField is a string field with format:"uri".
func uriField(description string) irminmodels.JSONSchema {
	return irminmodels.JSONSchema{
		Type:        "string",
		Description: strPtr(description),
		Format:      strPtr("uri"),
	}
}

// currencyField is a string field documenting the three-letter
// ISO-4217 currency code convention Stripe uses (lowercase).
func currencyField(description string) irminmodels.JSONSchema {
	return irminmodels.JSONSchema{
		Type:        "string",
		Description: strPtr(description),
	}
}

// pullArrayDescription renders a one-line human description for the
// pulled array file of a given resource type.
func pullArrayDescription(kind string) string {
	switch kind {
	case stripeclient.ResourceCustomers:
		return "All Stripe customers, as returned by GET /v1/customers."
	case stripeclient.ResourceCharges:
		return "All Stripe charges, as returned by GET /v1/charges."
	case stripeclient.ResourceSubscriptions:
		return "All Stripe subscriptions, as returned by GET /v1/subscriptions."
	case stripeclient.ResourceInvoices:
		return "All Stripe invoices, as returned by GET /v1/invoices."
	case stripeclient.ResourcePayouts:
		return "All Stripe payouts, as returned by GET /v1/payouts."
	default:
		return "Stripe resource records."
	}
}

// recordDescription returns a per-resource record description,
// tailored for pull (describes the wire shape Stripe returns) vs
// push/patch (describes the shape Stripe accepts).
func recordDescription(kind, operationType string) string {
	if operationType == operationTypePull {
		return "A Stripe " + humanSingular(kind) + " record in the exact wire shape Stripe returns. " +
			"Server-assigned fields (id, object, created) are always present; additional resource-specific " +
			"fields beyond those enumerated here may appear as Stripe evolves."
	}
	return "A Stripe " + humanSingular(kind) + " record for create or update. Server-assigned fields " +
		"(id, object, created, livemode) are ignored if present — Stripe controls them. " +
		"Additional fields documented in Stripe's API are accepted."
}

// humanSingular maps a resource slug to the singular noun form for
// prose (customers → customer, prices → price). Kept as an explicit
// table rather than naive trailing-'s' trimming so future resources
// with irregular plurals (taxes, addresses) have a clear home.
func humanSingular(kind string) string {
	switch kind {
	case stripeclient.ResourceCustomers:
		return "customer"
	case stripeclient.ResourceCharges:
		return "charge"
	case stripeclient.ResourceSubscriptions:
		return "subscription"
	case stripeclient.ResourceInvoices:
		return "invoice"
	case stripeclient.ResourcePayouts:
		return "payout"
	case stripeclient.ResourceProducts:
		return "product"
	case stripeclient.ResourcePrices:
		return "price"
	default:
		return kind
	}
}

// strPtr returns a pointer to the given string. Inline helpers like
// this appear in every connector's schema file; kept local so the
// schema package surface stays read-only.
func strPtr(s string) *string {
	return &s
}

// OperationSchemaGet godoc
// @Summary Get Stripe operation schema
// @Description Get the schema for Stripe pull / push / patch operations as an Irmin-compatible ObjectSchema.
// @Tags stripe
// @Security SystemTokenAuth
// @Accept json
// @Produce json
// @Param operation path string true "Operation type" Enums(pull, push, patch)
// @Success 200 {object} irminmodels.ObjectSchema "Operation schema retrieved successfully"
// @Failure 400 {object} fiber.Map "Bad request"
// @Failure 401 {object} fiber.Map "Unauthorized"
// @Failure 404 {object} fiber.Map "Operation not found"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /stripe/operation/schema/{operation} [post]
func (cs *Controllers) OperationSchemaGet(c fiber.Ctx) error {
	provider := &StripeSchemaProvider{}
	return common.HandleOperationSchemaGet(c, provider, cs.Logger, cs.DB, cs.App)
}

// SubscribeToChanges is not supported by the Stripe connector.
func (cs *Controllers) SubscribeToChanges(c fiber.Ctx) error {
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"error": "Subscribe to changes is not supported by the Stripe connector",
	})
}

// UnsubscribeFromChanges is not supported by the Stripe connector.
func (cs *Controllers) UnsubscribeFromChanges(c fiber.Ctx) error {
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"error": "Unsubscribe from changes is not supported by the Stripe connector",
	})
}
