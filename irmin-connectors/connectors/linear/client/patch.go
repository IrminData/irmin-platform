package linearclient

import (
	"context"
	"errors"
	"maps"
)

// IssueUpdated mirrors IssueCreated — same audit-friendly fields,
// returned from the save_issue tool's update path so callers can log
// what actually changed without a follow-up read.
type IssueUpdated = IssueCreated

// IssueUpdate updates an existing Linear issue via the save_issue
// MCP tool. `id` is the issue's identifier (e.g., `IRM-42`). The
// caller supplies the partial update in `input`; only fields
// explicitly included are touched. We piggyback on save_issue's
// upsert semantics — setting `id` on the args map routes the call
// to the update branch. The human-readable identifier (IRM-42)
// round-trips with the on-disk file shape (issues/<identifier>.json);
// Linear's tool also accepts UUIDs.
func (c *Client) IssueUpdate(
	ctx context.Context,
	id string,
	input map[string]any,
) (*IssueUpdated, error) {
	if id == "" {
		return nil, errors.New("linear: IssueUpdate requires a non-empty id")
	}
	if len(input) == 0 {
		return nil, errors.New("linear: IssueUpdate requires a non-empty input")
	}

	// Build the upsert args. `id` overrides any id the caller may
	// have included in input — the function-level argument is the
	// canonical source.
	args := make(map[string]any, len(input)+1)
	maps.Copy(args, input)
	args["id"] = id

	raw, err := c.CallTool(ctx, toolSaveIssue, args)
	if err != nil {
		return nil, err
	}
	return decodeIssueResponse(raw, "update")
}
