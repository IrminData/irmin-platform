//nolint:testpackage // Testing internal helpers requires same package
package stripecontrollers

import (
	"slices"
	"testing"

	stripeclient "irmin-connectors/connectors/stripe/client"
)

// TestGetSchema_PushOnlyListsWriteEnabledResources ensures that the
// push/patch schema directory tree only advertises resources with
// Write:true in KnownResources. If someone accidentally flipped
// `charges` to writable (it isn't, in MVP), the console would expose
// a "New charge" form and users would push files that Stripe rejects.
func TestGetSchema_PushOnlyListsWriteEnabledResources(t *testing.T) {
	p := &StripeSchemaProvider{}
	root, err := p.GetSchema(nil, nil, "push", nil)
	if err != nil {
		t.Fatalf("GetSchema push: %v", err)
	}

	// Expected: only the four Write:true resources in KnownResources.
	wantResources := []string{
		stripeclient.ResourceCustomers,
		stripeclient.ResourceInvoices,
		stripeclient.ResourceProducts,
		stripeclient.ResourcePrices,
	}
	gotResources := make([]string, 0, len(root.Children))
	for _, c := range root.Children {
		gotResources = append(gotResources, c.Name)
	}
	slices.Sort(gotResources)
	slices.Sort(wantResources)
	if !slices.Equal(gotResources, wantResources) {
		t.Errorf("push schema resources = %v, want %v", gotResources, wantResources)
	}

	// Each push resource advertises the `{id-or-new-*}.json` filename
	// convention so the console knows how to name created files.
	for _, resource := range root.Children {
		if len(resource.Children) != 1 {
			t.Errorf("resource %q: expected one filename child, got %d", resource.Name, len(resource.Children))
			continue
		}
		child := resource.Children[0]
		if child.Name != "{id-or-new-*}.json" {
			t.Errorf("resource %q: filename convention = %q, want {id-or-new-*}.json", resource.Name, child.Name)
		}
	}
}

// TestGetSchema_PullListsAllPullableResources ensures the pull schema
// advertises every Pull:true resource — the set is larger than push
// because charges / subscriptions / payouts are read-only in MVP.
func TestGetSchema_PullListsAllPullableResources(t *testing.T) {
	p := &StripeSchemaProvider{}
	root, err := p.GetSchema(nil, nil, "pull", nil)
	if err != nil {
		t.Fatalf("GetSchema pull: %v", err)
	}
	wantResources := []string{
		stripeclient.ResourceCustomers + ".json",
		stripeclient.ResourceCharges + ".json",
		stripeclient.ResourceSubscriptions + ".json",
		stripeclient.ResourceInvoices + ".json",
		stripeclient.ResourcePayouts + ".json",
	}
	gotResources := make([]string, 0, len(root.Children))
	for _, c := range root.Children {
		gotResources = append(gotResources, c.Name)
	}
	slices.Sort(gotResources)
	slices.Sort(wantResources)
	if !slices.Equal(gotResources, wantResources) {
		t.Errorf("pull schema resources = %v, want %v", gotResources, wantResources)
	}
}

// TestPushSchema_ExcludesServerAssignedFields guards against a class
// of regression where someone adds object/created/livemode to the
// push-field map. Those are Stripe-assigned; letting them through
// surfaces read-only fields as editable in generated forms and
// confuses users when Stripe silently ignores them on the POST.
//
// `id` is specifically allowed on products — Stripe's POST /v1/products
// uniquely permits a user-supplied id. Every other writable resource
// treats `id` as server-assigned.
func TestPushSchema_ExcludesServerAssignedFields(t *testing.T) {
	// Fields Stripe ALWAYS assigns on create, regardless of resource.
	serverAssigned := []string{"object", "created", "livemode"}

	for _, resource := range stripeclient.KnownResources() {
		if !resource.Write {
			continue
		}
		schema := resourceRecordSchema(resource.Name, "push")
		for _, field := range serverAssigned {
			if _, ok := schema.Properties[field]; ok {
				t.Errorf("push schema for %q leaks server-assigned field %q", resource.Name, field)
			}
		}
		// `id` is server-assigned on everything EXCEPT products.
		if resource.Name != stripeclient.ResourceProducts {
			if _, ok := schema.Properties["id"]; ok {
				t.Errorf("push schema for %q leaks server-assigned field \"id\"", resource.Name)
			}
		}
	}
}

// TestPullSchema_IncludesServerAssignedFields is the inverse pin —
// pull snapshots MUST contain the base-record fields because that's
// what Stripe actually returns.
func TestPullSchema_IncludesServerAssignedFields(t *testing.T) {
	serverAssigned := []string{"id", "object", "created", "livemode"}

	for _, resource := range stripeclient.KnownResources() {
		if !resource.Pull {
			continue
		}
		schema := resourceRecordSchema(resource.Name, "pull")
		for _, field := range serverAssigned {
			if _, ok := schema.Properties[field]; !ok {
				t.Errorf("pull schema for %q missing base field %q", resource.Name, field)
			}
		}
	}
}

