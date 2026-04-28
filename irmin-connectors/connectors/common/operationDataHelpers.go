// operationDataHelpers.go hosts the small, vendor-agnostic data-shaping
// utilities every record-oriented vendor connector reuses. Same
// motivation as operationPatchHelpers.go: ParsePositiveInt,
// MarshalJSONArray, and SortedPaths lived as duplicates in stripe/ and
// linear/ before this refactor; bug fixes had to be applied twice.
//
// Keep functions in this file vendor-neutral. Anything that needs vendor
// context (a client, settings shape, log channel) belongs in the
// vendor's own controllers package.

package common

import (
	"encoding/json"
	"sort"
	"strconv"
	"strings"
)

// ParsePositiveInt coerces a settings value into a positive int and
// returns 0 on any failure (wrong type, non-numeric string, zero, or
// negative). Used to read OOM-guard caps like
// `max_records_per_resource` from connection settings.
//
// Settings values arrive as strings via DynamicField in the common
// case, but other call paths (tests, programmatic config) can pass
// int / int64 / float64 / json.Number, so the union covers all the
// shapes Go's encoding/json may produce. The deliberate "0 on failure"
// contract means callers can write
//
//	cap := common.ParsePositiveInt(settings["max_records_per_resource"])
//	if cap <= 0 { cap = defaultCap }
//
// without a separate "is it valid" check. If we ever returned -1 or
// math.MinInt on failure, callers would silently disable the OOM guard
// when settings JSON arrives malformed.
func ParsePositiveInt(raw any) int {
	switch v := raw.(type) {
	case int:
		if v > 0 {
			return v
		}
	case int64:
		if v > 0 {
			return int(v)
		}
	case float64:
		if v > 0 {
			return int(v)
		}
	case json.Number:
		if n, err := v.Int64(); err == nil && n > 0 {
			return int(n)
		}
	case string:
		n, err := strconv.Atoi(strings.TrimSpace(v))
		if err == nil && n > 0 {
			return n
		}
	}
	return 0
}

// MarshalJSONArray collapses a slice of pre-validated JSON records into
// a compact JSON array. We avoid re-encoding the records — they're
// already valid JSON objects from the vendor — so the output is a
// faithful passthrough of the vendor's wire shape.
//
// Pre-allocates the output buffer at the exact final size to avoid the
// growth/realloc churn for large snapshots. Empty / nil input returns
// the canonical `[]` (parsers downstream expect a JSON array, never a
// `null` or empty buffer).
func MarshalJSONArray(records []json.RawMessage) []byte {
	if len(records) == 0 {
		return []byte("[]")
	}
	// arrayBracketsBytes counts the `[` + `]` we wrap the records in.
	// commaSeparatorsBytes is `len(records) - 1` commas between records.
	const arrayBracketsBytes = 2
	estimated := arrayBracketsBytes + len(records) - 1
	for _, r := range records {
		estimated += len(r)
	}
	buf := make([]byte, 0, estimated)
	buf = append(buf, '[')
	for i, r := range records {
		if i > 0 {
			buf = append(buf, ',')
		}
		buf = append(buf, r...)
	}
	buf = append(buf, ']')
	return buf
}

// SortedPaths returns the map keys in sorted order for deterministic
// iteration. ZIP archives don't preserve order and Go map iteration is
// randomized, so re-running a push with the same input would otherwise
// produce a different audit shape across retries — which makes
// reproducing a customer report harder than it needs to be.
func SortedPaths(files map[string][]byte) []string {
	paths := make([]string, 0, len(files))
	for k := range files {
		paths = append(paths, k)
	}
	sort.Strings(paths)
	return paths
}
