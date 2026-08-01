package linearclient

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"maps"
)

// toolSaveIssue is Linear's MCP upsert tool. Without `id` it creates;
// with `id` it updates. Both push and patch funnel through this single
// tool.
const toolSaveIssue = "save_issue"

// IssueCreated is the subset of the save_issue tool result the
// connector logs back to the operator. The full Linear response
// carries more fields, but ID + URL are what makes "we created
// IRM-42" actionable in the audit trail.
//
// Linear MCP uses the human-readable `IRM-42` form as the canonical
// id (which is also the form `save_issue` accepts on update), so the
// connector reads `id` directly without a separate identifier field.
type IssueCreated struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	URL   string `json:"url"`
}

// IssueCreate creates a new Linear issue via the save_issue MCP tool.
// `input` is the argument map the tool documents — typically
// `{"title": "...", "team": "<id-or-name>", ...}`. Required fields
// (title, team) are the caller's responsibility; missing fields surface
// as an MCP tool error and bubble back through Client.CallTool.
func (c *Client) IssueCreate(
	ctx context.Context,
	input map[string]any,
) (*IssueCreated, error) {
	if input == nil {
		return nil, errors.New("linear: IssueCreate requires a non-nil input")
	}
	// Defense against the caller accidentally including an id (which
	// would silently turn save_issue's upsert into an update). Strip
	// rather than error so callers mapping arbitrary input shapes
	// onto the tool can't accidentally trip the update branch.
	args := stripID(input)
	raw, err := c.CallTool(ctx, toolSaveIssue, args)
	if err != nil {
		return nil, err
	}
	return decodeIssueResponse(raw, "create")
}

// stripID returns a shallow copy of input with any "id" key removed.
// Used to enforce the upsert-as-create invariant on IssueCreate.
func stripID(input map[string]any) map[string]any {
	out := make(map[string]any, len(input))
	maps.Copy(out, input)
	delete(out, "id")
	return out
}

// decodeIssueResponse pulls the issue object out of save_issue's
// `{"success":bool,"issue":{...},"error":"..."}` envelope. Linear's
// tool always returns this shape; success=false is a hard error
// regardless of whether the envelope carried an error string —
// otherwise a malformed `{"success":false,"issue":{...}}` body would
// be silently treated as success and the caller would log a "created"
// or "updated" event for an issue that never landed in Linear.
func decodeIssueResponse(raw json.RawMessage, op string) (*IssueCreated, error) {
	var wrapped struct {
		Success bool          `json:"success"`
		Issue   *IssueCreated `json:"issue"`
		Error   string        `json:"error"`
	}
	if err := json.Unmarshal(raw, &wrapped); err != nil {
		return nil, fmt.Errorf("linear: decode save_issue %s response: %w", op, err)
	}
	if !wrapped.Success {
		msg := wrapped.Error
		if msg == "" {
			msg = "tool reported failure with no error message"
		}
		return nil, fmt.Errorf("linear: save_issue %s failed: %s", op, msg)
	}
	if wrapped.Issue == nil || wrapped.Issue.ID == "" {
		return nil, fmt.Errorf("linear: save_issue %s response missing issue.id", op)
	}
	return wrapped.Issue, nil
}
