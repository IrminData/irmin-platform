package linearclient

import (
	"context"
	"encoding/json"
	"fmt"

	"golang.org/x/sync/errgroup"
)

// PullOptions narrows what a pull call returns. `TeamKey` is the
// optional `IRM`-style team identifier that scopes issue / cycle
// pulls to one team; empty means workspace-wide. `MaxRecords` caps
// per-resource record counts the same way as Stripe's
// `max_records_per_resource` setting — bounded snapshots are safer
// for OOM than truly unbounded ones.
type PullOptions struct {
	TeamKey    string
	MaxRecords int
}

// MCP tool names. Pinned as constants so call sites use the typed
// reference and a vendor rename surfaces as a compile error rather
// than a silent stringly-typed drift.
const (
	toolListIssues   = "list_issues"
	toolListProjects = "list_projects"
	toolListCycles   = "list_cycles"
	toolListTeams    = "list_teams"
)

// MCP response top-level keys. Linear's MCP server keys the resource
// array on its plain plural — `{"issues":[...],...}`,
// `{"teams":[...],...}` etc. Constants kept alongside the tool names
// so additions go to one place.
const (
	keyIssues   = "issues"
	keyProjects = "projects"
	keyCycles   = "cycles"
	keyTeams    = "teams"
)

// ListBounded fetches up to MaxRecords entries for the given
// resource, returning the JSON array (raw nodes), a truncated flag,
// and any error.
//
// Returned `truncated == true` means MaxRecords was reached before
// the underlying connection ran out of pages — the caller should
// emit a distinct log event rather than treating the pull as
// complete.
func (c *Client) ListBounded(
	ctx context.Context,
	resource Resource,
	opts PullOptions,
) ([]json.RawMessage, bool, error) {
	switch resource.Name {
	case ResourceIssues:
		return c.listIssues(ctx, opts)
	case ResourceProjects:
		return listAllPages(ctx, c, toolListProjects, keyProjects, nil, opts.MaxRecords)
	case ResourceCycles:
		return c.listCycles(ctx, opts)
	case ResourceTeams:
		return listAllPages(ctx, c, toolListTeams, keyTeams, nil, opts.MaxRecords)
	default:
		return nil, false, fmt.Errorf("linear: ListBounded: unsupported resource %q", resource.Name)
	}
}

// listIssues threads the `team_key` setting into the list_issues
// tool's `team` argument. Linear's MCP tool resolves "team" by
// name OR id — passing the user's `IRM`-style key is supported
// directly, so we don't need a separate lookup.
func (c *Client) listIssues(
	ctx context.Context,
	opts PullOptions,
) ([]json.RawMessage, bool, error) {
	args := map[string]any{}
	if opts.TeamKey != "" {
		args["team"] = opts.TeamKey
	}
	return listAllPages(ctx, c, toolListIssues, keyIssues, args, opts.MaxRecords)
}

// cycleFilterFetchCeiling bounds the pre-filter cycle fetch when a
// team filter is applied client-side. Without a separate ceiling
// the user's MaxRecords would govern the underlying fetch — and a
// workspace where the team's share of cycles is small could see
// `truncated=true` with a tiny filtered slice while real matches
// sit unfetched beyond the cap. The ceiling lives at 100k so
// realistic workspaces (cycles are typically <500 per team per
// year) always fit, while the worker stays bounded against pathological
// inputs. Same value as the controller's defaultMaxRecordsPerResource
// — chosen to keep memory pressure consistent across pull paths.
const cycleFilterFetchCeiling = 100_000

