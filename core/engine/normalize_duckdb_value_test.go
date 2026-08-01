//nolint:testpackage // Tests the internal normalizeDuckDBValue helper.
package engine

import (
	"encoding/json"
	"math/big"
	"testing"

	duckdbdriver "github.com/marcboeker/go-duckdb"
)

// TestNormalizeDuckDBValue_Map pins the regression that shipped to
// production: querying a JSON file with a MAP-typed column (Stripe's
// `metadata` field is the canonical example) crashed the response
// marshaler with "json: unsupported type: duckdb.Map" because the
// driver's Map is map[any]any and encoding/json only accepts string
// keys on objects. After the fix, scanRow normalizes the value into
// map[string]any and JSON marshaling succeeds.
func TestNormalizeDuckDBValue_Map(t *testing.T) {
	// Stripe's metadata shape: string → string key-value pairs.
	input := duckdbdriver.Map{
		"plan":   "pro",
		"region": "eu",
	}
	got := normalizeDuckDBValue(input)
	m, ok := got.(map[string]any)
	if !ok {
		t.Fatalf("normalized type = %T, want map[string]any", got)
	}
	if len(m) != 2 || m["plan"] != "pro" || m["region"] != "eu" {
		t.Errorf("normalized value = %v, want {plan:pro, region:eu}", m)
	}

	// Round-trip through encoding/json to verify the fix at the
	// marshaler boundary — the same boundary that produced the
	// original error in production.
	out, err := json.Marshal(got)
	if err != nil {
		t.Fatalf("json.Marshal after normalize failed: %v", err)
	}
	// Exact key order isn't stable across runs, but both permutations
	// are fine. Just check both keys serialized.
	s := string(out)
	if !containsAll(s, `"plan":"pro"`, `"region":"eu"`) {
		t.Errorf("marshaled JSON missing expected fields: %s", s)
	}
}

// TestNormalizeDuckDBValue_MapWithNonStringKeys verifies that
// MAP<K, V> where K is not a string still produces a valid JSON object.
// fmt.Sprint stringifies any Go scalar; this is lossy (42 becomes "42")
// but the alternative is crashing the response.
func TestNormalizeDuckDBValue_MapWithNonStringKeys(t *testing.T) {
	input := duckdbdriver.Map{
		42:    "answer",
		"foo": "bar",
	}
	got := normalizeDuckDBValue(input)
	m, ok := got.(map[string]any)
	if !ok {
		t.Fatalf("normalized type = %T, want map[string]any", got)
	}
	if m["42"] != "answer" {
		t.Errorf("integer key 42 should stringify to \"42\" → answer, got %v", m)
	}
	if _, err := json.Marshal(m); err != nil {
		t.Errorf("json.Marshal should succeed: %v", err)
	}
}

// TestNormalizeDuckDBValue_NestedMap exercises the recursion: a Map
// containing another Map. Nested Stripe metadata is rare but the
// recursion is the whole point of the fix.
func TestNormalizeDuckDBValue_NestedMap(t *testing.T) {
	input := duckdbdriver.Map{
		"outer": duckdbdriver.Map{
			"inner": "deep",
		},
	}
	got := normalizeDuckDBValue(input)
	out, err := json.Marshal(got)
	if err != nil {
		t.Fatalf("json.Marshal failed: %v", err)
	}
	want := `{"outer":{"inner":"deep"}}`
	if string(out) != want {
		t.Errorf("marshaled = %s, want %s", string(out), want)
	}
}

