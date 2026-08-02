package linearclient

import (
	"context"
	"encoding/json"
	"fmt"
	"maps"
)

// pageResponse is the shape Linear's MCP list_* tools return inside
// their text-content JSON payload. The resource array lives under a
// per-tool key (issues, projects, cycles, teams), so we use a generic
// map for the resource key and pull `cursor` / `hasNextPage` out
// directly. `cursor` is omitted when the page is the last one.
type pageResponse struct {
	Cursor      string `json:"cursor"`
	HasNextPage bool   `json:"hasNextPage"`
}

// pageSize is the per-call cap. Linear's documented MCP tool limit
// is 250; using it minimises round trips on large workspaces.
const pageSize = 250

// listAllPages drives a Linear MCP list-tool call through every page
// and returns the concatenated record array. `toolName` is the MCP
// tool to call (e.g., "list_issues"); `resourceKey` is the top-level
// JSON key the tool puts records under (typically the same word
// without the "list_" prefix — "issues", "projects", "cycles",
// "teams"). Extra `args` are merged into each per-page call so
// callers can thread filters (team_id, query, etc.) without duplicating
// the loop.
//
// `maxRecords <= 0` means unbounded. When the cap is hit mid-page
// the second return is true so the caller can log a "snapshot
// truncated" event instead of silently emitting an incomplete pull.
func listAllPages(
	ctx context.Context,
	c *Client,
	toolName, resourceKey string,
	args map[string]any,
	maxRecords int,
) ([]json.RawMessage, bool, error) {
	var (
		nodes  []json.RawMessage
		cursor string
	)
	for {
		page, items, fetchErr := fetchPage(ctx, c, toolName, resourceKey, args, cursor)
		if fetchErr != nil {
			return nil, false, fetchErr
		}
		// Append nodes, honoring the cap. The remaining budget is
		// recomputed before every append so a single oversized page
		// doesn't blow past the cap by hundreds of records.
		for _, n := range items {
			if maxRecords > 0 && len(nodes) >= maxRecords {
				return nodes, true, nil
			}
			nodes = append(nodes, n)
		}
		if !page.HasNextPage || page.Cursor == "" {
			return nodes, false, nil
		}
		// Cursor stall guard. If the vendor returns the same cursor
		// two pages in a row we'd loop forever; treat that as a hard
		// error rather than an infinite snapshot.
		if page.Cursor == cursor {
			return nil, false, fmt.Errorf(
				"linear: pagination stalled — %q returned the same cursor twice (%q)",
				toolName, cursor,
			)
		}
		cursor = page.Cursor
	}
}

// fetchPage runs one paginated MCP tool call and returns the page
// metadata plus the records under resourceKey. Extracted from
// listAllPages so the outer loop stays simple enough for `gocognit`
// and so the inbound response shape (text-content envelope + JSON
// decode + per-tool resource extraction) lives in one place across
// vendor incidents.
func fetchPage(
	ctx context.Context,
	c *Client,
	toolName, resourceKey string,
	args map[string]any,
	cursor string,
) (pageResponse, []json.RawMessage, error) {
	// Build the per-page argument map. The pagination loop owns
	// `limit` and `cursor` — both are set unconditionally so a stale
	// `cursor` slipped in via args can't leak into the first-page
	// call and silently send the caller's cursor instead of starting
	// from the beginning. On page one we delete the key rather than
	// writing an empty string because the MCP tool's schema treats
	// an empty string as a (potentially invalid) cursor; omitting
	// the field is the well-defined "first page" signal.
	// reservedSlots accounts for the limit + cursor keys we always set,
	// so the underlying map allocation is sized exactly once.
	const reservedSlots = 2
	merged := make(map[string]any, len(args)+reservedSlots)
	maps.Copy(merged, args)
	merged["limit"] = pageSize
	if cursor == "" {
		delete(merged, "cursor")
	} else {
		merged["cursor"] = cursor
	}

	raw, callErr := c.CallTool(ctx, toolName, merged)
	if callErr != nil {
		return pageResponse{}, nil, callErr
	}

	// Single decode into a top-level map keyed by raw JSON, then
	// pull the cursor / hasNextPage / resource fields out of that
	// map. One unmarshal pass per page instead of two.
	var top map[string]json.RawMessage
	if err := json.Unmarshal(raw, &top); err != nil {
		return pageResponse{}, nil, fmt.Errorf("linear: decode %s top-level: %w", toolName, err)
	}

	var header pageResponse
	if cursorRaw, ok := top["cursor"]; ok {
		if err := json.Unmarshal(cursorRaw, &header.Cursor); err != nil {
			return pageResponse{}, nil, fmt.Errorf("linear: decode %s cursor: %w", toolName, err)
		}
	}
	if hasNextRaw, ok := top["hasNextPage"]; ok {
		if err := json.Unmarshal(hasNextRaw, &header.HasNextPage); err != nil {
			return pageResponse{}, nil, fmt.Errorf("linear: decode %s hasNextPage: %w", toolName, err)
		}
	}

	resourceRaw, ok := top[resourceKey]
	if !ok {
		return pageResponse{}, nil, fmt.Errorf(
			"linear: tool %q response missing %q field", toolName, resourceKey,
		)
	}
	// Reject a literal `null` resource block. Without this guard
	// the unmarshal yields nil and we silently terminate with an
	// empty snapshot, turning a vendor-side outage into a
	// "successful empty pull."
	if string(resourceRaw) == "null" {
		return pageResponse{}, nil, fmt.Errorf(
			"linear: tool %q returned null %q field", toolName, resourceKey,
		)
	}

	var items []json.RawMessage
	if err := json.Unmarshal(resourceRaw, &items); err != nil {
		return pageResponse{}, nil, fmt.Errorf("linear: decode %s items: %w", toolName, err)
	}
	return header, items, nil
}
