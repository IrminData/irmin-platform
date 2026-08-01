package linearclient

import (
	"errors"
	"fmt"
	"strings"
)

// ParsedPath captures the resource + identifier referenced by a
// connector path. Mirrors the Stripe parser (`<resource>/<id>.json`,
// `<resource>/new-*.json`) so workflows that round-trip the connector's
// pull output back through push behave consistently across vendors.
type ParsedPath struct {
	Resource Resource

	// ID is the issue identifier (e.g., `IRM-42`). Empty for
	// whole-resource paths and for new-* create targets.
	ID string

	// IsNew is true when the file name starts with `new-`, which is
	// the connector's convention for "create me a new record" used by
	// the push handler.
	IsNew bool
}

// ParsePath recognizes four shapes:
//
//   - `issues`               — whole resource
//   - `issues.json`          — same, with the suffix the pull handler emits
//   - `issues/IRM-42.json`   — single existing record
//   - `issues/new-foo.json`  — new record (push only)
//
// Returns an error for anything that doesn't match one of the above.
// Callers translate the error to a `400` (push) or "skip" (push
// loop) depending on context — the parser stays neutral.
func ParsePath(rawPath string) (ParsedPath, error) {
	cleaned := strings.TrimPrefix(rawPath, "/")
	if cleaned == "" {
		return ParsedPath{}, errors.New("linear: empty path")
	}

	// Whole-resource shape: bare slug, or slug.json (the filename
	// pull emits). Distinguished from single-record by absence of a
	// `/` separator.
	if !strings.Contains(cleaned, "/") {
		resourceName := strings.TrimSuffix(cleaned, ".json")
		resource, err := FindResource(resourceName)
		if err != nil {
			return ParsedPath{}, err
		}
		return ParsedPath{Resource: resource}, nil
	}

	// Single-record shape: `<resource>/<filename>` or
	// `<resource>/<filename>.json`. Two-segment split keeps any
	// downstream slashes inside the leaf so the leaf parser sees the
	// full filename verbatim.
	const resourceLeafSegments = 2
	parts := strings.SplitN(cleaned, "/", resourceLeafSegments)
	resource, err := FindResource(parts[0])
	if err != nil {
		return ParsedPath{}, err
	}
	leaf := strings.TrimSuffix(parts[1], ".json")
	if leaf == "" {
		return ParsedPath{}, fmt.Errorf("linear: missing record identifier in %q", rawPath)
	}

	if strings.HasPrefix(leaf, "new-") {
		return ParsedPath{Resource: resource, IsNew: true}, nil
	}
	return ParsedPath{Resource: resource, ID: leaf}, nil
}
