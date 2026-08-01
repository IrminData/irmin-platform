package client

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"sort"
	"strconv"
)

// ErrEmptyJSONInput is returned by JSONToForm when the caller passes
// a JSON document that would produce an empty form (`null`, `{}`, or
// an object with every field being JSON null). Sending an empty form
// to Stripe creates a record with zero user-supplied fields — a
// ghost customer, a ghost invoice. The client refuses at parse time
// so the failure surfaces with a useful error instead of a silent
// "create succeeded" log pointing at a useless record.
var ErrEmptyJSONInput = errors.New(
	"stripe: JSON input produced no form entries — refusing to send an empty payload",
)

// JSONToForm flattens an arbitrary JSON object into Stripe's
// bracketed form-encoding convention. Stripe's v1 API doesn't accept
// JSON request bodies; every write is application/x-www-form-urlencoded
// with nested structures expressed as `parent[child]=value` and arrays
// as `parent[0][child]=value`.
//
// Rules:
//   - objects become `key[subkey]=value`
//   - arrays of primitives become `key[]=v1&key[]=v2` (Stripe accepts
//     both indexed and empty-bracket notation for primitive arrays;
//     empty-bracket is simpler and matches Stripe's own docs)
//   - arrays of objects become `key[0][subkey]=value`
//   - nil / JSON null values are skipped (Stripe treats absence and
//     null differently — null explicitly clears a field, while absence
//     leaves it unchanged; skipping gives the safer "leave alone" default)
//   - booleans render as "true"/"false", numbers via strconv
//
// Keys are emitted in sorted order so the same input always produces
// the same form string — load-bearing for our deterministic
// Idempotency-Key derivation (sha256 of the form body).
func JSONToForm(input []byte) (url.Values, error) {
	if len(input) == 0 {
		return nil, ErrEmptyJSONInput
	}
	var top map[string]any
	if err := json.Unmarshal(input, &top); err != nil {
		return nil, fmt.Errorf("stripe: parse JSON for form: %w", err)
	}
	// `null` at the top level decodes cleanly into a nil map — valid
	// JSON, but meaningless as a Stripe create/update payload.
	// Similarly, `{}` decodes to an empty non-nil map and would flatten
	// to zero form entries. Both are rejected.
	if top == nil {
		return nil, ErrEmptyJSONInput
	}
	form := url.Values{}
	flatten("", top, form)
	if len(form) == 0 {
		return nil, ErrEmptyJSONInput
	}
	return form, nil
}

// flatten walks the decoded JSON tree and appends form entries. The
// prefix argument carries the bracketed key path built so far
// ("metadata", then "metadata[plan]", etc.).
func flatten(prefix string, value any, out url.Values) {
	switch v := value.(type) {
	case nil:
		// Skip nulls; see JSONToForm godoc for rationale.
	case map[string]any:
		keys := make([]string, 0, len(v))
		for k := range v {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		for _, k := range keys {
			flatten(joinKey(prefix, k), v[k], out)
		}
	case []any:
		for i, item := range v {
			flatten(joinKey(prefix, strconv.Itoa(i)), item, out)
		}
	case bool:
		out.Add(prefix, strconv.FormatBool(v))
	case float64:
		// JSON numbers always land here via encoding/json. Preserve
		// integer shape when possible so Stripe's numeric fields
		// (amounts in minor units, days_until_due) don't render with
		// trailing ".0000..." artifacts.
		if v == float64(int64(v)) {
			out.Add(prefix, strconv.FormatInt(int64(v), 10))
		} else {
			out.Add(prefix, strconv.FormatFloat(v, 'f', -1, 64))
		}
	case string:
		out.Add(prefix, v)
	default:
		// Fallback — shouldn't happen for valid JSON but keeps us safe
		// against future variants (e.g., json.Number if someone uses a
		// Decoder with UseNumber).
		out.Add(prefix, fmt.Sprintf("%v", v))
	}
}

// joinKey builds a nested form key — `parent` + `[child]`. When the
// prefix is empty we're at the top level so no brackets.
func joinKey(prefix, key string) string {
	if prefix == "" {
		return key
	}
	return prefix + "[" + key + "]"
}
