package common_test

import (
	"encoding/json"
	"reflect"
	"testing"

	"irmin-connectors/connectors/common"
)

// TestParsePositiveInt covers the union of input types we accept from
// settings JSON, plus the rejection paths. Stripe and Linear both used
// to maintain copies of these cases; consolidating them here means a
// future fix lands once.
func TestParsePositiveInt(t *testing.T) {
	cases := []struct {
		name string
		in   any
		want int
	}{
		// Happy paths — every numeric type encoding/json may produce.
		{"int positive", 42, 42},
		{"int64 positive", int64(42), 42},
		{"float64 positive", float64(42), 42},
		{"json.Number positive", json.Number("500"), 500},
		{"string positive", "500", 500},
		{"string positive with whitespace", "  500  ", 500},

		// Rejections — reading "no cap" semantics off the 0 return.
		{"int zero", 0, 0},
		{"int negative", -1, 0},
		{"int64 negative", int64(-1), 0},
		{"float64 zero", float64(0), 0},
		{"float64 negative", float64(-3.14), 0},
		{"json.Number negative", json.Number("-1"), 0},
		{"json.Number garbage", json.Number("not a number"), 0},
		{"string garbage", "not a number", 0},
		{"string negative", "-5", 0},
		{"string empty", "", 0},

		// Unsupported types fall through the switch and return 0.
		{"nil", nil, 0},
		{"bool", true, 0},
		{"slice", []int{1, 2}, 0},
		{"map", map[string]any{"a": 1}, 0},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := common.ParsePositiveInt(tc.in)
			if got != tc.want {
				t.Errorf("ParsePositiveInt(%#v) = %d, want %d", tc.in, got, tc.want)
			}
		})
	}
}

func TestMarshalJSONArrayEmpty(t *testing.T) {
	if string(common.MarshalJSONArray(nil)) != "[]" {
		t.Errorf("MarshalJSONArray(nil) should produce []")
	}
	if string(common.MarshalJSONArray([]json.RawMessage{})) != "[]" {
		t.Errorf("MarshalJSONArray([]) should produce []")
	}
}

func TestMarshalJSONArraySingle(t *testing.T) {
	got := string(common.MarshalJSONArray([]json.RawMessage{json.RawMessage(`{"id":"a"}`)}))
	want := `[{"id":"a"}]`
	if got != want {
		t.Errorf("MarshalJSONArray single = %q, want %q", got, want)
	}
}

func TestMarshalJSONArrayMultiple(t *testing.T) {
	got := string(common.MarshalJSONArray([]json.RawMessage{
		json.RawMessage(`{"id":"a"}`),
		json.RawMessage(`{"id":"b"}`),
		json.RawMessage(`{"id":"c"}`),
	}))
	want := `[{"id":"a"},{"id":"b"},{"id":"c"}]`
	if got != want {
		t.Errorf("MarshalJSONArray multi = %q, want %q", got, want)
	}
}

func TestMarshalJSONArrayPassThrough(t *testing.T) {
	// MarshalJSONArray must NOT re-encode records — vendor wire shape
	// is the contract. If we ever switched to json.Marshal of the slice,
	// this test would fail because re-encoding canonicalizes whitespace.
	got := string(common.MarshalJSONArray([]json.RawMessage{
		json.RawMessage(`{ "id" : "a" , "n" : 1 }`),
	}))
	want := `[{ "id" : "a" , "n" : 1 }]`
	if got != want {
		t.Errorf("MarshalJSONArray re-encoded vendor bytes: got %q, want %q", got, want)
	}
}

func TestSortedPathsEmpty(t *testing.T) {
	if got := common.SortedPaths(map[string][]byte{}); len(got) != 0 {
		t.Errorf("SortedPaths(empty) = %v, want []", got)
	}
	if got := common.SortedPaths(nil); len(got) != 0 {
		t.Errorf("SortedPaths(nil) = %v, want []", got)
	}
}

func TestSortedPathsSingle(t *testing.T) {
	if got := common.SortedPaths(map[string][]byte{"a": nil}); !reflect.DeepEqual(got, []string{"a"}) {
		t.Errorf("SortedPaths single = %v, want [a]", got)
	}
}

func TestSortedPathsLexical(t *testing.T) {
	files := map[string][]byte{
		"customers/cus_2.json":  nil,
		"issues/iss_a.json":     nil,
		"customers/cus_1.json":  nil,
		"projects/proj_1.json":  nil,
		"customers/cus_10.json": nil, // lexical sort: "cus_10" < "cus_2" because "1" < "2"
	}
	got := common.SortedPaths(files)
	want := []string{
		"customers/cus_1.json",
		"customers/cus_10.json",
		"customers/cus_2.json",
		"issues/iss_a.json",
		"projects/proj_1.json",
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("SortedPaths lexical = %v, want %v", got, want)
	}
}
