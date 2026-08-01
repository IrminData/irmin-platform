package client

import (
	"errors"
	"fmt"
	"strings"
)

// Resource describes one Stripe resource this connector knows about —
// its REST path under /v1, its directory-name on the branch, and what
// capabilities Irmin exposes for it.
//
// Adding a new resource is a single entry in KnownResources plus
// (if writes are supported) ensuring the branch JSON parses cleanly
// through JSONToForm — no connector-level code changes needed.
type Resource struct {
	// Name is the branch directory (e.g., "customers") and the slug
	// users see in operation paths.
	Name string
	// Path is the Stripe REST path without the trailing slash
	// (e.g., "/v1/customers").
	Path string
	// Pull is true when this resource is listed + exported on pull.
	Pull bool
	// Write is true when users can create / update this resource via
	// push and patch. Some resources (charges, payouts) are read-only
	// by policy even when the key has write scope — we don't expose
	// them as writable.
	Write bool
}

// Resource slugs used across config, schema, and controller code.
// Exported as constants so switch / lookup sites have one source of
// truth instead of bare string literals scattered through the file.
const (
	ResourceCustomers     = "customers"
	ResourceCharges       = "charges"
	ResourceSubscriptions = "subscriptions"
	ResourceInvoices      = "invoices"
	ResourcePayouts       = "payouts"
	ResourceProducts      = "products"
	ResourcePrices        = "prices"
)

// KnownResources returns every Stripe resource the connector exposes.
// The order of the returned slice drives the pull loop order in
// operationPull so the emitted zip is deterministic.
//
// Returned by a function rather than exposed as a package-level
// variable because the repo's golangci config forbids globals — and
// the table is immutable + cheap to rebuild per call, so there's no
// caching win worth the exception.
func KnownResources() []Resource {
	return []Resource{
		{Name: ResourceCustomers, Path: "/v1/" + ResourceCustomers, Pull: true, Write: true},
		{Name: ResourceCharges, Path: "/v1/" + ResourceCharges, Pull: true, Write: false},
		{Name: ResourceSubscriptions, Path: "/v1/" + ResourceSubscriptions, Pull: true, Write: false},
		{Name: ResourceInvoices, Path: "/v1/" + ResourceInvoices, Pull: true, Write: true},
		{Name: ResourcePayouts, Path: "/v1/" + ResourcePayouts, Pull: true, Write: false},
		{Name: ResourceProducts, Path: "/v1/" + ResourceProducts, Pull: false, Write: true},
		{Name: ResourcePrices, Path: "/v1/" + ResourcePrices, Pull: false, Write: true},
	}
}

// pathSegmentCount is how many parts ParsePath splits a path into —
// always exactly "<resource>/<file>". Named so it doesn't look like a
// magic number to linters and readers.
const pathSegmentCount = 2

// FindResource returns the Resource with the given branch name, or an
// error naming every known resource so users get a useful message when
// they target a typo.
func FindResource(name string) (Resource, error) {
	resources := KnownResources()
	for _, r := range resources {
		if r.Name == name {
			return r, nil
		}
	}
	names := make([]string, 0, len(resources))
	for _, r := range resources {
		names = append(names, r.Name)
	}
	return Resource{}, fmt.Errorf(
		"unknown Stripe resource %q; known resources: %s",
		name,
		strings.Join(names, ", "),
	)
}

// ParsedPath is the decoded view of a branch path targeting a specific
// resource record. operationPush + operationPatch use it to decide
// whether a write is a Create (id empty, filename starts with "new-")
// or an Update (id present).
type ParsedPath struct {
	Resource Resource
	// ID is the Stripe resource id (e.g., "cus_abc123") or empty when
	// the path is a new-* placeholder.
	ID string
	// IsNew is true for `new-*.json` paths — i.e., the push should
	// create a new record and let Stripe assign the id.
	IsNew bool
}

// ParsePath decodes a branch path like `customers/cus_abc123.json` or
// `customers/new-alice.json` into its ParsedPath form. The trailing
// `.json` is required so that the schema matches what pull produces
// (pull emits parquet snapshots, but push/patch operate on JSON
// records authored by the user — the extension disambiguates).
func ParsePath(path string) (ParsedPath, error) {
	// Normalize: strip leading slash, split into dir + file.
	trimmed := strings.TrimPrefix(path, "/")
	parts := strings.SplitN(trimmed, "/", pathSegmentCount)
	if len(parts) != pathSegmentCount || parts[0] == "" || parts[1] == "" {
		return ParsedPath{}, errors.New(
			"path must be `<resource>/<id-or-new-*>.json` (e.g., customers/cus_abc.json)",
		)
	}

	resource, err := FindResource(parts[0])
	if err != nil {
		return ParsedPath{}, err
	}

	filename := parts[1]
	if !strings.HasSuffix(filename, ".json") {
		return ParsedPath{}, fmt.Errorf(
			"file must have .json suffix, got %q", filename,
		)
	}
	base := strings.TrimSuffix(filename, ".json")

	if strings.HasPrefix(base, "new-") || base == "new" {
		return ParsedPath{Resource: resource, IsNew: true}, nil
	}
	return ParsedPath{Resource: resource, ID: base}, nil
}