// listCycles handles the team-scoped cycle pull. Linear's
// `list_cycles` tool requires `teamId` (capital I, the literal team
// UUID) — it does NOT accept a team key like `list_issues` does. So
// when the user supplied a `team_key` we have to resolve it to a
// team ID first via list_teams, then call list_cycles with the
// concrete teamId. When no team filter is set we list every team and
// fetch each team's cycles, concatenating into a single snapshot to
// preserve the on-disk file shape (cycles.json is a flat array).
//
// The fetch and filter caps are deliberately separate: per-team
// fetches use cycleFilterFetchCeiling (memory protection), and the
// user's MaxRecords is applied to the post-aggregation result (so
// `truncated=true` accurately means "you might be missing matching
// cycles", not "the underlying fetch was capped before aggregation
// converged").
func (c *Client) listCycles(
	ctx context.Context,
	opts PullOptions,
) ([]json.RawMessage, bool, error) {
	teamIDs, lookupErr := c.resolveTeamIDsForCycles(ctx, opts.TeamKey)
	if lookupErr != nil {
		return nil, false, lookupErr
	}
	if len(teamIDs) == 0 {
		// No teams matched the filter (e.g. team_key didn't match any
		// team in the workspace). Empty result is the right shape; the
		// caller will emit a "0 records pulled" log.
		return nil, false, nil
	}

	// Per-team list_cycles calls are independent — fan them out with
	// bounded concurrency so wall-clock scales with concurrency, not
	// with team count. cycleFanOutConcurrency is conservative because
	// each in-flight call may itself span multiple paginated requests.
	const (
		cycleFanOutConcurrency = 4
		estimatedCyclesPerTeam = 32 // rough sizing hint, not a cap
	)

	type teamResult struct {
		records   []json.RawMessage
		truncated bool
	}
	results := make([]teamResult, len(teamIDs))

	g, gctx := errgroup.WithContext(ctx)
	g.SetLimit(cycleFanOutConcurrency)
	for i, teamID := range teamIDs {
		idx, id := i, teamID
		g.Go(func() error {
			page, fetchTruncated, err := listAllPages(
				gctx, c, toolListCycles, keyCycles,
				map[string]any{"teamId": id}, cycleFilterFetchCeiling,
			)
			if err != nil {
				return fmt.Errorf("linear: list_cycles for team %s: %w", id, err)
			}
			results[idx] = teamResult{records: page, truncated: fetchTruncated}
			return nil
		})
	}
	if err := g.Wait(); err != nil {
		return nil, false, err
	}

	all := make([]json.RawMessage, 0, len(teamIDs)*estimatedCyclesPerTeam)
	anyTruncated := false
	for _, r := range results {
		all = append(all, r.records...)
		if r.truncated {
			anyTruncated = true
		}
	}

	truncated := anyTruncated
	if opts.MaxRecords > 0 && len(all) > opts.MaxRecords {
		all = all[:opts.MaxRecords]
		truncated = true
	}
	return all, truncated, nil
}

// resolveTeamIDsForCycles returns the list of team UUIDs the cycle
// pull should iterate. When teamKey is set, only the matching team's
// ID is returned; when empty, every team's ID is returned (so we
// pull every team's cycles into a single workspace-wide snapshot).
//
// We extract just the `id` (UUID) field — list_cycles needs the
// UUID, not the key. Errors here propagate so a network failure
// during team lookup surfaces as the cycle pull's failure rather
// than as a silent empty result.
func (c *Client) resolveTeamIDsForCycles(
	ctx context.Context,
	teamKey string,
) ([]string, error) {
	teams, _, err := listAllPages(ctx, c, toolListTeams, keyTeams, nil, 0 /* unbounded */)
	if err != nil {
		return nil, fmt.Errorf("linear: list_teams (for cycle scope): %w", err)
	}

	ids := make([]string, 0, len(teams))
	for _, raw := range teams {
		var probe struct {
			ID  string `json:"id"`
			Key string `json:"key"`
		}
		if unmarshalErr := json.Unmarshal(raw, &probe); unmarshalErr != nil {
			// Skip individual decode failures rather than aborting
			// the whole cycle pull — a single malformed team
			// shouldn't take down a workspace's snapshot.
			continue
		}
		if probe.ID == "" {
			continue
		}
		if teamKey == "" || probe.Key == teamKey {
			ids = append(ids, probe.ID)
		}
	}
	return ids, nil
}