// TestPushRequired_CoversKnownCreateConstraints pins the required-set
// for write operations to match Stripe's actual create-endpoint
// constraints. Without these, users hit Stripe's 400 instead of
// console-side validation.
func TestPushRequired_CoversKnownCreateConstraints(t *testing.T) {
	cases := []struct {
		kind string
		want []string
	}{
		{kind: stripeclient.ResourceProducts, want: []string{"name"}},
		{kind: stripeclient.ResourcePrices, want: []string{"currency", "product"}},
		{kind: stripeclient.ResourceInvoices, want: []string{"customer"}},
		// customers has no required field on Stripe's side — the API
		// lets you create with an empty body. Encode that by checking
		// the slice is empty.
		{kind: stripeclient.ResourceCustomers, want: []string{}},
	}
	for _, tc := range cases {
		t.Run(tc.kind, func(t *testing.T) {
			schema := resourceRecordSchema(tc.kind, "push")
			// Required on push has only resourceSpecificRequired (no
			// base requireds for writes).
			got := schema.Required
			if len(got) == 0 {
				got = []string{}
			}
			slices.Sort(got)
			want := append([]string{}, tc.want...)
			slices.Sort(want)
			if !slices.Equal(got, want) {
				t.Errorf("required fields for %q push = %v, want %v", tc.kind, got, want)
			}
		})
	}
}

// TestEnumField_PopulatesEnum verifies that closed-set string fields
// land as real enum arrays (not just prose in the description) so the
// console can render dropdowns. Walks every writable resource and
// checks known-enum fields.
func TestEnumField_PopulatesEnum(t *testing.T) {
	cases := []struct {
		kind   string
		field  string
		values []string
	}{
		{
			kind:   stripeclient.ResourceInvoices,
			field:  "status",
			values: []string{"draft", "open", "paid", "uncollectible", "void"},
		},
		{
			kind:   stripeclient.ResourceInvoices,
			field:  "collection_method",
			values: []string{"charge_automatically", "send_invoice"},
		},
		{
			kind:   stripeclient.ResourcePrices,
			field:  "type",
			values: []string{"one_time", "recurring"},
		},
		{
			kind:   stripeclient.ResourcePrices,
			field:  "billing_scheme",
			values: []string{"per_unit", "tiered"},
		},
		{
			kind:   stripeclient.ResourcePrices,
			field:  "tax_behavior",
			values: []string{"inclusive", "exclusive", "unspecified"},
		},
		{
			kind:   stripeclient.ResourceCustomers,
			field:  "tax_exempt",
			values: []string{"none", "exempt", "reverse"},
		},
	}
	for _, tc := range cases {
		t.Run(tc.kind+"."+tc.field, func(t *testing.T) {
			schema := resourceRecordSchema(tc.kind, "push")
			field, ok := schema.Properties[tc.field]
			if !ok {
				t.Fatalf("field %q missing on %q push schema", tc.field, tc.kind)
			}
			if len(field.Enum) != len(tc.values) {
				t.Errorf("field %q enum size = %d, want %d (values %v)",
					tc.field, len(field.Enum), len(tc.values), tc.values)
				return
			}
			// Convert []any → []string for comparison.
			got := make([]string, 0, len(field.Enum))
			for _, v := range field.Enum {
				s, isString := v.(string)
				if !isString {
					t.Errorf("field %q enum contains non-string %v (%T)", tc.field, v, v)
					return
				}
				got = append(got, s)
			}
			slices.Sort(got)
			want := append([]string{}, tc.values...)
			slices.Sort(want)
			if !slices.Equal(got, want) {
				t.Errorf("field %q enum values = %v, want %v", tc.field, got, want)
			}
		})
	}
}

// TestCustomersFields_CoversStripeCreateParams is an anti-regression
// check on the customer field list. Enumerates the fields Stripe's
// POST /v1/customers accepts and fails if any go missing from the
// schema — the original complaint that triggered this expansion was
// "13 curated fields, users can't truly push anything."
func TestCustomersFields_CoversStripeCreateParams(t *testing.T) {
	// Fields Stripe's Customer create/update API documents. Expanded
	// pulls from https://docs.stripe.com/api/customers/create at time
	// of writing. When Stripe adds a new param, extend this list
	// and the schema together.
	stripeCustomerWriteFields := []string{
		"address", "balance", "cash_balance", "description", "email",
		"invoice_prefix", "invoice_settings", "name", "next_invoice_sequence",
		"payment_method", "phone", "preferred_locales", "shipping", "source",
		"tax", "tax_exempt", "tax_id_data", "test_clock", "validate",
	}
	fields := customersFields()
	for _, f := range stripeCustomerWriteFields {
		if _, ok := fields[f]; !ok {
			t.Errorf("customers field %q missing from schema (Stripe's API accepts it)", f)
		}
	}
}

