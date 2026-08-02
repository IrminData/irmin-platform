//nolint:testpackage // Testing internal helpers requires same package
package stripecontrollers

import (
	"context"
	"encoding/json"
	"net/url"
	"strings"
	"testing"

	"irmin-connectors/connectors/common"
	"irmin-connectors/db"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

func TestJSONPointerToFormKey(t *testing.T) {
	cases := map[string]string{
		"email":                       "email",
		"metadata/plan":               "metadata[plan]",
		"items/0/price":               "items[0][price]",
		"metadata/a~1b":               "metadata[a/b]", // ~1 decodes to /
		"some~0field":                 "some~field",    // ~0 decodes to ~
		"payment_settings/currencies": "payment_settings[currencies]",
	}
	for in, want := range cases {
		if got := jsonPointerToFormKey(in); got != want {
			t.Errorf("jsonPointerToFormKey(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestGroupPatchesByResource(t *testing.T) {
	emailValue := any("new@example.com")
	planValue := any("pro")
	ops := []irminmodels.PatchOperation{
		{Op: "replace", Path: "/customers/cus_abc.json/email", Value: &emailValue},
		{Op: "replace", Path: "/customers/cus_abc.json/metadata/plan", Value: &planValue},
		{Op: "replace", Path: "/invoices/in_xyz.json/description", Value: &emailValue},
	}
	grouped, err := common.GroupPatchesByFileKey(ops)
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if len(grouped["customers/cus_abc.json"]) != 2 {
		t.Errorf("customers/cus_abc.json: got %d ops", len(grouped["customers/cus_abc.json"]))
	}
	if len(grouped["invoices/in_xyz.json"]) != 1 {
		t.Errorf("invoices/in_xyz.json: got %d ops", len(grouped["invoices/in_xyz.json"]))
	}
}

func TestAppendValueToForm_PrimitiveAndNested(t *testing.T) {
	out := url.Values{}
	if err := appendValueToForm("email", "alice@example.com", out); err != nil {
		t.Fatalf("flat value: %v", err)
	}
	if out.Get("email") != "alice@example.com" {
		t.Errorf("flat value lost: %v", out)
	}

	out = url.Values{}
	if err := appendValueToForm("metadata", map[string]any{"plan": "pro"}, out); err != nil {
		t.Fatalf("nested value: %v", err)
	}
	if out.Get("metadata[plan]") != "pro" {
		t.Errorf("nested map lost: %v", out)
	}
}

func TestAppendValueToForm_PropagatesError(t *testing.T) {
	// channels aren't JSON-marshalable — the helper must surface the
	// error rather than silently drop the field, which would leave
	// Stripe with a missing update and the user seeing "success".
	out := url.Values{}
	err := appendValueToForm("bad", make(chan int), out)
	if err == nil {
		t.Fatalf("expected error for unmarshalable value")
	}
	if len(out) != 0 {
		t.Errorf("form should be untouched on error, got %v", out)
	}
}

func TestApplyResourcePatches_RejectsReadOnly(t *testing.T) {
	cs := &Controllers{}
	err := cs.applyResourcePatches(
		context.Background(), nil /* stripe client */, "charges/ch_1.json",
		[]irminmodels.PatchOperation{{Op: "replace", Path: "/charges/ch_1.json/amount"}},
		&db.Operation{},
	)
	if err == nil || !strings.Contains(err.Error(), "read-only") {
		t.Errorf("expected read-only rejection, got %v", err)
	}
}

func TestApplyResourcePatches_RejectsNewPath(t *testing.T) {
	emailValue := any("alice@example.com")
	cs := &Controllers{}
	err := cs.applyResourcePatches(
		context.Background(), nil, "customers/new-alice.json",
		[]irminmodels.PatchOperation{{Op: "replace", Path: "/customers/new-alice.json/email", Value: &emailValue}},
		&db.Operation{},
	)
	if err == nil || !strings.Contains(err.Error(), "create target") {
		t.Errorf("expected new-path rejection, got %v", err)
	}
}

func TestApplyResourcePatches_RejectsNilValue(t *testing.T) {
	cs := &Controllers{}
	err := cs.applyResourcePatches(
		context.Background(), nil, "customers/cus_abc.json",
		[]irminmodels.PatchOperation{{Op: "replace", Path: "/customers/cus_abc.json/email", Value: nil}},
		&db.Operation{},
	)
	if err == nil || !strings.Contains(err.Error(), "requires a value") {
		t.Errorf("expected nil-value rejection, got %v", err)
	}
}

func TestApplyResourcePatches_RejectsUnsupportedOps(t *testing.T) {
	cases := []string{"move", "copy", "frobnicate"}
	for _, op := range cases {
		t.Run(op, func(t *testing.T) {
			cs := &Controllers{}
			err := cs.applyResourcePatches(
				context.Background(), nil, "customers/cus_abc.json",
				[]irminmodels.PatchOperation{{Op: op, Path: "/customers/cus_abc.json/email"}},
				&db.Operation{},
			)
			if err == nil {
				t.Errorf("expected error for op %q", op)
			}
		})
	}
}

func TestApplyResourcePatches_RejectsWholeResourceReplace(t *testing.T) {
	value := any(map[string]any{"email": "x"})
	cs := &Controllers{}
	err := cs.applyResourcePatches(
		context.Background(), nil, "customers/cus_abc.json",
		// Path equals the file key exactly — no field suffix, meaning
		// "replace the whole record". We reject this; use push instead.
		[]irminmodels.PatchOperation{{Op: "replace", Path: "/customers/cus_abc.json", Value: &value}},
		&db.Operation{},
	)
	if err == nil || !strings.Contains(err.Error(), "entire resource") {
		t.Errorf("expected whole-resource rejection, got %v", err)
	}
}

func TestIsArrayIndexPath(t *testing.T) {
	cases := map[string]bool{
		"email":           false,
		"metadata/plan":   false,
		"items/0/price":   true,  // literal array index "0"
		"items/10/price":  true,  // multi-digit
		"metadata/0field": false, // digit in a larger token — a key, not an index
		"0":               true,  // bare index
		"":                false,
		"/items/0/price":  true,
	}
	for path, want := range cases {
		if got := isArrayIndexPath(path); got != want {
			t.Errorf("isArrayIndexPath(%q) = %v, want %v", path, got, want)
		}
	}
}

func TestApplyResourcePatches_RejectsArrayIndexRemove(t *testing.T) {
	// "remove" on an array element can't be honored — Stripe's form
	// API doesn't renumber arrays on partial update. Reject up front
	// instead of silently sending `items[2]=""` and surprising Stripe.
	// Using products because it's write-enabled and `images` is a
	// real Stripe array field.
	cs := &Controllers{}
	err := cs.applyResourcePatches(
		context.Background(), nil, "products/prod_abc.json",
		[]irminmodels.PatchOperation{{Op: "remove", Path: "/products/prod_abc.json/images/1"}},
		&db.Operation{},
	)
	if err == nil {
		t.Fatalf("expected rejection of array-index remove")
	}
	if !strings.Contains(err.Error(), "array element") {
		t.Errorf("error should mention array element: %v", err)
	}
}

// TestApplySingleOp_NullValueClearsField verifies the field-clear path
// for `replace` / `add` with a JSON null value. Before this was wired
// up, the null fell through to setValueInForm → JSONToForm, which
// silently skipped the null key and returned ErrEmptyJSONInput — the
// user saw "refusing to send an empty payload" instead of a clean
// field-clear. A JSON-Patch `replace` of `null` is spec-legal and must
// map to Stripe's "send the key with an empty value" idiom, matching
// `remove`.
func TestApplySingleOp_NullValueClearsField(t *testing.T) {
	var nullValue any
	nullPtr := &nullValue
	cases := []struct {
		name string
		op   string
	}{
		{name: "replace with null", op: "replace"},
		{name: "add with null", op: "add"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			form := url.Values{}
			err := applySingleOp(
				irminmodels.PatchOperation{
					Op:    tc.op,
					Path:  "/customers/cus_abc.json/email",
					Value: nullPtr,
				},
				"email",
				form,
			)
			if err != nil {
				t.Fatalf("%s null: unexpected error %v", tc.op, err)
			}
			// Stripe's clear-field idiom: key present, value empty.
			// form.Get returns "" both for "present-but-empty" and
			// "absent", so check Has explicitly.
			if !form.Has("email") {
				t.Errorf("%s null: form should contain key \"email\" to clear it, got %v", tc.op, form)
			}
			if got := form.Get("email"); got != "" {
				t.Errorf("%s null: form[email] = %q, want \"\"", tc.op, got)
			}
		})
	}
}

// TestApplySingleOp_NullValueOnArrayIndexRejected ensures the
// array-index guard covers null-value clears too. Stripe can't clear
// a single indexed element (no renumber semantics), so clearing
// `images/1` via `replace:null` is as unsound as removing it.
func TestApplySingleOp_NullValueOnArrayIndexRejected(t *testing.T) {
	var nullValue any
	form := url.Values{}
	err := applySingleOp(
		irminmodels.PatchOperation{
			Op:    "replace",
			Path:  "/products/prod_abc.json/images/1",
			Value: &nullValue,
		},
		"images/1",
		form,
	)
	if err == nil {
		t.Fatalf("expected rejection for array-index null replace")
	}
	if !strings.Contains(err.Error(), "array element") {
		t.Errorf("error should mention array element: %v", err)
	}
}

// TestPatchOperation_ShapeSanity pins the Go SDK types we depend
// on — a signal test so the patch controller stays in sync with the
// SDK's JSON tag names and value pointer shape.
func TestPatchOperation_ShapeSanity(t *testing.T) {
	raw := `[{"op":"replace","path":"/customers/cus_abc.json/email","value":"new@example.com"}]`
	var ops []irminmodels.PatchOperation
	if err := json.Unmarshal([]byte(raw), &ops); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(ops) != 1 || ops[0].Value == nil {
		t.Fatalf("unexpected shape: %+v", ops)
	}
	if s, ok := (*ops[0].Value).(string); !ok || s != "new@example.com" {
		t.Errorf("value = %v (%T)", *ops[0].Value, *ops[0].Value)
	}
}
