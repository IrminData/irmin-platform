package lakefs

import (
	"fmt"
	"net/http"
)

// ActionRunStatus represents the status of an action run.
type ActionRunStatus string

const (
	// ActionRunStatusFailed represents the failed status of an action run.
	ActionRunStatusFailed ActionRunStatus = "failed"
	// ActionRunStatusCompleted represents the completed status of an action run.
	ActionRunStatusCompleted ActionRunStatus = "completed"
)

// ActionRun represents a single action run.
type ActionRun struct {
	RunID     string          `json:"run_id"`
	Branch    string          `json:"branch"`
	StartTime string          `json:"start_time"` // Timestamp of the start of the action run
	EndTime   string          `json:"end_time"`   // Timestamp of the end of the action run
	EventType string          `json:"event_type"`
	Status    ActionRunStatus `json:"status"`
	CommitID  string          `json:"commit_id"`
}

// ActionRunList represents a list of action runs.
type ActionRunList struct {
	Pagination Pagination  `json:"pagination"`
	Results    []ActionRun `json:"results"`
}

// RunHook represents a single hook run.
type RunHook struct {
	HookRunID string          `json:"hook_run_id"`
	Action    string          `json:"action"`
	HookID    string          `json:"hook_id"`
	StartTime string          `json:"start_time"` // Timestamp of the start of the hook run
	EndTime   string          `json:"end_time"`   // Timestamp of the end of the hook run
	Status    ActionRunStatus `json:"status"`
}

// RunHookList represents a list of hook runs.
type RunHookList struct {
	Pagination Pagination `json:"pagination"`
	Results    []RunHook  `json:"results"`
}

// ListActionRuns retrieves a single page of action runs.
func (c *Client) ListActionRuns(repositoryID, after, branch, commit string, amount int) (*ActionRunList, error) {
	endpoint := fmt.Sprintf(
		"/repositories/%s/actions/runs?after=%s&branch=%s&commit=%s&amount=%d",
		repositoryID,
		after,
		branch,
		commit,
		amount,
	)
	var listResp ActionRunList
	if err := c.doRequest("GET", endpoint, nil, []int{http.StatusOK}, &listResp); err != nil {
		return nil, err
	}
	return &listResp, nil
}

// ListAllActionRuns handles pagination automatically and returns all action runs.
func (c *Client) ListAllActionRuns(repositoryID, branch, commit string) ([]ActionRun, error) {
	var allActionRuns []ActionRun
	after := ""
	for {
		listResp, err := c.ListActionRuns(repositoryID, after, branch, commit, DefaultListAmountLimit)
		if err != nil {
			return nil, err
		}
		allActionRuns = append(allActionRuns, listResp.Results...)
		if !listResp.Pagination.HasMore {
			break
		}
		after = listResp.Pagination.NextOffset
	}
	return allActionRuns, nil
}

// GetActionRun fetches a single action run by its ID.
func (c *Client) GetActionRun(repositoryID, runID string) (*ActionRun, error) {
	endpoint := fmt.Sprintf("/repositories/%s/actions/runs/%s", repositoryID, runID)
	var actionRun ActionRun
	if err := c.doRequest("GET", endpoint, nil, []int{http.StatusOK}, &actionRun); err != nil {
		return nil, err
	}
	return &actionRun, nil
}

// ListRunHooks retrieves a single page of hooks for a specific action run.
func (c *Client) ListRunHooks(repositoryID, runID, after string, amount int) (*RunHookList, error) {
	endpoint := fmt.Sprintf(
		"/repositories/%s/actions/runs/%s/hooks?after=%s&amount=%d",
		repositoryID,
		runID,
		after,
		amount,
	)
	var listResp RunHookList
	if err := c.doRequest("GET", endpoint, nil, []int{http.StatusOK}, &listResp); err != nil {
		return nil, err
	}
	return &listResp, nil
}

// ListAllRunHooks handles pagination automatically and returns all hooks for a specific action run.
func (c *Client) ListAllRunHooks(repositoryID, runID string) ([]RunHook, error) {
	var allHookRuns []RunHook
	after := ""
	for {
		listResp, err := c.ListRunHooks(repositoryID, runID, after, DefaultListAmountLimit)
		if err != nil {
			return nil, err
		}
		allHookRuns = append(allHookRuns, listResp.Results...)
		if !listResp.Pagination.HasMore {
			break
		}
		after = listResp.Pagination.NextOffset
	}
	return allHookRuns, nil
}

// GetRunHookOutput fetches the output of a hook run by its ID.
func (c *Client) GetRunHookOutput(repositoryID, runID, hookRunID string) (*string, error) {
	endpoint := fmt.Sprintf("/repositories/%s/actions/runs/%s/hooks/%s/output", repositoryID, runID, hookRunID)
	var output string
	if err := c.doRequest("GET", endpoint, nil, []int{http.StatusOK}, &output); err != nil {
		return nil, err
	}
	return &output, nil
}
