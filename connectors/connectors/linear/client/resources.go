package linearclient

import "fmt"

// Resource describes one Linear top-level entity the connector knows
// how to interact with. Mirrors the resource table the Stripe
// connector uses so call sites stay structurally similar across
// connectors.
type Resource struct {
	// Name is the URL-safe slug used as the on-disk file/directory
	// name (e.g., issues.json on pull, issues/<id>.json on push).
	Name string

	// Pull, Push, Patch flag which operations are supported. Linear's
	// non-issue resources are read-only in this connector — workspace
	// administration writes belong to a future phase.
	Pull  bool
	Push  bool
	Patch bool
}

// Known resource slugs. Defined as constants so external callers
// (config schemas, tests) reference them by name rather than literals.
const (
	ResourceIssues   = "issues"
	ResourceProjects = "projects"
	ResourceCycles   = "cycles"
	ResourceTeams    = "teams"
)

// KnownResources returns the immutable resource table. A copy is
// returned each call so callers can append a per-operation filter
// list without mutating the package-level table.
func KnownResources() []Resource {
	return []Resource{
		{Name: ResourceIssues, Pull: true, Push: true, Patch: true},
		{Name: ResourceProjects, Pull: true},
		{Name: ResourceCycles, Pull: true},
		{Name: ResourceTeams, Pull: true},
	}
}

// FindResource returns the Resource matching name (without `.json`
// suffix), or an error when the name isn't part of the known set.
// The error message lists the supported names to make typo
// diagnostics one log line.
func FindResource(name string) (Resource, error) {
	for _, r := range KnownResources() {
		if r.Name == name {
			return r, nil
		}
	}
	return Resource{}, fmt.Errorf(
		"linear: unknown resource %q (supported: issues, projects, cycles, teams)",
		name,
	)
}