// TestInvoicesFields_CoversStripeCreateParams is the parallel check
// for invoices. Covers the main fields POST /v1/invoices accepts.
func TestInvoicesFields_CoversStripeCreateParams(t *testing.T) {
	stripeInvoiceWriteFields := []string{
		"account_tax_ids", "application_fee_amount", "auto_advance",
		"automatic_tax", "automatically_finalizes_at", "collection_method",
		"currency", "custom_fields", "customer", "days_until_due",
		"default_payment_method", "default_source", "default_tax_rates",
		"description", "discounts", "due_date", "effective_at", "footer",
		"from_invoice", "issuer", "number", "on_behalf_of",
		"payment_settings", "pending_invoice_items_behavior", "rendering",
		"shipping_cost", "shipping_details", "statement_descriptor",
		"subscription", "transfer_data",
	}
	fields := invoicesFields()
	for _, f := range stripeInvoiceWriteFields {
		if _, ok := fields[f]; !ok {
			t.Errorf("invoices field %q missing from schema (Stripe's API accepts it)", f)
		}
	}
}

// TestPricesFields_CoversStripeCreateParams pins the price field
// coverage. Tiered pricing + recurring + custom_unit_amount are the
// non-obvious ones that silently missed the first pass.
func TestPricesFields_CoversStripeCreateParams(t *testing.T) {
	stripePriceWriteFields := []string{
		"active", "billing_scheme", "currency", "currency_options",
		"custom_unit_amount", "lookup_key", "nickname", "product",
		"product_data", "recurring", "tax_behavior", "tiers", "tiers_mode",
		"transfer_lookup_key", "transform_quantity", "unit_amount",
		"unit_amount_decimal",
	}
	fields := pricesFields()
	for _, f := range stripePriceWriteFields {
		if _, ok := fields[f]; !ok {
			t.Errorf("prices field %q missing from schema (Stripe's API accepts it)", f)
		}
	}
}

// TestProductsFields_CoversStripeCreateParams pins the product field
// coverage.
func TestProductsFields_CoversStripeCreateParams(t *testing.T) {
	stripeProductWriteFields := []string{
		"active", "default_price_data", "description", "id", "images",
		"marketing_features", "name", "package_dimensions", "shippable",
		"statement_descriptor", "tax_code", "unit_label", "url",
	}
	fields := productsFields()
	for _, f := range stripeProductWriteFields {
		if _, ok := fields[f]; !ok {
			t.Errorf("products field %q missing from schema (Stripe's API accepts it)", f)
		}
	}
}

// TestFormats_AppliedToEmailAndURIFields verifies Format:"email" and
// Format:"uri" land on the fields where they make sense. The console
// uses these to render appropriate input types.
func TestFormats_AppliedToEmailAndURIFields(t *testing.T) {
	customer := resourceRecordSchema(stripeclient.ResourceCustomers, "push")
	emailField, ok := customer.Properties["email"]
	if !ok || emailField.Format == nil || *emailField.Format != "email" {
		t.Errorf("customer.email should have format:email, got %+v", emailField.Format)
	}

	product := resourceRecordSchema(stripeclient.ResourceProducts, "push")
	urlField, ok := product.Properties["url"]
	if !ok || urlField.Format == nil || *urlField.Format != "uri" {
		t.Errorf("product.url should have format:uri, got %+v", urlField.Format)
	}
	imagesField, ok := product.Properties["images"]
	if !ok {
		t.Fatal("product.images missing")
	}
	if imagesField.Items == nil || imagesField.Items.Format == nil || *imagesField.Items.Format != "uri" {
		t.Errorf("product.images[] should have format:uri on items")
	}
}

// TestAdditionalProperties_PermissiveOnAllResources ensures every
// resource keeps AdditionalProperties:true so new Stripe fields
// don't invalidate snapshots or rejected pushes across API-version
// bumps. This is deliberate policy — if someone flips it off to be
// "strict", users start seeing Stripe's new fields fail schema
// validation inside Irmin before they even hit the API.
func TestAdditionalProperties_PermissiveOnAllResources(t *testing.T) {
	for _, resource := range stripeclient.KnownResources() {
		for _, op := range []string{"pull", "push"} {
			// Skip operation types the resource doesn't support.
			if op == "pull" && !resource.Pull {
				continue
			}
			if op == "push" && !resource.Write {
				continue
			}
			schema := resourceRecordSchema(resource.Name, op)
			// AdditionalProperties is `any` (JSON-Schema spec: bool OR
			// sub-schema); we use bool so type-assert and verify.
			ok, isBool := schema.AdditionalProperties.(bool)
			if !isBool || !ok {
				t.Errorf("%s %s: additionalProperties should be bool true, got %T=%v",
					resource.Name, op, schema.AdditionalProperties, schema.AdditionalProperties)
			}
		}
	}
}
