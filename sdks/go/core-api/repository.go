package irminCore

import (
	"fmt"
	"net/http"
	"strconv"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

func (c *Client) ListRepositories(workspace string) ([]irminModels.Repository, *irminModels.IrminAPIResponse, error) {
	var repositories []irminModels.Repository
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/repositories", workspace),
	}, &repositories)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch repositories error: %w", err)
	}
	return repositories, apiResp, nil
}

func (c *Client) GetRepository(workspace, slug string) (*irminModels.Repository, *irminModels.IrminAPIResponse, error) {
	var repository irminModels.Repository
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/repositories/%s", workspace, slug),
	}, &repository)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch repository error: %w", err)
	}
	return &repository, apiResp, nil
}

func (c *Client) CreateRepository(workspace, name, description, documentation, default_branch string, isImmutable bool, garbageDefaultRetentionDays, garbadeDefaultBranchRetentionDays int) (*irminModels.Repository, *irminModels.IrminAPIResponse, error) {
	var repository irminModels.Repository
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/repositories", workspace),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"name":                                  name,
			"description":                           description,
			"documentation":                         documentation,
			"default_branch":                        default_branch,
			"is_immutable":                          strconv.FormatBool(isImmutable),
			"garbage_default_retention_days":        strconv.Itoa(garbageDefaultRetentionDays),
			"garbage_default_branch_retention_days": strconv.Itoa(garbadeDefaultBranchRetentionDays),
		},
	}, &repository)
	if err != nil {
		return nil, nil, fmt.Errorf("create repository error: %w", err)
	}

	return &repository, apiResp, nil
}

func (c *Client) UpdateRepository(workspace, slug, name, description, documentation, default_branch string, isImmutable bool, garbageDefaultRetentionDays, garbadeDefaultBranchRetentionDays int) (*irminModels.Repository, *irminModels.IrminAPIResponse, error) {
	var repository irminModels.Repository
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/repositories/%s", workspace, slug),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"name":                                  name,
			"description":                           description,
			"documentation":                         documentation,
			"default_branch":                        default_branch,
			"is_immutable":                          strconv.FormatBool(isImmutable),
			"garbage_default_retention_days":        strconv.Itoa(garbageDefaultRetentionDays),
			"garbage_default_branch_retention_days": strconv.Itoa(garbadeDefaultBranchRetentionDays),
		},
	}, &repository)
	if err != nil {
		return nil, nil, fmt.Errorf("update repository error: %w", err)
	}

	return &repository, apiResp, nil
}

func (c *Client) TransferRepository(workspace, slug, newOwnerID string) (*irminModels.Repository, *irminModels.IrminAPIResponse, error) {
	var repository irminModels.Repository
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/repositories/%s/transfer-ownership", workspace, slug),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"new_owner_id": newOwnerID,
		},
	}, &repository)
	if err != nil {
		return nil, nil, fmt.Errorf("repository ownership transfer error: %w", err)
	}

	return &repository, apiResp, nil
}

func (c *Client) DeleteRepository(workspace, slug string) (*irminModels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/repositories/%s", workspace, slug),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete repository error: %w", err)
	}

	return apiResp, nil
}