// TestNormalizeDuckDBValue_Decimal checks the Decimal → string
// conversion. Using string preserves precision for arbitrary-scale
// decimals (which float64 would lose).
func TestNormalizeDuckDBValue_Decimal(t *testing.T) {
	d := duckdbdriver.Decimal{
		Value: big.NewInt(12345),
		Scale: 2,
	}
	got := normalizeDuckDBValue(d)
	s, ok := got.(string)
	if !ok {
		t.Fatalf("normalized decimal = %T, want string", got)
	}
	// Decimal.String() for value=12345 scale=2 should be "123.45".
	if s != "123.45" {
		t.Errorf("decimal string = %q, want \"123.45\"", s)
	}

	// Pointer variant goes through the same branch.
	got = normalizeDuckDBValue(&d)
	if got != "123.45" {
		t.Errorf("*Decimal normalized = %v, want \"123.45\"", got)
	}

	// Nil pointer stays nil rather than dereferencing.
	var nilDec *duckdbdriver.Decimal
	if normalizeDuckDBValue(nilDec) != nil {
		t.Errorf("nil *Decimal should normalize to nil")
	}
}

// TestNormalizeDuckDBValue_UUID checks the UUID → canonical-string
// conversion. Raw UUIDs are [16]byte and encoding/json would emit
// them as a 16-int array, which is useless to the console.
func TestNormalizeDuckDBValue_UUID(t *testing.T) {
	var u duckdbdriver.UUID
	// Deterministic bytes: 0x01..0x10.
	for i := range u {
		u[i] = byte(i + 1)
	}
	got := normalizeDuckDBValue(u)
	s, ok := got.(string)
	if !ok {
		t.Fatalf("normalized UUID = %T, want string", got)
	}
	// Canonical UUID shape is 8-4-4-4-12 hex chars.
	if len(s) != 36 || s[8] != '-' || s[13] != '-' || s[18] != '-' || s[23] != '-' {
		t.Errorf("UUID string not canonical: %q", s)
	}
}

// TestNormalizeDuckDBValue_ByteSliceToString preserves the legacy
// []byte → string behavior that the previous scanRow had.
func TestNormalizeDuckDBValue_ByteSliceToString(t *testing.T) {
	got := normalizeDuckDBValue([]byte("hello"))
	if got != "hello" {
		t.Errorf("[]byte \"hello\" normalized = %v, want \"hello\"", got)
	}
}

// TestNormalizeDuckDBValue_Passthrough verifies that JSON-friendly
// scalars fall through unchanged. scanRow shouldn't touch them.
func TestNormalizeDuckDBValue_Passthrough(t *testing.T) {
	cases := []any{
		"plain string",
		int64(42),
		float64(3.14),
		true,
		nil,
	}
	for _, v := range cases {
		got := normalizeDuckDBValue(v)
		if got != v {
			t.Errorf("passthrough failed: %v (%T) normalized to %v (%T)", v, v, got, got)
		}
	}
}

// TestNormalizeDuckDBValue_NestedInList exercises the list-recursion
// path: a driver LIST of driver MAPs. DuckDB returns lists as []any
// by default; the recursion ensures Map values inside lists also get
// normalized.
func TestNormalizeDuckDBValue_NestedInList(t *testing.T) {
	input := []any{
		duckdbdriver.Map{"k": "v1"},
		duckdbdriver.Map{"k": "v2"},
	}
	got := normalizeDuckDBValue(input)
	out, err := json.Marshal(got)
	if err != nil {
		t.Fatalf("json.Marshal failed: %v", err)
	}
	want := `[{"k":"v1"},{"k":"v2"}]`
	if string(out) != want {
		t.Errorf("marshaled = %s, want %s", string(out), want)
	}
}

// containsAll checks that every needle appears in haystack. Used in
// place of exact-match assertions for map serialization where key
// order is non-deterministic.
func containsAll(haystack string, needles ...string) bool {
	for _, n := range needles {
		if !contains(haystack, n) {
			return false
		}
	}
	return true
}

// contains is a tiny substring check — stdlib strings.Contains would
// pull in an import the test file otherwise doesn't need.
func contains(haystack, needle string) bool {
	if len(needle) > len(haystack) {
		return false
	}
	for i := 0; i+len(needle) <= len(haystack); i++ {
		if haystack[i:i+len(needle)] == needle {
			return true
		}
	}
	return false
}
